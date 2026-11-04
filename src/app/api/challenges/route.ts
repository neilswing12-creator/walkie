import { handler, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { isPlus } from "@/lib/payments/entitlements";
export const GET = handler(async ({ user }) => {
  const now = new Date();
  const [list, plus] = await Promise.all([
    db.challenge.findMany({ where: { enabled: true, endsAt: { gte: now } }, orderBy: { endsAt: "asc" }, include: { participants: { where: { userId: user.id } }, _count: { select: { participants: true } } } }),
    isPlus(user.id),
  ]);
  const teamIds = list.filter((c) => c.teamMode).map((c) => c.id);
  const totals = teamIds.length ? await db.challengeParticipant.groupBy({ by: ["challengeId", "team"], where: { challengeId: { in: teamIds } }, _sum: { progress: true }, _count: true }) : [];
  return ok(list.map((c) => ({
    teams: c.teamMode ? Object.fromEntries(["PUPS", "WOLVES"].map((t) => { const r = totals.find((x) => x.challengeId === c.id && x.team === t); return [t, { members: r?._count ?? 0, progress: r?._sum.progress ?? 0 }]; })) : null,
    id: c.id, title: c.title, description: c.description, kind: c.kind, target: c.target, period: c.period, community: c.community,
    startsAt: c.startsAt, endsAt: c.endsAt, rewardCoins: c.rewardCoins, rewardXp: c.rewardXp, premium: c.premium, locked: c.premium && !plus,
    participants: c._count.participants, joined: !!c.participants[0], progress: c.participants[0]?.progress ?? 0,
    teamMode: c.teamMode, team: c.participants[0]?.team ?? null,
    completed: !!c.participants[0]?.completedAt, claimed: !!c.participants[0]?.claimedAt, started: c.startsAt <= now,
  })));
});
