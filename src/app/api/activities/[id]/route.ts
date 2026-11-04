import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { deleteActivity } from "@/lib/game/activity";
import { userContext } from "@/lib/context";

export const GET = handler<{ id: string }>(async ({ params, user }) => {
  const a = await db.activity.findFirst({ where: { id: params.id, userId: user.id, status: { not: "DELETED" } }, include: { route: true } });
  if (!a) throw new ApiError(404, "Activity not found");
  return ok(a);
}, { allowSuspended: true });

export const PATCH = handler<{ id: string }>(async ({ req, params, user }) => {
  const data = await body(req, z.object({ title: z.string().trim().max(80).nullable().optional(), note: z.string().max(500).nullable().optional() }));
  const r = await db.activity.updateMany({ where: { id: params.id, userId: user.id, status: { not: "DELETED" } }, data });
  if (!r.count) throw new ApiError(404, "Activity not found");
  return ok(data);
});

/** Soft-delete + reward reversal (see deleteActivity). */
export const DELETE = handler<{ id: string }>(async ({ params, user }) => {
  const ctx = await userContext(user);
  const a = await db.activity.findFirst({ where: { id: params.id, userId: user.id }, select: { startedAt: true } });
  const r = await deleteActivity(user.id, params.id, ctx.tz, ctx.goals);
  if (a) await (await import("@/lib/leaderboard/service")).touchLeaderboard(user.id, [a.startedAt]); // deleted activities leave the boards
  return ok(r);
});
