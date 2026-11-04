import "server-only";
import { db } from "../db";
import { userContext } from "../context";
import { weekDays, addDays, hourIn, dateKey } from "../dates";
import { listMissions } from "../game/missions";
import { displayStreak } from "../game/streak";
import { DAILY_REWARDS, effectivePetStats, levelFromXp } from "../economy";
import type { CurrentUser } from "../auth/session";

export async function dailyRewardState(userId: string, today: string) {
  const [todayClaim, last] = await Promise.all([
    db.dailyRewardClaim.findUnique({ where: { userId_date: { userId, date: today } } }),
    db.dailyRewardClaim.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
  ]);
  const nextDay = todayClaim ? todayClaim.streakDay : last && last.date === addDays(today, -1) ? (last.streakDay % 7) + 1 : 1;
  return { claimedToday: !!todayClaim, day: nextDay, cycle: DAILY_REWARDS.map((r, i) => ({ day: i + 1, label: r.label, coins: r.coins, hasItem: !!r.items })) };
}

export async function getHomeData(user: CurrentUser) {
  const ctx = await userContext(user);
  const days = weekDays(ctx.today);
  const [summaries, wallet, streak, pet, unread, missions, reward, todayActs] = await Promise.all([
    db.dailySummary.findMany({ where: { userId: user.id, date: { in: days } } }),
    db.wallet.findUnique({ where: { userId: user.id } }),
    db.streak.findUnique({ where: { userId: user.id } }),
    ctx.profile.activePetId ? db.pet.findUnique({ where: { id: ctx.profile.activePetId }, include: { species: true } }) : null,
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    listMissions(user.id, ctx.today, ctx.plus),
    dailyRewardState(user.id, ctx.today),
    db.activity.findMany({ where: { userId: user.id, status: "COMPLETED", startedAt: { gte: new Date(Date.now() - 36 * 3600000) } }, orderBy: { startedAt: "desc" }, take: 20 }),
  ]);
  const today = summaries.find((s) => s.date === ctx.today);
  const todays = todayActs.filter((a) => dateKey(a.startedAt, ctx.tz) === ctx.today);
  const estSteps = todays.reduce((s, a) => s + (a.estimatedSteps ?? 0), 0);
  const healthSteps = today?.steps ?? 0;
  const steps = Math.max(healthSteps, estSteps);
  const lastActivity = todayActs[0] ?? (await db.activity.findFirst({ where: { userId: user.id, status: "COMPLETED" }, orderBy: { startedAt: "desc" } }));
  const hour = hourIn(ctx.tz);
  const hoursSinceActivity = lastActivity ? (Date.now() - lastActivity.endedAt.getTime()) / 3600000 : Infinity;
  const goalSteps = ctx.profile.dailyStepGoal;
  const mood =
    !lastActivity ? (hour >= 22 || hour < 6 ? "sleep" : "greet") : steps >= goalSteps ? "celebrate" : hoursSinceActivity < 1 ? "happy" : hour >= 22 || hour < 6 ? "sleep" : hour < 11 ? "greet" : hoursSinceActivity > 30 ? "sit" : "idle";
  return {
    ctx: { today: ctx.today, tz: ctx.tz, plus: ctx.plus, units: ctx.profile.units as "metric" | "imperial", hour },
    user: { name: user.name.split(" ")[0], avatarUrl: user.avatarUrl, emailVerified: !!user.emailVerified },
    wallet: wallet ? { coins: wallet.coins, points: wallet.points, ...levelFromXp(wallet.xp) } : null,
    streak: displayStreak(streak, ctx.today),
    pet: pet && { id: pet.id, nickname: pet.nickname, species: pet.species.key, speciesName: pet.species.name, level: pet.level, stage: pet.stage, ...effectivePetStats(pet) },
    unread,
    today: {
      steps, stepsSource: healthSteps >= estSteps && today?.stepsSource ? today.stepsSource : estSteps > 0 ? "ESTIMATED" : null,
      walkDistanceM: today?.walkDistanceM ?? 0, runDistanceM: today?.runDistanceM ?? 0, bikeDistanceM: today?.bikeDistanceM ?? 0, points: today?.points ?? 0, activeMinutes: today?.activeMinutes ?? 0, calories: today?.calories ?? 0,
      goals: { steps: goalSteps, distanceM: ctx.profile.dailyDistanceGoalM, activeMin: ctx.profile.dailyActiveMinGoal },
    },
    week: days.map((d) => {
      const s = summaries.find((x) => x.date === d);
      return { date: d, activeMinutes: s?.activeMinutes ?? 0, distanceM: (s?.walkDistanceM ?? 0) + (s?.runDistanceM ?? 0) + (s?.bikeDistanceM ?? 0), steps: s?.steps ?? 0, goalMet: !!s?.goalMet, future: d > ctx.today };
    }),
    missions: missions.filter((m) => m.period === "DAILY"),
    weeklyMissions: missions.filter((m) => m.period === "WEEKLY"),
    reward,
    hasAnyActivity: !!lastActivity,
    mood: mood as "celebrate" | "happy" | "sleep" | "greet" | "sit" | "idle",
  };
}
export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
