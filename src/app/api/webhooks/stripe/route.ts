import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { securityEvent } from "@/lib/security-log";
import { verifyStripeSignature, mapStripeStatus } from "@/lib/payments/stripe";
import { notify } from "@/lib/notify";
import { track } from "@/lib/analytics";

type StripeSub = { id: string; customer: string; status: string; current_period_end?: number; cancel_at_period_end: boolean; metadata?: { userId?: string }; items?: { data: { price: { id: string }; current_period_end?: number }[] } };

export async function POST(req: NextRequest) {
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"))) { await securityEvent("payment.webhook_invalid", null, { provider: "stripe" }); return NextResponse.json({ error: "invalid signature" }, { status: 400 }); }
  const event = JSON.parse(payload) as { id: string; type: string; created?: number; data: { object: any } };
  const eventAt = new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000);
  // idempotency: each Stripe event processed once
  const seen = await db.paymentEvent.findUnique({ where: { eventId: event.id } });
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  let userId: string | null = null;
  let amount: number | null = null;
  const o = event.data.object;
  if (event.type.startsWith("customer.subscription.")) {
    const sub = o as StripeSub;
    const existing = await db.subscription.findUnique({ where: { providerSubscriptionId: sub.id } });
    userId = sub.metadata?.userId ?? existing?.userId ?? null;
    const stale = !!existing?.providerEventAt && existing.providerEventAt > eventAt; // out-of-order delivery must not resurrect a canceled sub
    if (userId && !stale && (await db.user.findUnique({ where: { id: userId } }))) {
      const priceId = sub.items?.data[0]?.price.id;
      const plan = priceId ? await db.subscriptionPlan.findFirst({ where: { stripePriceId: priceId } }) : null;
      const periodEnd = sub.current_period_end ?? sub.items?.data[0]?.current_period_end;
      const status = event.type === "customer.subscription.deleted" ? "CANCELED" : mapStripeStatus(sub.status);
      await db.subscription.upsert({
        where: { providerSubscriptionId: sub.id },
        create: { userId, provider: "STRIPE", providerEventAt: eventAt, providerCustomerId: sub.customer, providerSubscriptionId: sub.id, planKey: plan?.key ?? "plus", status, currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null, cancelAtPeriodEnd: sub.cancel_at_period_end },
        update: { status, providerEventAt: eventAt, providerCustomerId: sub.customer, currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null, cancelAtPeriodEnd: sub.cancel_at_period_end, ...(plan ? { planKey: plan.key } : {}) },
      });
      if (event.type === "customer.subscription.created") { await notify(userId, { type: "SUBSCRIPTION", title: "Welcome to Walkie Plus!", body: "Your Plus perks are unlocked.", link: "/app/plus" }); await track("subscription_started", userId, { provider: "stripe" }); }
      if (event.type === "customer.subscription.deleted") await track("subscription_canceled", userId, { provider: "stripe" });
    }
  } else if (event.type === "invoice.payment_failed" || event.type === "invoice.paid") {
    const sub = o.subscription ? await db.subscription.findUnique({ where: { providerSubscriptionId: String(o.subscription) } }) : null;
    userId = sub?.userId ?? null;
    amount = event.type === "invoice.paid" ? o.amount_paid : null;
    if (sub && event.type === "invoice.payment_failed") {
      await db.subscription.update({ where: { id: sub.id }, data: { status: "PAST_DUE" } });
      await notify(sub.userId, { type: "SUBSCRIPTION", title: "Payment didn't go through", body: "Update your payment method to keep Walkie Plus.", link: "/app/plus" });
    }
  } else if (event.type === "charge.refunded") {
    amount = -Number(o.amount_refunded ?? 0);
    // a full refund ends access immediately, even if the subscription itself wasn't canceled
    if (o.refunded === true && o.customer) {
      const subs = await db.subscription.findMany({ where: { provider: "STRIPE", providerCustomerId: String(o.customer), status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } } });
      for (const s of subs) await db.subscription.update({ where: { id: s.id }, data: { status: "REFUNDED", providerEventAt: eventAt } });
      userId = subs[0]?.userId ?? null;
      if (userId) await notify(userId, { type: "SUBSCRIPTION", title: "Refund processed", body: "Your Walkie Plus payment was refunded and Plus has ended.", link: "/app/plus" });
    }
  }
  await db.paymentEvent.create({ data: { provider: "STRIPE", eventId: event.id, type: event.type, userId, amountCents: amount, summary: { object: o?.object, status: o?.status ?? null } } });
  return NextResponse.json({ received: true });
}
