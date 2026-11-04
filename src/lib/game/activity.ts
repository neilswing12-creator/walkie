/**
 * Server-authoritative activity ingestion. The client's numbers are never trusted for rewards:
 * - distance is recomputed from raw GPS points and checked for plausibility per sport
 * - moving time is capped by the server-side session (start time minus paused time)
 * - a session can be finished once; (userId, clientId) is unique → replays are harmless
 * - points = moving minutes × configured rate (+ streak/record bonus), capped per day; coins/XP derive from points
 */
import { z } from "zod";
import { db, type Tx } from "../db";
import { ACTIVITY_META, ACTIVITY_TYPES, type ActivityType } from "../constants";
import { checkPlausibility, estimateCalories, estimateSteps, paceSecPerKm, processRoute, type RawPoint } from "../fitness";
import { activityReward, maxAvgSpeeds, type EconomyConfig } from "../economy";
import { dateKey } from "../dates";
import { grant } from "../ledger";
import { bumpMissions } from "./missions";
import { markActiveDay, displayStreak } from "./streak";
import { addPetXp } from "./pets";
import { getActivityConfig } from "./activity-types";
import { ApiError } from "../api-error";

export const activityInput = z.object({
  clientId: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
  sessionId: z.string().max(40).optional(),
  type: z.enum(ACTIVITY_TYPES),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date(),
  movingSec: z.number().int().min(0).max(8 * 3600),
  points: z.array(z.tuple([z.number(), z.number(), z.number(), z.number().min(0), z.number().nullable()])).max(30000).optional(),
  manualDistanceM: z.number().min(0).max(400000).optional(),
  title: z.string().trim().max(80).optional(),
  note: z.string().max(500).optional(),
});
export type ActivityInput = z.infer<typeof activityInput>;

const fam = (t: string) => ACTIVITY_META[t as ActivityType]?.family ?? "other";
const dayWindow = (day: string) => { const [y, m, d] = day.split("-").map(Number); return { from: new Date(Date.UTC(y, m - 1, d) - 14 * 3600000), to: new Date(Date.UTC(y, m - 1, d + 1) + 14 * 3600000) }; };

export async function recomputeDailySummary(tx: Tx, userId: string, day: string, tz: string, goals: { dailyStepGoal: number; dailyActiveMinGoal: number }) {
  const { from, to } = dayWindow(day);
  const acts = (await tx.activity.findMany({ where: { userId, status: "COMPLETED", startedAt: { gte: from, lt: to } } })).filter((a) => dateKey(a.startedAt, tz) === day);
  const sum = (f: string) => acts.filter((a) => fam(a.type) === f).reduce((s, a) => s + a.distanceM, 0);
  const minutes = Math.round(acts.reduce((s, a) => s + a.durationSec, 0) / 60);
  const calories = acts.reduce((s, a) => s + a.calories, 0);
  const estSteps = acts.reduce((s, a) => s + (a.estimatedSteps ?? 0), 0);
  const points = acts.reduce((s, a) => s + a.points, 0);
  const existing = await tx.dailySummary.findUnique({ where: { userId_date: { userId, date: day } } });
  const steps = existing?.steps ?? 0;
  const goalMet = Math.max(steps, estSteps) >= goals.dailyStepGoal || minutes >= goals.dailyActiveMinGoal;
  const data = { walkDistanceM: sum("walk"), runDistanceM: sum("run"), bikeDistanceM: sum("bike"), activeMinutes: Math.max(minutes, existing?.stepsSource ? existing.activeMinutes : 0), calories, activities: acts.length, goalMet, points };
  const row = await tx.dailySummary.upsert({ where: { userId_date: { userId, date: day } }, create: { userId, date: day, ...data }, update: data });
  return { ...row, estimatedSteps: estSteps, effectiveSteps: Math.max(steps, estSteps) };
}

