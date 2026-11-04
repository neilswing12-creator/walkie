import { z } from "zod";
import { handler, ok, body } from "@/lib/api";
import { db } from "@/lib/db";
/** Unlocks not yet celebrated in the UI (so an unlock earned via sync/other device still gets its moment). */
export const GET = handler(async ({ user }) => {
  const rows = await db.userAchievement.findMany({ where: { userId: user.id, seenAt: null }, include: { achievement: true }, orderBy: { unlockedAt: "asc" }, take: 12 });
  return ok(rows.map((r) => ({ id: r.achievementId, key: r.achievement.key, title: r.achievement.title, description: r.achievement.description, rarity: r.achievement.rarity, art: r.achievement.art, imageUrl: r.achievement.imageUrl, coins: r.achievement.rewardCoins, xp: r.achievement.rewardXp, item: r.achievement.rewardItemKey })));
});
export const POST = handler(async ({ req, user }) => {
  const { ids } = await body(req, z.object({ ids: z.array(z.string()).max(50) }));
  await db.userAchievement.updateMany({ where: { userId: user.id, achievementId: { in: ids }, seenAt: null }, data: { seenAt: new Date() } });
  return ok({});
});
