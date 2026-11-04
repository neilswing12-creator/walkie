import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canSee } from "@/lib/social";
import { getShopState } from "@/lib/queries/shop";
import { isFlagOn } from "@/lib/settings";
import { ShopClient } from "@/components/shop/ShopClient";
import { dateKey } from "@/lib/dates";
export const metadata = { title: "Visit shop" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const owner = await db.user.findUnique({ where: { id }, include: { profile: true } });
  if (!(await isFlagOn("shop_visits")) || !owner || owner.status !== "ACTIVE" || !(await canSee(user.id, owner.id, owner.profile?.profileVisibility ?? "FRIENDS"))) notFound();
  const state = await getShopState(owner.id);
  if (owner.id !== user.id) {
    const r = await db.shopVisit.createMany({ data: [{ visitorId: user.id, ownerId: owner.id, date: dateKey() }] }).catch(() => ({ count: 0 }));
    if (r.count) { await db.shopLayout.update({ where: { userId: owner.id }, data: { popularity: { increment: 1 } } }); const { evaluateAchievements } = await import("@/lib/achievements/engine"); await Promise.all([evaluateAchievements(user.id), evaluateAchievements(owner.id)]); }
  }
  return <ShopClient initial={{ ...state, inventory: [] }} readOnly ownerName={owner.name.split(" ")[0]} />;
}
