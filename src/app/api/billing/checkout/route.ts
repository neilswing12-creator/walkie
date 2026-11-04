import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { createCheckoutSession } from "@/lib/payments/stripe";
import { isPlus } from "@/lib/payments/entitlements";
import { track } from "@/lib/analytics";

export const POST = handler(async ({ req, user }) => {
  const { planKey } = await body(req, z.object({ planKey: z.string() }));
  const plan = await db.subscriptionPlan.findUnique({ where: { key: planKey } });
  if (!plan || !plan.enabled || !plan.stripePriceId) throw new ApiError(503, "Web checkout isn't available for this plan yet", "payments_unconfigured");
  if (await isPlus(user.id)) throw new ApiError(409, "You're already a Plus member");
  const prior = await db.subscription.findFirst({ where: { userId: user.id, provider: "STRIPE" }, orderBy: { createdAt: "desc" } });
  const session = await createCheckoutSession({ userId: user.id, email: user.email, priceId: plan.stripePriceId, trialDays: prior ? 0 : plan.trialDays, customerId: prior?.providerCustomerId });
  await track("checkout_started", user.id, { plan: plan.key });
  return ok({ url: session.url });
}, { rate: { limit: 10, windowMs: 3600000 } });
