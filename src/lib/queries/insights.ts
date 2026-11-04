import "server-only";
import { db } from "../db";
import { userContext } from "../context";
import { lastNDays, dateKey } from "../dates";
import { ACTIVITY_META, type ActivityType } from "../constants";
import type { CurrentUser } from "../auth/session";

export async function getInsights(user: CurrentUser, range: "week" | "month") {
  const ctx = await userContext(user);
  const n = range === "week" ? 7 : 30;
  const days = lastNDays(ctx.today, n);
  const prevDays = lastNDays(days[0], n + 1).slice(0, n);
  const since = new Date(Date.now() - (2 * n + 2) * 86400000);
  const [summaries, acts, pets, layout, missionsDone, streak, allTime] = await Promise.all([
    db.dailySummary.findMany({ where: { userId: user.id, date: { in: [...days, ...prevDays] } } }),
    db.activity.findMany({ where: { userId: user.id, status: "COMPLETED", startedAt: { gte: since } }, orderBy: { startedAt: "asc" }, select: { id: true, type: true, startedAt: true, distanceM: true, durationSec: true, avgPaceSecKm: true, estimatedSteps: true, calories: true } }),
    db.pet.findMany({ where: { userId: user.id }, select: { level: true, xp: true } }),
    db.shopLayout.findUnique({ where: { userId: user.id }, select: { expansion: true, _count: { select: { placements: true } } } }),
    db.missionProgress.findMany({ where: { userId: user.id, completedAt: { gte: since } }, select: { completedAt: true } }),
    db.streak.findUnique({ where: { userId: user.id } }),
    db.activity.findMany({ where: { userId: user.id, status: "COMPLETED" }, select: { type: true, distanceM: true, durationSec: true, avgPaceSecKm: true, startedAt: true } }),
  ]);
  const byDay = (list: string[]) =>
    list.map((d) => {
      const s = summaries.find((x) => x.date === d);
      const dayActs = acts.filter((a) => dateKey(a.startedAt, ctx.tz) === d);
      const est = dayActs.reduce((t, a) => t + (a.estimatedSteps ?? 0), 0);
      const run = dayActs.filter((a) => ACTIVITY_META[a.type as ActivityType].running);
      const runDist = run.reduce((t, a) => t + a.distanceM, 0);
      const runTime = run.reduce((t, a) => t + a.durationSec, 0);
      return {
        date: d, steps: Math.max(s?.steps ?? 0, est), walkM: s?.walkDistanceM ?? 0, runM: s?.runDistanceM ?? 0, bikeM: s?.bikeDistanceM ?? 0, points: s?.points ?? 0, minutes: s?.activeMinutes ?? 0,
        goalMet: !!s?.goalMet, runPace: runDist > 200 ? runTime / (runDist / 1000) : null,
        missions: missionsDone.filter((m) => m.completedAt && dateKey(m.completedAt, ctx.tz) === d).length,
      };
    });
  const cur = byDay(days);
  const prev = byDay(prevDays);
  const sum = (a: typeof cur, k: "steps" | "walkM" | "runM" | "bikeM" | "points" | "minutes" | "missions") => a.reduce((t, x) => t + x[k], 0);
  const runs = allTime.filter((a) => ACTIVITY_META[a.type as ActivityType].running && a.distanceM >= 1000);
  const best = (min: number) => runs.filter((r) => r.distanceM >= min && r.avgPaceSecKm).sort((a, b) => a.avgPaceSecKm! - b.avgPaceSecKm!)[0];
  const records = {
    longestWalkM: Math.max(0, ...allTime.filter((a) => ACTIVITY_META[a.type as ActivityType].family === "walk").map((a) => a.distanceM)),
    longestRideM: Math.max(0, ...allTime.filter((a) => ACTIVITY_META[a.type as ActivityType].family === "bike").map((a) => a.distanceM)),
    longestRunM: Math.max(0, ...runs.map((a) => a.distanceM)),
    fastest1k: best(1000)?.avgPaceSecKm ?? null,
    fastest5k: best(5000)?.avgPaceSecKm ?? null,
    longestDurationSec: Math.max(0, ...allTime.map((a) => a.durationSec)),
  };
  return {
    range, plus: ctx.plus, units: ctx.profile.units as "metric" | "imperial", goals: { steps: ctx.profile.dailyStepGoal },
    days: cur,
    totals: { steps: sum(cur, "steps"), walkM: sum(cur, "walkM"), runM: sum(cur, "runM"), bikeM: sum(cur, "bikeM"), points: sum(cur, "points"), minutes: sum(cur, "minutes"), missions: sum(cur, "missions"), goalDays: cur.filter((d) => d.goalMet).length },
    previous: { steps: sum(prev, "steps"), walkM: sum(prev, "walkM"), runM: sum(prev, "runM"), bikeM: sum(prev, "bikeM"), minutes: sum(prev, "minutes") },
    avgRunPace: (() => { const r = cur.filter((d) => d.runPace); return r.length ? r.reduce((t, d) => t + d.runPace!, 0) / r.length : null; })(),
    records, streak: { current: streak?.current ?? 0, longest: streak?.longest ?? 0 },
    pets: { count: pets.length, totalLevels: pets.reduce((t, p) => t + p.level, 0) },
    shop: { items: layout?._count.placements ?? 0, expansion: layout?.expansion ?? 0 },
    activityCount: allTime.length,
  };
}
export type InsightsData = Awaited<ReturnType<typeof getInsights>>;
