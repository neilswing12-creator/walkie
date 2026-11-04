import { z } from "zod";
import { handler, ok, query } from "@/lib/api";
import { db } from "@/lib/db";
import { ACTIVITY_META, type ActivityType } from "@/lib/constants";

/** Totals per sport for an arbitrary range (defaults to last 7 days). */
export const GET = handler(async ({ req, user }) => {
  const q = query(req, z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }));
  const to = q.to ?? new Date(), from = q.from ?? new Date(to.getTime() - 7 * 86400000);
  const rows = await db.activity.groupBy({ by: ["type"], where: { userId: user.id, status: "COMPLETED", startedAt: { gte: from, lte: to } }, _sum: { distanceM: true, durationSec: true, points: true, calories: true }, _count: true });
  const fam: Record<string, { count: number; distanceM: number; durationSec: number; points: number; calories: number }> = {};
  for (const r of rows) {
    const f = ACTIVITY_META[r.type as ActivityType]?.family ?? "other";
    fam[f] ??= { count: 0, distanceM: 0, durationSec: 0, points: 0, calories: 0 };
    fam[f].count += r._count; fam[f].distanceM += r._sum.distanceM ?? 0; fam[f].durationSec += r._sum.durationSec ?? 0; fam[f].points += r._sum.points ?? 0; fam[f].calories += r._sum.calories ?? 0;
  }
  return ok({ from, to, byFamily: fam });
});
