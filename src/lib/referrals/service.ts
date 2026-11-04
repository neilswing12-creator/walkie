/**
 * Referral lifecycle. Everything is decided server-side; the client can only present a code (via the invite link).
 * Statuses: PENDING → REGISTERED / VERIFICATION_REQUIRED → (risk check) → REWARD_GRANTED | UNDER_REVIEW | SUSPICIOUS | REJECTED.
 * QUALIFIED = referee approved & trial granted, referrer reward waiting on the configured delay.
 */
import "server-only";
import { randomInt } from "node:crypto";
import { db, type Tx } from "../db";
import { getSetting } from "../settings";
import { notify } from "../notify";
import { audit } from "../audit";
import { scoreReferral } from "./risk";
import { normalizeEmail, recordSignal, registerDevice, purgeExpiredSignals } from "./signals";
import type { ReferralSettings } from "./settings";
import { ApiError } from "../api-error";

export const referralSettings = () => getSetting("referrals") as Promise<ReferralSettings>;
type HistoryEntry = { at: string; by: string; status: string; note?: string };
const hist = (prev: unknown, e: Omit<HistoryEntry, "at">): HistoryEntry[] => [...((prev as HistoryEntry[]) ?? []), { at: new Date().toISOString(), ...e }].slice(-30);

export async function regenerateCode(userId: string) {
  await db.user.update({ where: { id: userId }, data: { referralCode: null } }); // old links stop working (revocation)
  return getOrCreateCode(userId);
}

export async function getOrCreateCode(userId: string) {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (u.referralCode) return u.referralCode;
  const base = (u.name.normalize("NFKD").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 6) || "WALKIE").padEnd(3, "X");
  for (let i = 0; i < 20; i++) {
    const code = `${base}${randomInt(100, 1000)}`;
    try { const r = await db.user.updateMany({ where: { id: userId, referralCode: null }, data: { referralCode: code } }); if (r.count) return code; } catch { /* code taken — retry */ }
    const again = await db.user.findUnique({ where: { id: userId } }); if (again?.referralCode) return again.referralCode;
  }
  throw new ApiError(500, "Couldn't create a referral code");
}

/** Called for every signup (email or OAuth). Records privacy-safe signals; links a referral if a valid code was presented. */
export async function onSignup(userId: string, code: string | null | undefined, platform = "web") {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  await db.user.update({ where: { id: userId }, data: { emailNormalized: normalizeEmail(user.email) } });
  await Promise.all([recordSignal("SIGNUP", userId), registerDevice(userId, platform)]);
  const cfg = await referralSettings();
  purgeExpiredSignals(cfg.ipRetentionDays).catch(() => {});
  if (!code || !cfg.enabled) return null;
  const referrer = await db.user.findUnique({ where: { referralCode: code.toUpperCase() } });
  if (!referrer || referrer.status !== "ACTIVE" || referrer.id === userId) return null;
  try {
    const r = await db.referral.create({ data: { referrerId: referrer.id, refereeId: userId, code: referrer.referralCode!, status: "PENDING", history: hist(null, { by: "system", status: "PENDING", note: "Signed up with invite link" }) } });
    await db.user.update({ where: { id: userId }, data: { referredById: referrer.id } });
    await recordSignal("REFERRAL", userId);
    await notify(referrer.id, { type: "FRIEND", title: "Your friend joined Walkie!", body: "Referral reward pending verification.", link: "/app/invite" });
    return r;
  } catch { return null; } // unique(refereeId): can only be referred once
}

async function grantCredit(tx: Tx, userId: string, days: number, source: string, referralId: string | null, key: string, cfg: ReferralSettings) {
  if (await tx.vipCredit.findUnique({ where: { idempotencyKey: key } })) return null; // replay-safe
  const now = new Date();
  const last = await tx.vipCredit.findFirst({ where: { userId, status: "ACTIVE", endsAt: { gt: now } }, orderBy: { endsAt: "desc" } });
  const start = cfg.stacking && last ? last.endsAt : now; // stack end-to-end, never overwrite an existing expiry
  const maxEnd = new Date(now.getTime() + cfg.maxStackedDays * 86400000);
  let end = new Date(start.getTime() + days * 86400000);
  if (!cfg.stacking && last && last.endsAt > end) return null;
  if (end > maxEnd) end = maxEnd;
  if (end <= start) return null;
  try {
    return await tx.vipCredit.create({ data: { userId, source, referralId, days, startsAt: start, endsAt: end, idempotencyKey: key } });
  } catch { return null; } // unique key lost a race → already granted
}

