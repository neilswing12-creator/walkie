import { z } from "zod";
import { handler, ok, body, query } from "@/lib/api";
import { db } from "@/lib/db";
import { activityInput, ingestActivity } from "@/lib/game/activity";
import { userContext } from "@/lib/context";
import { evaluateProgress } from "@/lib/game/progression";
import { notify } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { ACTIVITY_TYPES } from "@/lib/constants";

export const GET = handler(async ({ req, user }) => {
  const q = query(req, z.object({ cursor: z.string().optional(), type: z.enum(ACTIVITY_TYPES).optional(), limit: z.coerce.number().int().min(1).max(50).default(20) }));
  const items = await db.activity.findMany({
    where: { userId: user.id, status: { not: "DELETED" }, ...(q.type ? { type: q.type } : {}) }, orderBy: { startedAt: "desc" }, take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    select: { id: true, type: true, startedAt: true, durationSec: true, distanceM: true, avgPaceSecKm: true, calories: true, coinsAwarded: true, status: true, flagReason: true },
  });
  return ok({ items: items.slice(0, q.limit), nextCursor: items.length > q.limit ? items[q.limit - 1].id : null });
}, { allowSuspended: true });

export const POST = handler(async ({ req, user }) => {
  const input = await body(req, activityInput);
  const ctx = await userContext(user);
  const res = await ingestActivity(user.id, input, { tz: ctx.tz, weightKg: ctx.profile.weightKg, heightCm: ctx.profile.heightCm, activePetId: ctx.profile.activePetId, isPlus: ctx.plus, economy: ctx.economy, goals: ctx.goals });
  let progress = { unlockedAchievements: [] as { title: string; coins: number }[], discoveredPets: [] as { key: string; name: string; rarity: string }[] };
  if (!res.duplicate && res.activity.status === "COMPLETED") {
    progress = await evaluateProgress(user.id);
    if (res.activity.coinsAwarded > 0) await notify(user.id, { type: "REWARD", title: `+${res.activity.coinsAwarded} coins`, body: "Nice work out there! Walkie is proud of you.", link: `/app/activity/${res.activity.id}` });
    await track("activity_completed", user.id, { type: input.type, gps: !!input.points?.length });
    await (await import("@/lib/referrals/service")).processReferral(user.id).catch(() => {});
  }
  if (!res.duplicate) await (await import("@/lib/leaderboard/service")).touchLeaderboard(user.id, [res.activity.startedAt]);
  const a = res.activity;
  const [missions, wallet, layout] = await Promise.all([
    (await import("@/lib/game/missions")).listMissions(user.id, ctx.today, ctx.plus),
    db.wallet.findUnique({ where: { userId: user.id } }),
    db.shopLayout.findUnique({ where: { userId: user.id } }),
  ]);
  const nextExpansion = ctx.economy.shopExpansionCost[(layout?.expansion ?? 0) + 1] ?? null;
  return ok({
    activity: { id: a.id, status: a.status, flagReason: a.flagReason, distanceM: a.distanceM, durationSec: a.durationSec, calories: a.calories, avgPaceSecKm: a.avgPaceSecKm, avgSpeedMps: a.avgSpeedMps, coinsAwarded: a.coinsAwarded, xpAwarded: a.xpAwarded, points: a.points, records: a.records },
    reward: res.reward, petHappiness: res.petHappiness,
    duplicate: res.duplicate, completedMissions: res.completedMissions, streak: res.streak, pet: res.pet, leveledUp: res.leveledUp, ...progress,
    missions: missions.filter((m) => !m.locked && m.period !== "ONE_OFF").slice(0, 4).map((m) => ({ title: m.title, progress: m.progress, target: m.target, completed: m.completed, kind: m.kind })),
    shop: { coins: wallet?.coins ?? 0, nextExpansion },
  });
}, { rate: { limit: 30, windowMs: 3600000, key: "activity-post" } });
