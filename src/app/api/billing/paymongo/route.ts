import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { env, integrationStatus } from "@/lib/env";
import { createPaymongoCheckout } from "@/lib/payments/paymongo";
import { track } from "@/lib/analytics";

/** Starts a PayMongo checkout for a Plus pass. Price, currency and duration come only from the database. */
export const POST = handler(async ({ req, user }) => {
  if (!integrationStatus().paymongo) throw new ApiError(503, "GCash / Maya checkout isn't available yet", "payments_unconfigured");
  const { planKey } = await body(req, z.object({ planKey: z.string().max(40) }));
  const plan = await db.subscriptionPlan.findUnique({ where: { key: planKey } });
  if (!plan || !plan.enabled || !plan.paymongoAmount) throw new ApiError(404, "That plan isn't sold through PayMongo");
  const pending = await db.paymentOrder.count({ where: { userId: user.id, status: "PENDING", createdAt: { gte: new Date(Date.now() - 3600000) } } });
  if (pending >= 5) throw new ApiError(429, "You have several unfinished checkouts — finish or wait a bit", "rate_limited");
  const days = plan.interval === "year" ? 365 : 30;
  const order = await db.paymentOrder.create({ data: { userId: user.id, provider: "PAYMONGO", planKey: plan.key, amount: plan.paymongoAmount, currency: "PHP", days } });
  try {
    const s = await createPaymongoCheckout({ orderId: order.id, userId: user.id, email: user.email, name: user.name, planName: plan.name, amount: order.amount, days });
    await db.paymentOrder.update({ where: { id: order.id }, data: { providerRef: s.id } });
    await track("checkout_started", user.id, { plan: plan.key, provider: "paymongo" });
    return ok({ url: s.url });
  } catch (e) {
    await db.paymentOrder.update({ where: { id: order.id }, data: { status: "FAILED" } });
    console.error("[paymongo] checkout", e instanceof Error ? e.message : "error");
    throw new ApiError(502, "Couldn't start checkout — please try again");
  }
  void env;
}, { rate: { limit: 10, windowMs: 3600000, key: "paymongo-checkout" } });
