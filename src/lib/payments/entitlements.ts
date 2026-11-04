import { db } from "../db";
import { SUB_ACTIVE_STATUSES } from "../constants";

/**
 * The single source of truth for premium access. Every premium check in the app calls isPlus()/getEntitlement().
 * Access comes from either a provider-verified subscription (webhooks) or an ACTIVE VIP trial credit covering now
 * (referral trials behave exactly like Plus, without billing). Nothing earned is removed when access ends.
 */
export async function getEntitlement(userId: string) {
  const now = new Date();
  const [sub, credit, lastCredit] = await Promise.all([
    db.subscription.findFirst({ where: { userId, status: { in: SUB_ACTIVE_STATUSES }, OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }] }, select: { id: true, currentPeriodEnd: true } }),
    db.vipCredit.findFirst({ where: { userId, status: "ACTIVE", startsAt: { lte: now }, endsAt: { gt: now } }, select: { id: true } }),
    db.vipCredit.findFirst({ where: { userId, status: "ACTIVE", endsAt: { gt: now } }, orderBy: { endsAt: "desc" }, select: { endsAt: true } }),
  ]);
  return {
    plus: !!sub || !!credit,
    source: sub ? ("subscription" as const) : credit ? ("trial" as const) : null,
    trialEndsAt: lastCredit?.endsAt ?? null, // end of the whole stacked trial chain
    subscriptionEndsAt: sub?.currentPeriodEnd ?? null,
  };
}

export async function isPlus(userId: string): Promise<boolean> {
  return (await getEntitlement(userId)).plus;
}
