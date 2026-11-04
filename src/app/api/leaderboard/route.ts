import { z } from "zod";
import { handler, ok, query, ApiError } from "@/lib/api";
import { isFlagOn } from "@/lib/settings";
import { getBoard, lbSettings, personalSummary, periodKey, tierFor, settleDue } from "@/lib/leaderboard/service";
import { dateKey } from "@/lib/dates";

/** Server-ranked boards. Exposes display names, Walkie looks and totals only — never routes, locations or health details. */
export const GET = handler(async ({ req, user }) => {
  if (!(await isFlagOn("leaderboards"))) throw new ApiError(404, "Leaderboards are turned off");
  const q = query(req, z.object({ period: z.enum(["day", "week", "month", "all"]).default("week"), board: z.enum(["overall", "walk", "run", "bike", "steps"]).default("overall"), scope: z.enum(["friends", "global", "country", "community"]).default("friends") }));
  const cfg = await lbSettings();
  if (!cfg.periods.includes(q.period) || !cfg.boards.includes(q.board) || !cfg.scopes.includes(q.scope)) throw new ApiError(404, "That leaderboard isn't available");
  settleDue().catch(() => {}); // lazy settlement backup for the cron job
  const b = await getBoard(user.id, q.period, q.board, q.scope);
  const week = await personalSummary(user.id, periodKey("week", dateKey(new Date(), cfg.timezone), cfg));
  const myWeek = week.values.overall;
  const tier = tierFor(myWeek, cfg);
  const next = cfg.rewards.tiers.find((t) => t.min > myWeek) ?? null;
  return ok({
    ...b,
    available: { periods: cfg.periods, boards: cfg.boards, scopes: cfg.scopes },
    weekly: { score: myWeek, tier: tier?.key ?? null, next: next && { key: next.key, min: next.min, coins: next.coins }, unverifiedKm: week.unverifiedKm },
    rules: { overall: cfg.overall, tiers: cfg.rewards.tiers, weeklyTop: cfg.rewards.weeklyTop, monthlyTop: cfg.rewards.monthlyTop, improvementBonus: cfg.rewards.improvementBonus, minParticipants: cfg.minParticipantsForPodium, timezone: cfg.timezone, weekStartsOn: cfg.weekStartsOn, includeUnverifiedDistance: cfg.includeUnverifiedDistance },
  });
}, { rate: { limit: 120, windowMs: 60000 } });
