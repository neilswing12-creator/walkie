import { handler, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { canSee } from "@/lib/social";
import { getShopState } from "@/lib/queries/shop";
import { dateKey } from "@/lib/dates";
import { isFlagOn } from "@/lib/settings";

/** Read-only view of another user's pet shop. Respects their profile visibility. */
export const GET = handler<{ id: string }>(async ({ params, user }) => {
  if (!(await isFlagOn("shop_visits"))) throw new ApiError(404, "Shop visits are not available");
  const owner = await db.user.findUnique({ where: { id: params.id }, include: { profile: true } });
  if (!owner || owner.status !== "ACTIVE" || !(await canSee(user.id, owner.id, owner.profile?.profileVisibility ?? "FRIENDS"))) throw new ApiError(404, "This shop is private");
  const state = await getShopState(owner.id);
  if (owner.id !== user.id) {
    const date = dateKey();
    const created = await db.shopVisit.createMany({ data: [{ visitorId: user.id, ownerId: owner.id, date }] }).catch(() => ({ count: 0 }));
    if (created.count) { await db.shopLayout.update({ where: { userId: owner.id }, data: { popularity: { increment: 1 } } }); const { evaluateAchievements } = await import("@/lib/achievements/engine"); await Promise.all([evaluateAchievements(user.id), evaluateAchievements(owner.id)]); }
  }
  return ok({ owner: { id: owner.id, name: owner.name }, layout: state.layout, placements: state.placements, pets: state.pets });
});
