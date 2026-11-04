import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { securityEvent } from "@/lib/security-log";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/auth/crypto";
import { mapRevenueCatEvent } from "@/lib/payments/revenuecat";
import { notify } from "@/lib/notify";

type RCEvent = { event: { id: string; type: string; event_timestamp_ms?: number; app_user_id: string; product_id: string; expiration_at_ms?: number | null; price_in_purchased_currency?: number; entitlement_ids?: string[] } };

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!env.revenuecat.webhookAuth || !safeEqual(auth, `Bearer ${env.revenuecat.webhookAuth}`)) { await securityEvent("payment.webhook_invalid", null, { provider: "revenuecat" }); return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  const { event } = (await req.json()) as RCEvent;
  if (await db.paymentEvent.findUnique({ where: { eventId: event.id } })) return NextResponse.json({ received: true, duplicate: true });
  const user = await db.user.findUnique({ where: { id: event.app_user_id } });
  const status = mapRevenueCatEvent(event.type);
  const eventAt = new Date(event.event_timestamp_ms ?? Date.now());
  const prev = user ? await db.subscription.findUnique({ where: { providerSubscriptionId: `rc:${user.id}` } }) : null;
  const stale = !!prev?.providerEventAt && prev.providerEventAt > eventAt;
  if (user && status && !stale) {
    const exp = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
    await db.subscription.upsert({
      where: { providerSubscriptionId: `rc:${user.id}` },
      create: { userId: user.id, provider: "REVENUECAT", providerSubscriptionId: `rc:${user.id}`, planKey: event.product_id, status, currentPeriodEnd: exp, cancelAtPeriodEnd: event.type === "CANCELLATION", providerEventAt: eventAt },
      update: { status, currentPeriodEnd: exp, planKey: event.product_id, cancelAtPeriodEnd: event.type === "CANCELLATION", providerEventAt: eventAt },
    });
    if (event.type === "INITIAL_PURCHASE") await notify(user.id, { type: "SUBSCRIPTION", title: "Welcome to Walkie Plus!", body: "Your Plus perks are unlocked.", link: "/app/plus" });
    if (event.type === "BILLING_ISSUE") await notify(user.id, { type: "SUBSCRIPTION", title: "Billing issue", body: "Check your App Store / Google Play payment method to keep Plus.", link: "/app/plus" });
  }
  await db.paymentEvent.create({ data: { provider: "REVENUECAT", eventId: event.id, type: event.type, userId: user?.id ?? null, amountCents: event.price_in_purchased_currency ? Math.round(event.price_in_purchased_currency * 100) : null } });
  return NextResponse.json({ received: true });
}
