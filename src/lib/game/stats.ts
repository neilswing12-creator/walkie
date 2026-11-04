import { db, type Tx } from "../db";
import { ACTIVITY_META, typesOfFamily, type ActivityType } from "../constants";

/** Lifetime stats used by achievements and pet unlocks. */
export async function lifetimeStats(userId: string, tx: Tx = db) {
  const [act, health, longest, runs, pets, layout, missions, streak, wallet] = await Promise.all([
    tx.activity.aggregate({ where: { userId, status: "COMPLETED" }, _sum: { distanceM: true, estimatedSteps: true }, _count: true }),
    tx.dailySummary.aggregate({ where: { userId }, _sum: { steps: true } }),
    tx.activity.aggregate({ where: { userId, status: "COMPLETED" }, _max: { distanceM: true } }),
    tx.activity.count({ where: { userId, status: "COMPLETED", type: { in: typesOfFamily("run") } } }),
    tx.pet.count({ where: { userId } }),
    tx.shopLayout.findUnique({ where: { userId }, select: { _count: { select: { placements: true } } } }),
    tx.missionProgress.count({ where: { userId, completedAt: { not: null } } }),
    tx.streak.findUnique({ where: { userId } }),
    tx.wallet.findUnique({ where: { userId } }),
  ]);
  const fams = await tx.activity.groupBy({ by: ["type"], where: { userId, status: "COMPLETED" }, _sum: { distanceM: true, durationSec: true }, _max: { distanceM: true, durationSec: true }, _count: true });
  const F = (f: string) => fams.filter((r) => ACTIVITY_META[r.type as ActivityType]?.family === f);
  const sumD = (f: string) => F(f).reduce((t, r) => t + (r._sum.distanceM ?? 0), 0);
  const maxD = (f: string) => Math.max(0, ...F(f).map((r) => r._max.distanceM ?? 0));
  const cnt = (f: string) => F(f).reduce((t, r) => t + r._count, 0);
  return {
    walkDistanceM: sumD("walk"), runDistanceM: sumD("run"), bikeDistanceM: sumD("bike"),
    longestWalkM: maxD("walk"), longestRunM: maxD("run"), longestRideM: maxD("bike"),
    rideCount: cnt("bike"), walkCount: cnt("walk"),
    totalActiveSec: fams.reduce((t, r) => t + (r._sum.durationSec ?? 0), 0),
    longestActivitySec: Math.max(0, ...fams.map((r) => r._max.durationSec ?? 0)),
    totalDistanceM: act._sum.distanceM ?? 0,
    // Health-reported steps are authoritative; fall back to activity estimates for web-only users.
    totalSteps: Math.max(health._sum.steps ?? 0, act._sum.estimatedSteps ?? 0),
    longestSingleM: longest._max.distanceM ?? 0,
    activityCount: act._count,
    runCount: runs,
    petCount: pets,
    placements: layout?._count.placements ?? 0,
    missionsCompleted: missions,
    longestStreak: streak?.longest ?? 0,
    level: wallet?.level ?? 1,
  };
}
export type LifetimeStats = Awaited<ReturnType<typeof lifetimeStats>>;

export function statForKind(s: LifetimeStats, kind: string): number {
  switch (kind) {
    case "TOTAL_STEPS": return s.totalSteps;
    case "TOTAL_DISTANCE": return s.totalDistanceM;
    case "SINGLE_DISTANCE": return s.longestSingleM;
    case "STREAK": return s.longestStreak;
    case "RUN_COUNT": return s.runCount;
    case "PET_COUNT": return s.petCount;
    case "SHOP_PLACEMENTS": return s.placements;
    case "MISSION_COUNT": case "MISSIONS": return s.missionsCompleted;
    case "ACTIVITY_COUNT": return s.activityCount;
    case "LEVEL": return s.level;
    default: return 0;
  }
}
