/**
 * Native apps (HealthKit / Health Connect) push daily totals here. Steps drive missions, streaks and achievements;
 * they don't mint coins directly (GPS activities do), which prevents double counting.
 */
import { z } from "zod";
import { handler, ok, body } from "@/lib/api";
import { db } from "@/lib/db";
import { userContext } from "@/lib/context";
import { addDays } from "@/lib/dates";
import { bumpMissions } from "@/lib/game/missions";
import { markActiveDay } from "@/lib/game/streak";
import { recomputeDailySummary } from "@/lib/game/activity";
import { evaluateProgress } from "@/lib/game/progression";

const schema = z.object({
  source: z.enum(["HEALTHKIT", "HEALTH_CONNECT"]),
  days: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), steps: z.number().int().min(0).max(100000), activeMinutes: z.number().int().min(0).max(1440).optional() })).min(1).max(14),
});

export const POST = handler(async ({ req, user }) => {
  const input = await body(req, schema);
  const ctx = await userContext(user);
  const earliest = addDays(ctx.today, -13);
  const accepted = input.days.filter((d) => d.date >= earliest && d.date <= ctx.today);
  await db.$transaction(async (tx) => {
    for (const d of accepted) {
      await tx.dailySummary.upsert({
        where: { userId_date: { userId: user.id, date: d.date } },
        create: { userId: user.id, date: d.date, steps: d.steps, stepsSource: input.source, activeMinutes: d.activeMinutes ?? 0 },
        update: { steps: d.steps, stepsSource: input.source, ...(d.activeMinutes != null ? { activeMinutes: d.activeMinutes } : {}) },
      });
      const s = await recomputeDailySummary(tx, user.id, d.date, ctx.tz, ctx.goals);
      if (d.date === ctx.today) await bumpMissions(tx, user.id, d.date, "STEPS", s.effectiveSteps, "max", ctx.plus);
      if (d.steps >= 1000) await markActiveDay(tx, user.id, d.date);
    }
    await tx.healthSync.upsert({ where: { userId_source: { userId: user.id, source: input.source } }, create: { userId: user.id, source: input.source }, update: { lastSyncedAt: new Date() } });
  }, { timeout: 20000 });
  const progress = await evaluateProgress(user.id);
  if (accepted.length) await (await import("@/lib/leaderboard/service")).touchLeaderboard(user.id, accepted.map((d) => d.date));
  return ok({ accepted: accepted.length, ...progress });
}, { rate: { limit: 60, windowMs: 3600000, key: "health-sync" } });
