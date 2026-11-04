import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/auth/crypto";
import { env } from "@/lib/env";
import { track } from "@/lib/analytics";

/** Opt-in public link. Route, name and details are each hidden unless the user chooses to show them. */
export const POST = handler<{ id: string }>(async ({ req, params, user }) => {
  const opts = await body(req, z.object({ route: z.boolean().default(false), name: z.boolean().default(false), details: z.boolean().default(true) }));
  const a = await db.activity.findFirst({ where: { id: params.id, userId: user.id, status: "COMPLETED" } });
  if (!a) throw new ApiError(404, "Activity not found");
  const shareId = a.shareId ?? randomToken(9);
  await db.activity.update({ where: { id: a.id }, data: { shareId, shareOptions: opts } });
  await track("activity_shared", user.id, { route: opts.route });
  const { evaluateAchievements } = await import("@/lib/achievements/engine");
  const unlocked = await evaluateAchievements(user.id);
  return ok({ url: `${env.appUrl}/s/${shareId}`, shareId, unlocked });
}, { rate: { limit: 30, windowMs: 3600000 } });

export const DELETE = handler<{ id: string }>(async ({ params, user }) => {
  await db.activity.updateMany({ where: { id: params.id, userId: user.id }, data: { shareId: null, shareOptions: undefined } });
  return ok({});
});