async function requirementsMet(refereeId: string, cfg: ReferralSettings) {
  const u = await db.user.findUniqueOrThrow({ where: { id: refereeId }, include: { profile: true } });
  if (u.status !== "ACTIVE") return { ok: false as const, status: "UNDER_REVIEW", note: "Account not active" };
  if (cfg.requireEmailVerified && !u.emailVerified) return { ok: false as const, status: "VERIFICATION_REQUIRED", note: "Waiting for email verification" };
  if (cfg.requireOnboarding && !u.profile?.onboardedAt) return { ok: false as const, status: "REGISTERED", note: "Waiting for onboarding" };
  if (cfg.requireFirstActivity && !(await db.activity.count({ where: { userId: refereeId, status: "COMPLETED" } }))) return { ok: false as const, status: "REGISTERED", note: "Waiting for first activity" };
  if (cfg.minAccountAgeHours > 0 && Date.now() - u.createdAt.getTime() < cfg.minAccountAgeHours * 3600000) return { ok: false as const, status: "REGISTERED", note: "Waiting for account age" };
  return { ok: true as const };
}

/** Idempotent; safe to call from any hook (verify, onboarding, activity, cron). */
export async function processReferral(refereeId: string) {
  const r = await db.referral.findUnique({ where: { refereeId } });
  if (!r) return null;
  const cfg = await referralSettings();
  if (["PENDING", "REGISTERED", "VERIFICATION_REQUIRED"].includes(r.status)) {
    const req = await requirementsMet(refereeId, cfg);
    if (!req.ok) {
      if (req.status !== r.status) await db.referral.updateMany({ where: { id: r.id, status: r.status }, data: { status: req.status, history: hist(r.history, { by: "system", status: req.status, note: req.note }) } }); // conditional: never overwrite a newer state
      return req.status;
    }
    const risk = await scoreReferral(r.id, cfg);
    const status = risk.decision === "REJECT" ? "REJECTED" : risk.decision === "SUSPICIOUS" ? "SUSPICIOUS" : risk.decision === "REVIEW" ? "UNDER_REVIEW" : "QUALIFIED";
    const moved = await db.referral.updateMany({ where: { id: r.id, status: r.status }, data: { status, riskScore: risk.score, riskReasons: risk.reasons, qualifiedAt: status === "QUALIFIED" ? new Date() : null, history: hist(r.history, { by: "system", status, note: `risk ${risk.score}` }) } });
    if (!moved.count) return (await db.referral.findUnique({ where: { id: r.id } }))?.status; // concurrent processor won
    if (status === "QUALIFIED") await grantRewards(r.id, cfg, risk.referrerLimited);
    return status;
  }
  if (r.status === "QUALIFIED") { await grantRewards(r.id, cfg, false); return (await db.referral.findUnique({ where: { id: r.id } }))?.status; }
  return r.status;
}

async function grantRewards(referralId: string, cfg: ReferralSettings, referrerLimited: boolean) {
  const r = await db.referral.findUniqueOrThrow({ where: { id: referralId } });
  const delayDone = !r.qualifiedAt || Date.now() - r.qualifiedAt.getTime() >= cfg.referrerRewardDelayHours * 3600000;
  const run = () => db.$transaction(async (tx) => {
    const welcome = await grantCredit(tx, r.refereeId, cfg.refereeTrialDays, "REFERRAL_WELCOME", r.id, `ref-welcome:${r.refereeId}`, cfg); // once per person, ever
    let referrer = null;
    if (delayDone && !referrerLimited) referrer = await grantCredit(tx, r.referrerId, cfg.referrerRewardDays, "REFERRAL_REFERRER", r.id, `ref-referrer:${r.id}`, cfg);
    const done = delayDone; // referrer reward granted or permanently skipped (limit)
    if (done) await tx.referral.updateMany({ where: { id: r.id, status: "QUALIFIED" }, data: { status: "REWARD_GRANTED", rewardedAt: new Date(), history: hist(r.history, { by: "system", status: "REWARD_GRANTED", note: referrerLimited ? "Referrer monthly limit reached — new user trial only" : undefined }) } });
    return { welcome, referrer };
  });
  let res: Awaited<ReturnType<typeof run>> = { welcome: null, referrer: null };
  for (let attempt = 0; ; attempt++) { // write contention (esp. SQLite) → retry; idempotency keys make retries safe
    try { res = await run(); break; } catch (e) { if (attempt >= 3) throw e; await new Promise((r) => setTimeout(r, 60 * (attempt + 1) + Math.random() * 80)); }
  }
  if (res.welcome) await notify(r.refereeId, { type: "SUBSCRIPTION", title: `${cfg.refereeTrialDays} days of Walkie Plus unlocked!`, body: "A thank-you for joining through a friend. Enjoy everything Plus — no payment needed.", link: "/app/plus" });
  if (res.referrer) await notify(r.referrerId, { type: "SUBSCRIPTION", title: `Your ${cfg.referrerRewardDays}-day VIP reward has been added!`, body: "Your friend is all set. Thanks for growing the pack!", link: "/app/invite" });
  return res;
}

