import { getCurrentUser } from "@/lib/auth/session";
import { getPetCollection } from "@/lib/queries/pets";
import { userContext } from "@/lib/context";
import { listMissions } from "@/lib/game/missions";
import { db } from "@/lib/db";
import { ExploreClient } from "@/components/explore/ExploreClient";

export const metadata = { title: "Explore" };

export default async function Page() {
  const user = (await getCurrentUser())!;
  const ctx = await userContext(user);
  const now = new Date();
  const [collection, missions, challenges, achs, mine, stats, wallet] = await Promise.all([
    getPetCollection(user), listMissions(user.id, ctx.today, ctx.plus),
    db.challenge.findMany({ where: { enabled: true, endsAt: { gte: now } }, orderBy: { endsAt: "asc" }, include: { participants: { where: { userId: user.id } }, _count: { select: { participants: true } } } }),
    db.achievement.findMany({ where: { enabled: true, archived: false, startsAt: null }, orderBy: { sort: "asc" }, take: 200 }), db.userAchievement.findMany({ where: { userId: user.id } }), db.achievementProgress.findMany({ where: { userId: user.id } }),
    db.wallet.findUnique({ where: { userId: user.id } }),
  ]);
  return (
    <ExploreClient
      collection={collection} missions={missions} coins={wallet?.coins ?? 0}
      challenges={challenges.map((c) => ({ id: c.id, title: c.title, description: c.description, kind: c.kind, target: c.target, endsAt: c.endsAt.toISOString(), rewardCoins: c.rewardCoins, community: c.community, locked: c.premium && !ctx.plus, participants: c._count.participants, joined: !!c.participants[0], progress: c.participants[0]?.progress ?? 0, completed: !!c.participants[0]?.completedAt, claimed: !!c.participants[0]?.claimedAt }))}
      achievements={achs.filter((a) => mine.some((m) => m.achievementId === a.id)).concat(achs.filter((a) => !mine.some((m) => m.achievementId === a.id)).slice(0, 6)).map((a) => ({ id: a.id, title: a.title, description: a.description, icon: a.icon, rewardCoins: a.rewardCoins, progress: Math.min(1, (stats.find((p) => p.achievementId === a.id)?.progress ?? 0) / a.target), unlocked: mine.some((m) => m.achievementId === a.id) }))}
    />
  );
}
