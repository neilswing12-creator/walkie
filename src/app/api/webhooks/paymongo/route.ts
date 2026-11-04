import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyPaymongoSignature, retrievePaymongoCheckout } from "@/lib/payments/paymongo";
import { notify } from "@/lib/notify";
import { securityEvent } from "@/lib/security-log";
import { track } from "@/lib/analytics";

type PMEvent = { data: { id: string; attributes: { type: string; livemode: boolean; data: { id: string; attributes: Record<string, any> } } } };

/** PayMongo webhook. Signed (te/li), replay-windowed, idempotent per event, and amounts are re-verified with PayMongo's API. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > 512 * 1024) return NextResponse.json({ error: "too large" }, { status: 413 });
  let evt: PMEvent;
  try { evt = JSON.parse(raw) as PMEvent; } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const livemode = evt?.data?.attributes?.livemode === true;
  if (!verifyPaymongoSignature(raw, req.headers.get("paymongo-signature"), livemode)) { await securityEvent("payment.webhook_invalid", null, { provider: "paymongo" }); return NextResponse.json({ error: "invalid signature" }, { status: 400 }); }
  if (env.isProd && !livemode && !process.env.PAYMONGO_ALLOW_TEST_MODE) return NextResponse.json({ received: true, ignored: "test-mode event" }); // test payments never grant access in production
  const eventId = evt.data.id, type = evt.data.attributes.type, obj = evt.data.attributes.data;
  if (await db.paymentEvent.findUnique({ where: { eventId } })) return NextResponse.json({ received: true, duplicate: true });

  let userId: string | null = null, amount: number | null = null;
  if (type === "checkout_session.payment.paid") {
    const order = await db.paymentOrder.findFirst({ where: { providerRef: obj.id, id: String(obj.attributes?.reference_number ?? "") } });
    // defense in depth: re-read the session from PayMongo and require a paid payment matching the order exactly
    const live = order ? await retrievePaymongoCheckout(obj.id) : null;
    if (order && !live) return NextResponse.json({ error: "verification unavailable, retry" }, { status: 503 }); // PayMongo retries; nothing recorded
    const paid = live?.attributes.payments?.find((p) => p.attributes.status === "paid" && p.attributes.amount === order!.amount && p.attributes.currency?.toUpperCase() === order!.currency);
    if (order && paid && live?.attributes.reference_number === order.id) {
      userId = order.userId; amount = order.amount;
      const granted = await db.$transaction(async (tx) => {
        const moved = await tx.paymentOrder.updateMany({ where: { id: order.id, status: "PENDING" }, data: { status: "PAID", paidAt: new Date(), paymentId: paid.id } });
        if (!moved.count) return false; // already granted (replay / concurrent delivery)
        const now = new Date();
        const latest = await tx.subscription.findFirst({ where: { userId: order.userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }, currentPeriodEnd: { gt: now } }, orderBy: { currentPeriodEnd: "desc" } });
        const start = latest?.currentPeriodEnd && latest.currentPeriodEnd > now ? latest.currentPeriodEnd : now; // passes stack, never overwrite
        await tx.subscription.create({ data: { userId: order.userId, provider: "PAYMONGO", providerSubscriptionId: `pm:${order.id}`, providerCustomerId: null, planKey: order.planKey, status: "ACTIVE", currentPeriodEnd: new Date(start.getTime() + order.days * 86400000), providerEventAt: now } });
        return true;
      });
      if (granted) { await notify(order.userId, { type: "SUBSCRIPTION", title: "Welcome to Walkie Plus!", body: `Your ${order.days}-day Plus pass is active. Salamat!`, link: "/app/plus" }); await track("subscription_started", order.userId, { provider: "paymongo", plan: order.planKey }); }
    } else {
      await securityEvent("payment.verification_failed", order?.userId ?? null, { provider: "paymongo", hasOrder: !!order });
    }
  } else if (type === "payment.refunded" || type === "payment.refund.updated") {
    const order = await db.paymentOrder.findUnique({ where: { paymentId: obj.id } });
    if (order) {
      userId = order.userId; amount = -Number(obj.attributes?.amount_refunded ?? obj.attributes?.amount ?? 0);
      await db.paymentOrder.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
      await db.subscription.updateMany({ where: { providerSubscriptionId: `pm:${order.id}` }, data: { status: "REFUNDED", providerEventAt: new Date() } });
      await notify(order.userId, { type: "SUBSCRIPTION", title: "Refund processed", body: "Your Plus pass was refunded and has ended.", link: "/app/plus" });
    }
  }
  await db.paymentEvent.create({ data: { provider: "PAYMONGO", eventId, type, userId, amountCents: amount, summary: { object: obj?.id ?? null, livemode } } }).catch(() => {});
  return NextResponse.json({ received: true });
}
