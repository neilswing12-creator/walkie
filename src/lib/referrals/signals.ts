/**
 * Privacy-conscious abuse signals.
 * - IPs are never stored raw: HMAC-SHA256 with a server secret, truncated, kept for `ipRetentionDays`.
 * - Private / local addresses are ignored (households, offices and dev machines share them).
 * - Install IDs are issued and HMAC-signed by the server; unsigned/forged values are discarded.
 * No browser fingerprinting is performed.
 */
import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { db } from "../db";
import { safeEqual } from "../auth/crypto";

// Never a hardcoded key in production: without SIGNAL_SECRET/CRON_SECRET a random per-process key is used
// (signals still work but don't survive restarts — set SIGNAL_SECRET for stable hashing).
const EPHEMERAL = randomBytes(32).toString("hex");
const SECRET = () => process.env.SIGNAL_SECRET || process.env.CRON_SECRET || (process.env.NODE_ENV === "production" ? EPHEMERAL : "dev-signal-secret-change-me");
const hmac = (v: string) => createHmac("sha256", SECRET()).update(v).digest("base64url");

export function normalizeEmail(email: string) {
  const [local, domainRaw] = email.trim().toLowerCase().split("@");
  if (!domainRaw) return email.trim().toLowerCase();
  const domain = domainRaw === "googlemail.com" ? "gmail.com" : domainRaw;
  let l = local.split("+")[0];
  if (domain === "gmail.com") l = l.replace(/\./g, "");
  return `${l}@${domain}`;
}

const DISPOSABLE = new Set(["mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com", "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com"]);
export const isDisposable = (email: string) => DISPOSABLE.has(email.split("@")[1]?.toLowerCase() ?? "");

function isPrivateIp(ip: string) {
  return !ip || ip === "local" || ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80");
}

export async function currentIpHash(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
  return isPrivateIp(ip) ? null : hmac(`ip:${ip}`).slice(0, 22);
}

export async function recordSignal(kind: "SIGNUP" | "REFERRAL" | "VERIFY" | "LOGIN", userId: string | null) {
  const ipHash = await currentIpHash();
  if (ipHash) await db.riskSignal.create({ data: { kind, userId, ipHash } });
  return ipHash;
}

export async function purgeExpiredSignals(retentionDays: number) {
  return db.riskSignal.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - retentionDays * 86400000) } } });
}

// ── install tokens: "<id>.<sig>" — the id is random server-side, the signature proves we issued it ──
export function issueInstallToken() {
  const id = randomBytes(16).toString("base64url");
  return `${id}.${hmac(`install:${id}`).slice(0, 32)}`;
}
export function verifyInstallToken(token: string | null | undefined): string | null {
  if (!token || token.length > 120) return null;
  const [id, sig] = token.split(".");
  if (!id || !sig || !safeEqual(sig, hmac(`install:${id}`).slice(0, 32))) return null;
  return hmac(`installhash:${id}`).slice(0, 24); // stored form; raw id never persisted
}
export async function currentInstallHash() {
  const h = await headers();
  return verifyInstallToken(h.get("x-walkie-install"));
}
export async function registerDevice(userId: string, platform = "web") {
  const installHash = await currentInstallHash();
  if (!installHash) return null;
  await db.deviceRegistration.upsert({ where: { installHash_userId: { installHash, userId } }, create: { installHash, userId, platform }, update: { lastSeenAt: new Date() } });
  return installHash;
}
