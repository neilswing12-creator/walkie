import { handler, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { createPortalSession } from "@/lib/payments/stripe";
export const POST = handler(async ({ user }) => {
  const sub = await db.subscription.findFirst({ where: { userId: user.id, provider: "STRIPE", providerCustomerId: { not: null } }, orderBy: { updatedAt: "desc" } });
  if (!sub?.providerCustomerId) throw new ApiError(404, "No web subscription found. Mobile subscriptions are managed in the App Store or Google Play.");
  return ok(await createPortalSession(sub.providerCustomerId));
}, { allowSuspended: true });
