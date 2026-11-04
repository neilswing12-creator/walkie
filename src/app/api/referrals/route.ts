import { handler, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getOrCreateCode, processReferral, referralSettings, statusCopy } from "@/lib/referrals/service";
import { getEntitlement } from "@/lib/payments/entitlements";

export const GET = handler(async ({ user }) => {
  const cfg = await referralSettings();
  const code = await getOrCreateCode(user.id);
  // release any delayed referrer rewards that are now due
  for (const q of await db.referral.findMany({ where: { referrerId: user.id, status: "QUALIFIED" }, take: 20, select: { refereeId: true } })) await processReferral(q.refereeId).catch(() => {});
  await processReferral(user.id).catch(() => {}); // idempotent; advances the user's own referral if a hook was missed
  const [made, received, credits, ent] = await Promise.all([
    db.referral.findMany({ where: { referrerId: user.id }, orderBy: { createdAt: "desc" }, take: 100, include: { referee: { select: { name: true } } } }),
    db.referral.findUnique({ where: { refereeId: user.id } }),
    db.vipCredit.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    getEntitlement(user.id),
  ]);
  const earnedDays = credits.filter((c) => c.source === "REFERRAL_REFERRER" && c.status === "ACTIVE").reduce((t, c) => t + c.days, 0);
  return ok({
    enabled: cfg.enabled, code, link: `${env.appUrl}/invite/${code}`, referrerDays: cfg.referrerRewardDays, refereeDays: cfg.refereeTrialDays,
    stats: { successful: made.filter((m) => m.status === "REWARD_GRANTED").length, pending: made.filter((m) => !["REWARD_GRANTED", "REJECTED"].includes(m.status)).length, earnedDays },
    entitlement: { plus: ent.plus, source: ent.source, trialEndsAt: ent.trialEndsAt },
    referrals: made.map((m) => ({ id: m.id, friend: m.referee.name.split(" ")[0].slice(0, 1) + "•••", status: m.status, message: statusCopy(m.status, "referrer"), createdAt: m.createdAt, canAppeal: ["REJECTED", "SUSPICIOUS", "UNDER_REVIEW"].includes(m.status) && !m.appealAt })),
    received: received && { id: received.id, status: received.status, message: statusCopy(received.status, "referee"), canAppeal: ["REJECTED", "SUSPICIOUS"].includes(received.status) && !received.appealAt },
    credits: credits.map((c) => ({ id: c.id, source: c.source, days: c.days, startsAt: c.startsAt, endsAt: c.endsAt, status: c.status })),
  });
}, { allowSuspended: true });
