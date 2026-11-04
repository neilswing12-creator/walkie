/**
 * Centralised referral risk scoring. Layered signals, each weak on its own; a shared IP alone can never
 * reject a referral. Returns a score + admin-only reasons + a decision.
 */
import "server-only";
import { db } from "../db";
import { isDisposable, normalizeEmail } from "./signals";
import type { ReferralSettings } from "./settings";

export type Decision = "APPROVE" | "REVIEW" | "SUSPICIOUS" | "REJECT";

export async function scoreReferral(referralId: string, cfg: ReferralSettings) {
  const r = await db.referral.findUniqueOrThrow({ where: { id: referralId }, include: { referee: { include: { devices: true } }, referrer: { include: { devices: true } } } });
  const reasons: { code: string; weight: number; detail?: string }[] = [];
  const add = (code: string, weight: number, detail?: string) => reasons.push({ code, weight, detail });
  let hardReject = false;

  // 1. self-referral (same account, same person by email, or same device)
  const refEmail = r.referee.emailNormalized ?? normalizeEmail(r.referee.email);
  const rerEmail = r.referrer.emailNormalized ?? normalizeEmail(r.referrer.email);
  if (r.refereeId === r.referrerId || refEmail === rerEmail) { add("SELF_REFERRAL", 100); hardReject = true; }
  const refereeDevices = new Set(r.referee.devices.map((d) => d.installHash));
  const sharedWithReferrer = r.referrer.devices.some((d) => refereeDevices.has(d.installHash));
  if (sharedWithReferrer) add("DEVICE_SHARED_WITH_REFERRER", 50, "Referee signed up on a device the referrer uses");

  // 2. duplicate accounts (alias-insensitive email, device history)
  const aliasDupes = await db.user.count({ where: { emailNormalized: refEmail, NOT: { id: r.refereeId } } });
  if (aliasDupes) add("EMAIL_ALIAS_DUPLICATE", 40, `${aliasDupes} other account(s) share this normalized email`);
  if (refereeDevices.size) {
    const others = await db.deviceRegistration.findMany({ where: { installHash: { in: [...refereeDevices] }, NOT: { userId: r.refereeId } }, select: { userId: true } });
    const otherUsers = new Set(others.map((o) => o.userId)); otherUsers.delete(r.referrerId);
    if (otherUsers.size >= 1) add("DEVICE_MULTI_ACCOUNT", otherUsers.size >= 3 ? 45 : 20, `${otherUsers.size} other account(s) on this device`);
    const priorWelcome = await db.vipCredit.count({ where: { source: "REFERRAL_WELCOME", user: { devices: { some: { installHash: { in: [...refereeDevices] } } } }, NOT: { userId: r.refereeId } } });
    if (priorWelcome) add("DEVICE_ALREADY_REDEEMED_WELCOME", 45, "A new-user trial was already granted on this device");
  } else add("NO_INSTALL_ID", 5);
  if (isDisposable(r.referee.email)) add("DISPOSABLE_EMAIL", 25);

  // 3. network (hashed IP, private ranges already excluded)
  const refSignal = await db.riskSignal.findFirst({ where: { userId: r.refereeId, kind: "SIGNUP" }, orderBy: { createdAt: "desc" } });
  if (refSignal) {
    const sameNet = await db.riskSignal.count({ where: { ipHash: refSignal.ipHash, kind: "SIGNUP", createdAt: { gte: new Date(Date.now() - 86400000) } } });
    if (sameNet > 8) add("NETWORK_SIGNUP_BURST", 35, `${sameNet} signups from one network in 24h`);
    else if (sameNet > 3) add("NETWORK_SIGNUP_VOLUME", 15, `${sameNet} signups from one network in 24h`);
    const referrerOnNet = await db.riskSignal.count({ where: { ipHash: refSignal.ipHash, userId: r.referrerId } });
    if (referrerOnNet) add("NETWORK_SHARED_WITH_REFERRER", 10, "Same network as referrer (common for households)");
  }

  // 4. referrer behaviour
  const [recent, rejected, loop] = await Promise.all([
    db.referral.count({ where: { referrerId: r.referrerId, createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    db.referral.count({ where: { referrerId: r.referrerId, status: { in: ["REJECTED", "SUSPICIOUS"] } } }),
    db.referral.count({ where: { referrerId: r.refereeId, refereeId: r.referrerId } }),
  ]);
  if (recent > 15) add("REFERRER_VELOCITY_HIGH", 40, `${recent} referrals in 24h`); else if (recent > 5) add("REFERRER_VELOCITY", 20, `${recent} referrals in 24h`);
  if (rejected >= 3) add("REFERRER_PRIOR_REJECTIONS", 20, `${rejected} prior rejected/suspicious`);
  if (loop) add("REFERRAL_LOOP", 40);
  const monthRewards = await db.vipCredit.count({ where: { userId: r.referrerId, source: "REFERRAL_REFERRER", createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } });
  if (monthRewards >= cfg.maxRewardsPerReferrerPer30Days) add("REFERRER_MONTHLY_LIMIT", 0, "Monthly referral reward limit reached");

  const score = Math.min(100, reasons.reduce((t, x) => t + x.weight, 0) * cfg.sensitivity);
  const decision: Decision = hardReject ? "REJECT" : score >= cfg.suspiciousThreshold ? "SUSPICIOUS" : score >= cfg.reviewThreshold ? "REVIEW" : "APPROVE";
  return { score: Math.round(score), reasons, decision, referrerLimited: monthRewards >= cfg.maxRewardsPerReferrerPer30Days };
}