/** Personal records this activity sets vs. the user's previous comparable activities (needs a prior one to compare). */
async function detectRecords(tx: Tx, userId: string, type: ActivityType, distanceM: number, movingSec: number, elevation: number | null) {
  const f = fam(type);
  const prev = await tx.activity.findMany({ where: { userId, status: "COMPLETED", type: { in: ACTIVITY_TYPES.filter((t) => ACTIVITY_META[t].family === f) } }, select: { distanceM: true, durationSec: true, avgPaceSecKm: true, elevationGainM: true } });
  const out: string[] = [];
  if (!prev.length) return out;
  const label = f === "walk" ? "WALK" : f === "run" ? "RUN" : f === "bike" ? "RIDE" : "WORKOUT";
  if (distanceM >= 500 && distanceM > Math.max(...prev.map((p) => p.distanceM))) out.push(`LONGEST_${label}`);
  if (movingSec >= 600 && movingSec > Math.max(...prev.map((p) => p.durationSec))) out.push(`LONGEST_${label}_TIME`);
  if (f === "run") {
    const pace = paceSecPerKm(distanceM, movingSec);
    for (const [min, key] of [[1000, "FASTEST_1K"], [5000, "FASTEST_5K"]] as const) {
      const pool = prev.filter((p) => p.distanceM >= min && p.avgPaceSecKm);
      if (pace && distanceM >= min && pool.length && pace < Math.min(...pool.map((p) => p.avgPaceSecKm!))) out.push(key);
    }
  }
  if (elevation != null && elevation >= 20 && elevation > Math.max(0, ...prev.map((p) => p.elevationGainM ?? 0))) out.push("MOST_ELEVATION");
  return out;
}

type Ctx = { tz: string; weightKg?: number | null; heightCm?: number | null; activePetId?: string | null; isPlus: boolean; economy: EconomyConfig; goals: { dailyStepGoal: number; dailyActiveMinGoal: number } };