/** Releases delayed referrer rewards (call from cron or the referrer's dashboard). */
export async function processQualified(limit = 200) {
  const rows = await db.referral.findMany({ where: { status: "QUALIFIED" }, take: limit });
  for (const r of rows) await processReferral(r.refereeId);
  return rows.length;
}

export async function adminDecide(referralId: string, adminId: string, action: "approve" | "reject", note?: string) {
  const r = await db.referral.findUnique({ where: { id: referralId } });
  if (!r) throw new ApiError(404, "Referral not found");
  if (r.status === "REWARD_GRANTED" && action === "approve") throw new ApiError(409, "Already rewarded");
  const cfg = await referralSettings();
  if (action === "reject") {
    await db.referral.update({ where: { id: r.id }, data: { status: "REJECTED", history: hist(r.history, { by: `admin:${adminId}`, status: "REJECTED", note }) } });
    if (r.status === "REWARD_GRANTED") await db.vipCredit.updateMany({ where: { referralId: r.id }, data: { status: "REVOKED" } });
  } else {
    await db.referral.update({ where: { id: r.id }, data: { status: "QUALIFIED", qualifiedAt: new Date(Date.now() - cfg.referrerRewardDelayHours * 3600000), history: hist(r.history, { by: `admin:${adminId}`, status: "QUALIFIED", note }) } });
    await grantRewards(r.id, cfg, false);
  }
  await audit(adminId, `referral.${action}`, "referral", r.id, { note, previous: r.status });
}

export async function appeal(userId: string, referralId: string, text: string) {
  const r = await db.referral.findUnique({ where: { id: referralId } });
  if (!r || (r.referrerId !== userId && r.refereeId !== userId)) throw new ApiError(404, "Referral not found");
  if (!["REJECTED", "SUSPICIOUS", "UNDER_REVIEW"].includes(r.status)) throw new ApiError(400, "Only held or rejected referrals can be appealed");
  if (r.appealAt && Date.now() - r.appealAt.getTime() < 7 * 86400000) throw new ApiError(429, "You've already appealed — we'll get back to you");
  await db.referral.update({ where: { id: r.id }, data: { appealText: text, appealAt: new Date(), status: "UNDER_REVIEW", history: hist(r.history, { by: `user:${userId}`, status: "UNDER_REVIEW", note: "Appeal submitted" }) } });
}

/** User-facing status copy — never reveals fraud signals. */
export function statusCopy(status: string, role: "referrer" | "referee") {
  switch (status) {
    case "PENDING": case "REGISTERED": return role === "referrer" ? "Your friend joined Walkie! Waiting for them to finish setting up." : "Finish setting up to unlock your trial.";
    case "VERIFICATION_REQUIRED": return role === "referrer" ? "Referral reward pending verification." : "Verify your email to unlock your trial.";
    case "QUALIFIED": return "Verified! Reward on its way.";
    case "REWARD_GRANTED": return role === "referrer" ? "Your VIP reward has been added!" : "Your Walkie Plus trial is active!";
    case "UNDER_REVIEW": case "SUSPICIOUS": return "We're taking a closer look — this usually takes a day or two.";
    case "REJECTED": return "This referral didn't qualify. You can appeal if you think that's a mistake.";
    default: return status;
  }
}
