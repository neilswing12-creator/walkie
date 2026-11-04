import "server-only";
import { db } from "../db";
import { SUB_ACTIVE_STATUSES, ACTIVITY_META, typesOfFamily, type ActivityType } from "../constants";
import { integrationStatus } from "../env";

const DAY = 86400000;
const bucket = (dates: Date[], days: number) => {
  const now = Date.now();
  const out = Array.from({ length: days }, (_, i) => ({ date: new Date(now - (days - 1 - i) * DAY).toISOString().slice(0, 10), count: 0 }));
  for (const d of dates) {
    const k = d.toISOString().slice(0, 10);
    const b = out.find((x) => x.date === k);
    if (b) b.count++;
  }
  return out;
};

export async function getAdminStats() {
  const now = Date.now();
  const d1 = new Date(now - DAY), d7 = new Date(now - 7 * DAY), d30 = new Date(now - 30 * DAY), d60 = new Date(now - 60 * DAY);
  const [total, active, suspended, banned, new7, new30, dau, wau, mau, signups30, acts30, walk30, run30, distAll, pets, subs, churned30, payments30, adEvents, cohort, withActivity, flagged] = await Promise.all([
    db.user.count({ where: { status: { not: "DELETED" } } }),
    db.user.count({ where: { status: "ACTIVE" } }),
    db.user.count({ where: { status: "SUSPENDED" } }),
    db.user.count({ where: { status: "BANNED" } }),
    db.user.count({ where: { createdAt: { gte: d7 } } }),
    db.user.count({ where: { createdAt: { gte: d30 } } }),
    db.user.count({ where: { lastActiveAt: { gte: d1 } } }),
    db.user.count({ where: { lastActiveAt: { gte: d7 } } }),
    db.user.count({ where: { lastActiveAt: { gte: d30 } } }),
    db.user.findMany({ where: { createdAt: { gte: d30 } }, select: { createdAt: true } }),
    db.activity.findMany({ where: { startedAt: { gte: d30 }, status: "COMPLETED" }, select: { startedAt: true } }),
    db.activity.aggregate({ where: { startedAt: { gte: d30 }, status: "COMPLETED", type: { in: typesOfFamily("walk") } }, _count: true, _sum: { distanceM: true } }),
    db.activity.aggregate({ where: { startedAt: { gte: d30 }, status: "COMPLETED", type: { in: typesOfFamily("run") } }, _count: true, _sum: { distanceM: true } }),
    db.activity.aggregate({ where: { status: "COMPLETED" }, _sum: { distanceM: true }, _count: true }),
    db.pet.count(),
    db.subscription.groupBy({ by: ["status"], _count: true }),
    db.subscription.count({ where: { status: { in: ["CANCELED", "EXPIRED", "REFUNDED"] }, updatedAt: { gte: d30 } } }),
    db.paymentEvent.findMany({ where: { processedAt: { gte: d30 }, amountCents: { not: null } }, select: { amountCents: true, provider: true } }),
    db.adEvent.groupBy({ by: ["type"], where: { createdAt: { gte: d30 } }, _count: true, _sum: { revenueMicros: true } }),
    db.user.findMany({ where: { createdAt: { gte: d60, lt: d7 } }, select: { id: true, createdAt: true, lastActiveAt: true } }),
    db.activity.groupBy({ by: ["userId"], _count: true }),
    db.activity.count({ where: { status: "FLAGGED", startedAt: { gte: d30 } } }),
  ]);
  const byType = await db.activity.groupBy({ by: ["type"], where: { status: "COMPLETED", startedAt: { gte: d30 } }, _count: true, _sum: { distanceM: true, durationSec: true, points: true } });
  const usersByType = await db.activity.groupBy({ by: ["type", "userId"], where: { status: "COMPLETED", startedAt: { gte: d30 } } });
  const famOf = (t: string) => ACTIVITY_META[t as ActivityType]?.family ?? "other";
  const sports = (["walk", "run", "bike", "other"] as const).map((f) => {
    const rows = byType.filter((r) => famOf(r.type) === f);
    const sessions = rows.reduce((t, r) => t + r._count, 0);
    const dist = rows.reduce((t, r) => t + (r._sum.distanceM ?? 0), 0), dur = rows.reduce((t, r) => t + (r._sum.durationSec ?? 0), 0);
    return { family: f, sessions, activeUsers: new Set(usersByType.filter((u) => famOf(u.type) === f).map((u) => u.userId)).size, avgDistanceKm: sessions ? dist / sessions / 1000 : 0, avgDurationMin: sessions ? dur / sessions / 60 : 0, points: rows.reduce((t, r) => t + (r._sum.points ?? 0), 0) };
  });
  const rewardsOut = await db.ledgerEntry.aggregate({ where: { createdAt: { gte: d30 }, coins: { gt: 0 } }, _sum: { coins: true, points: true, xp: true } });
  const subCount = (s: string[]) => subs.filter((x) => s.includes(x.status)).reduce((t, x) => t + x._count, 0);
  const activeSubs = subCount(SUB_ACTIVE_STATUSES);
  const revenue30 = payments30.reduce((t, p) => t + (p.amountCents ?? 0), 0);
  const retained7 = cohort.filter((u) => u.lastActiveAt && u.lastActiveAt.getTime() - u.createdAt.getTime() >= 7 * DAY).length;
  const retained1 = cohort.filter((u) => u.lastActiveAt && u.lastActiveAt.getTime() - u.createdAt.getTime() >= DAY).length;
  const ad = (t: string) => adEvents.find((a) => a.type === t);
  return {
    users: { total, active, suspended, banned, new7, new30, dau, wau, mau, stickiness: mau ? dau / mau : 0 },
    activity: { walks30: walk30._count, walkKm30: (walk30._sum.distanceM ?? 0) / 1000, runs30: run30._count, runKm30: (run30._sum.distanceM ?? 0) / 1000, totalKm: (distAll._sum.distanceM ?? 0) / 1000, totalActivities: distAll._count, flagged30: flagged },
    pets: { total: pets, perUser: total ? pets / total : 0 },
    subscriptions: { active: activeSubs, trialing: subCount(["TRIALING"]), pastDue: subCount(["PAST_DUE"]), churned30, churnRate: activeSubs + churned30 ? churned30 / (activeSubs + churned30) : 0, conversion: total ? activeSubs / total : 0 },
    revenue: { last30Cents: revenue30, byProvider: { stripe: payments30.filter((p) => p.provider === "STRIPE").reduce((t, p) => t + (p.amountCents ?? 0), 0), revenuecat: payments30.filter((p) => p.provider === "REVENUECAT").reduce((t, p) => t + (p.amountCents ?? 0), 0) } },
    retention: { cohortSize: cohort.length, d1: cohort.length ? retained1 / cohort.length : null, d7: cohort.length ? retained7 / cohort.length : null },
    funnel: { signups: total, firstActivity: withActivity.length, threePlus: withActivity.filter((w) => w._count >= 3).length, subscribers: activeSubs },
    ads: { impressions: ad("IMPRESSION")?._count ?? 0, clicks: ad("CLICK")?._count ?? 0, rewards: ad("REWARD")?._count ?? 0, revenueMicros: adEvents.reduce((t, a) => t + (a._sum.revenueMicros ?? 0), 0) },
    series: { signups: bucket(signups30.map((s) => s.createdAt), 30), activities: bucket(acts30.map((a) => a.startedAt), 30) },
    sports, rewards30: { coins: rewardsOut._sum.coins ?? 0, points: rewardsOut._sum.points ?? 0, xp: rewardsOut._sum.xp ?? 0 },
    integrations: integrationStatus(),
  };
}
export type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;
