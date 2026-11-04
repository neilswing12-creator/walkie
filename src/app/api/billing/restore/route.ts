/** "Restore purchases": re-reads entitlement state from RevenueCat for this user (app_user_id = our user id). */
import { handler, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { isPlus } from "@/lib/payments/entitlements";

export const POST = handler(async ({ user }) => {
  if (!env.revenuecat.apiKey) throw new ApiError(503, "In-app purchases aren't configured yet", "payments_unconfigured");
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`, { headers: { authorization: `Bearer ${env.revenuecat.apiKey}` } });
  if (!res.ok) throw new ApiError(502, "Couldn't reach the purchase provider");
  const j = (await res.json()) as { subscriber?: { entitlements?: Record<string, { expires_date: string | null; product_identifier: string }> } };
  const ent = j.subscriber?.entitlements?.plus;
  if (ent) {
    const exp = ent.expires_date ? new Date(ent.expires_date) : null;
    const status = !exp || exp > new Date() ? "ACTIVE" : "EXPIRED";
    await db.subscription.upsert({
      where: { providerSubscriptionId: `rc:${user.id}` },
      create: { userId: user.id, provider: "REVENUECAT", providerSubscriptionId: `rc:${user.id}`, planKey: ent.product_identifier, status, currentPeriodEnd: exp },
      update: { status, currentPeriodEnd: exp, planKey: ent.product_identifier },
    });
  }
  return ok({ plus: await isPlus(user.id) });
}, { rate: { limit: 5, windowMs: 600000 } });