export async function ingestActivity(userId: string, input: ActivityInput, ctx: Ctx) {
  const existing = await db.activity.findUnique({ where: { userId_clientId: { userId, clientId: input.clientId } } });
  if (existing) return { activity: existing, duplicate: true as const, completedMissions: [] as string[], streak: null, pet: null, leveledUp: false, reward: null, petHappiness: 0 };

  const cfg = await getActivityConfig(input.type);
  if (!cfg.enabled) throw new ApiError(400, `${cfg.name} is currently unavailable`);
  const now = Date.now();
  if (input.endedAt.getTime() < input.startedAt.getTime()) throw new ApiError(400, "End time is before start time");
  if (input.endedAt.getTime() > now + 5 * 60000) throw new ApiError(400, "Activity ends in the future");
  if (input.startedAt.getTime() < now - 7 * 86400000) throw new ApiError(400, "Activities older than 7 days can't be added manually");

  const meta = ACTIVITY_META[input.type];
  const elapsedSec = Math.round((input.endedAt.getTime() - input.startedAt.getTime()) / 1000);
  let movingSec = Math.min(input.movingSec, elapsedSec);

  // Session check: authoritative timing & one-shot finish.
  let session: Awaited<ReturnType<typeof db.activitySession.findUnique>> = null;
  if (input.sessionId) {
    session = await db.activitySession.findUnique({ where: { id: input.sessionId } });
    if (!session || session.userId !== userId) throw new ApiError(404, "Activity session not found");
    if (session.status === "FINISHED" || session.status === "ABANDONED") throw new ApiError(409, "This activity was already finished", "session_finished");
    const pausedNow = session.status === "PAUSED" && session.pausedAt ? now - session.pausedAt.getTime() : 0;
    const serverMoving = Math.floor((Math.min(now, input.endedAt.getTime() + 60000) - session.startedAt.getTime() - session.pausedMs - pausedNow) / 1000);
    movingSec = Math.max(0, Math.min(movingSec, serverMoving + 30)); // 30s tolerance for network latency
  }

  let distanceM = 0;
  let route: ReturnType<typeof processRoute> | null = null;
  if (meta.gps) {
    if (input.points && input.points.length > 1) { route = processRoute(input.points as RawPoint[], meta.family); distanceM = route.distanceM; }
  } else if (input.type !== "FREE_WORKOUT") distanceM = input.manualDistanceM ?? 0;

  let plaus = checkPlausibility(input.type, distanceM, movingSec, elapsedSec, maxAvgSpeeds(ctx.economy));
  // GPS integrity: if most of the track was discarded as impossible-speed jumps, the moving time can't be trusted either
  if (plaus.ok && route && input.points && input.points.length >= 10 && route.rejected > Math.max(3, input.points.length * 0.3)) plaus = { ok: false, reason: "Most GPS points were faster than possible for this activity (vehicle travel?)" };
  const avgSpeed = movingSec > 0 && distanceM > 0 ? distanceM / movingSec : null;
  const calories = estimateCalories(input.type, movingSec, ctx.weightKg, avgSpeed ?? undefined);
  const estimatedSteps = meta.family === "walk" || meta.family === "run" ? estimateSteps(distanceM, meta.family === "run", ctx.heightCm) : null;
  const day = dateKey(input.startedAt, ctx.tz);

  return db.$transaction(async (tx) => {
    if (session) {
      const s = await tx.activitySession.updateMany({ where: { id: session.id, status: { in: ["ACTIVE", "PAUSED"] } }, data: { status: "FINISHED", finishedAt: new Date() } });
      if (!s.count) throw new ApiError(409, "This activity was already finished", "session_finished");
    }
    const records = plaus.ok ? await detectRecords(tx, userId, input.type, distanceM, movingSec, route?.elevationGainM ?? null) : [];
    const { from, to } = dayWindow(day);
    const todays = (await tx.activity.findMany({ where: { userId, startedAt: { gte: from, lt: to }, status: { not: "DELETED" } }, select: { startedAt: true, points: true } })).filter((e) => dateKey(e.startedAt, ctx.tz) === day);
    const streakRow = await tx.streak.findUnique({ where: { userId } });
    const reward = plaus.ok
      ? activityReward(movingSec, cfg.rewardRate, ctx.economy, { streakDays: displayStreak(streakRow, day).current, records: records.length, pointsEarnedToday: todays.reduce((s, e) => s + e.points, 0) })
      : activityReward(0, 0, ctx.economy);

    const activity = await tx.activity.create({
      data: {
        userId, clientId: input.clientId, sessionId: session?.id ?? null, type: input.type, source: meta.gps ? "GPS" : "MANUAL", title: input.title ?? null,
        startedAt: input.startedAt, endedAt: input.endedAt, durationSec: movingSec, elapsedSec, distanceM,
        elevationGainM: route?.elevationGainM ?? null, avgPaceSecKm: meta.family === "bike" ? null : paceSecPerKm(distanceM, movingSec), avgSpeedMps: avgSpeed, maxSpeedMps: route?.maxSpeedMps || null,
        calories, estimatedSteps, splits: route?.splits ?? [], records, status: plaus.ok ? "COMPLETED" : "FLAGGED", flagReason: plaus.reason ?? null,
        points: reward.points, coinsAwarded: reward.coins, xpAwarded: reward.xp, note: input.note,
      },
    });
    if (route && route.points.length > 1 && route.bbox) await tx.activityRoute.create({ data: { activityId: activity.id, points: route.points, ...route.bbox } });
    if (session) await tx.activitySession.update({ where: { id: session.id }, data: { activityId: activity.id } });
    if (!plaus.ok) return { activity, duplicate: false as const, completedMissions: [] as string[], streak: null, pet: null, leveledUp: false, reward, petHappiness: 0 };

    const ledger = await grant(tx, userId, { coins: reward.coins, xp: reward.xp, points: reward.points, reason: "ACTIVITY", key: `activity:${activity.id}`, refType: "activity", refId: activity.id, meta: { ...reward } });
    const entry = await tx.ledgerEntry.findUnique({ where: { idempotencyKey: `activity:${activity.id}` } });
    await tx.activity.update({ where: { id: activity.id }, data: { rewardTxId: entry?.id } });
    const summary = await recomputeDailySummary(tx, userId, day, ctx.tz, ctx.goals);
    const minutes = Math.floor(movingSec / 60);
    const completed: string[] = [];
    const bump = async (k: Parameters<typeof bumpMissions>[3], v: number, mode: "add" | "max" = "add") => completed.push(...(await bumpMissions(tx, userId, day, k, v, mode, ctx.isPlus)));
    await bump("ACTIVITY_COUNT", 1);
    await bump("ACTIVE_MINUTES", minutes);
    await bump("POINTS", summary.points, "max");
    if (meta.family === "walk") { await bump("WALK_DISTANCE", distanceM); await bump("WALK_DURATION", minutes); }
    if (meta.family === "run") { await bump("RUN_DISTANCE", distanceM); await bump("RUN_DURATION", minutes); await bump("RUN_SINGLE_DISTANCE", distanceM, "max"); }
    if (meta.family === "bike") { await bump("BIKE_DISTANCE", distanceM); await bump("BIKE_DURATION", minutes); await bump("BIKE_COUNT", 1); }
    await bump("STEPS", summary.effectiveSteps, "max");
    for (const ch of await tx.challengeParticipant.findMany({ where: { userId, completedAt: null, challenge: { enabled: true, startsAt: { lte: input.startedAt }, endsAt: { gte: input.startedAt } } }, include: { challenge: true } })) {
      const k = ch.challenge.kind;
      const inc = k === "ACTIVITY_COUNT" ? 1 : k === "ACTIVE_MINUTES" ? minutes : k === "STEPS" ? estimatedSteps ?? 0
        : k === "WALK_DISTANCE" && meta.family === "walk" ? distanceM : k === "RUN_DISTANCE" && meta.family === "run" ? distanceM : k === "BIKE_DISTANCE" && meta.family === "bike" ? distanceM : 0;
      if (inc <= 0) continue;
      const next = Math.min(ch.challenge.target, ch.progress + Math.round(inc));
      await tx.challengeParticipant.update({ where: { id: ch.id }, data: { progress: next, completedAt: next >= ch.challenge.target ? new Date() : null } });
    }
    const streak = minutes >= 1 ? await markActiveDay(tx, userId, day) : null;
    let pet = null; let petHappiness = 0;
    if (ctx.activePetId) {
      pet = await addPetXp(tx, ctx.activePetId, Math.round(reward.xp * 0.8));
      const p = await tx.pet.findUnique({ where: { id: ctx.activePetId } });
      if (p) { petHappiness = Math.min(100, p.happiness + 10) - p.happiness; await tx.pet.update({ where: { id: p.id }, data: { happiness: p.happiness + petHappiness, energy: Math.max(10, p.energy - Math.min(15, Math.round(minutes / 4))) } }); }
    }
    return { activity: await tx.activity.findUniqueOrThrow({ where: { id: activity.id } }), duplicate: false as const, completedMissions: completed, streak, pet, leveledUp: ledger.leveledUp, reward, petHappiness };
  }, { timeout: 20000 });
}

