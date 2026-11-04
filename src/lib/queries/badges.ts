import "server-only";
import { db } from "../db";
import { evaluateAchievements } from "../achievements/engine";
import type { BadgeArt } from "../achievements/catalog";

export async function getBadgeCollection(userId: string) {
  await evaluateAchievements(userId); // refresh progress from real records
  const now = new Date();
  const [defs, mine, prog] = await Promise.all([
    db.achievement.findMany({ where: { archived: false }, orderBy: [{ category: "asc" }, { sort: "asc" }] }),
    db.userAchievement.findMany({ where: { userId } }),
    db.achievementProgress.findMany({ where: { userId } }),
  ]);
  const badges = defs
    .filter((a) => mine.some((m) => m.achievementId === a.id) || (a.enabled && (!a.endsAt || a.endsAt > new Date(now.getTime() - 30 * 86400000))))
    .map((a) => {
      const u = mine.find((m) => m.achievementId === a.id);
      const p = prog.find((x) => x.achievementId === a.id)?.progress ?? 0;
      const secret = a.hidden && !u;
      return {
        id: a.id, key: a.key, title: secret ? "Secret badge" : a.title, description: secret ? "Keep exploring to discover this one." : a.description,
        category: a.category, rarity: a.rarity, kind: a.kind, target: a.target, progress: Math.min(p, a.target), art: (a.art as BadgeArt | null) ?? null, imageUrl: a.imageUrl,
        rewardCoins: a.rewardCoins, rewardXp: a.rewardXp, rewardItemKey: a.rewardItemKey, hidden: secret, startsAt: a.startsAt?.toISOString() ?? null, endsAt: a.endsAt?.toISOString() ?? null,
        unlockedAt: u?.unlockedAt.toISOString() ?? null, shareId: u?.shareId ?? null,
      };
    });
  const latest = mine.sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())[0];
  const countable = badges.filter((b) => !b.startsAt || b.unlockedAt); // seasonal not yet earned don't count against completion
  return { badges, earned: mine.length, total: countable.length, latestKey: latest ? defs.find((d) => d.id === latest.achievementId)?.key ?? null : null };
}
export type BadgeCollection = Awaited<ReturnType<typeof getBadgeCollection>>;
