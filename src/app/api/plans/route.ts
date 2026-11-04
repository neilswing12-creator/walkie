import { handler, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { integrationStatus } from "@/lib/env";
import { SUB_ACTIVE_STATUSES } from "@/lib/constants";
import { getEntitlement } from "@/lib/payments/entitlements";
export const GET = handler(async ({ user }) => {
  const [plans, sub, ent] = await Promise.all([
    db.subscriptionPlan.findMany({ where: { enabled: true }, orderBy: { sort: "asc" } }),
    db.subscription.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }),
    getEntitlement(user.id),
  ]);
  const s = integrationStatus();
  return ok({
    plans: plans.map((p) => ({ key: p.key, name: p.name, description: p.description, priceCents: p.priceCents, currency: p.currency, interval: p.interval, trialDays: p.trialDays, features: p.features, purchasable: s.stripe && !!p.stripePriceId, paymongoAmount: s.paymongo ? p.paymongoAmount : null })),
    subscription: sub && { status: sub.status, provider: sub.provider, planKey: sub.planKey, currentPeriodEnd: sub.currentPeriodEnd, cancelAtPeriodEnd: sub.cancelAtPeriodEnd, active: SUB_ACTIVE_STATUSES.includes(sub.status) && (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date()) },
    entitlement: { plus: ent.plus, source: ent.source, trialEndsAt: ent.trialEndsAt },
    providers: { stripe: s.stripe, revenuecat: s.revenuecat, paymongo: s.paymongo },
  });
}, { allowSuspended: true });