/**
 * Soft-deletes an activity and reverses the coins/points/XP it paid. The row (and its clientId/sessionId) is kept,
 * so re-uploading the same activity can't mint rewards again. Coins already spent are clamped at the current balance.
 */
export async function deleteActivity(userId: string, activityId: string, tz: string, goals: { dailyStepGoal: number; dailyActiveMinGoal: number }) {
  return db.$transaction(async (tx) => {
    const a = await tx.activity.findFirst({ where: { id: activityId, userId, status: { not: "DELETED" } } });
    if (!a) throw new ApiError(404, "Activity not found");
    const u = await tx.activity.updateMany({ where: { id: a.id, status: a.status }, data: { status: "DELETED", deletedAt: new Date(), shareId: null } });
    if (!u.count) throw new ApiError(409, "Activity already deleted");
    await tx.activityRoute.deleteMany({ where: { activityId: a.id } }); // private location data is removed immediately
    const key = `reversal:${a.id}`;
    if ((a.coinsAwarded || a.points || a.xpAwarded) && !(await tx.ledgerEntry.findUnique({ where: { idempotencyKey: key } }))) {
      const w = await tx.wallet.findUnique({ where: { userId } });
      const coins = Math.min(a.coinsAwarded, w?.coins ?? 0);
      const points = Math.min(a.points, w?.points ?? 0);
      const xp = Math.min(a.xpAwarded, w?.xp ?? 0);
      await tx.wallet.update({ where: { userId }, data: { coins: { decrement: coins }, points: { decrement: points }, xp: { decrement: xp } } });
      await tx.ledgerEntry.create({ data: { userId, coins: -coins, xp: -xp, points: -points, reason: "REVERSAL", refType: "activity", refId: a.id, idempotencyKey: key } });
    }
    await recomputeDailySummary(tx, userId, dateKey(a.startedAt, tz), tz, goals);
    return { reversed: { coins: a.coinsAwarded, points: a.points, xp: a.xpAwarded } };
  });
}
