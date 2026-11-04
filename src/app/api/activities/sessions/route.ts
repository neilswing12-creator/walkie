import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { getActivityConfig } from "@/lib/game/activity-types";

const goal = z.object({ kind: z.enum(["FREE", "DISTANCE", "DURATION", "CALORIES"]), value: z.number().min(0).max(1000000).optional() }).optional();

/** Start: the server records the authoritative start time. Any older open session is abandoned. */
export const POST = handler(async ({ req, user }) => {
  const { type, goal: g } = await body(req, z.object({ type: z.enum(ACTIVITY_TYPES), goal }));
  const cfg = await getActivityConfig(type);
  if (!cfg.enabled) throw new ApiError(400, `${cfg.name} is currently unavailable`);
  await db.activitySession.updateMany({ where: { userId: user.id, status: { in: ["ACTIVE", "PAUSED"] } }, data: { status: "ABANDONED", finishedAt: new Date() } });
  const s = await db.activitySession.create({ data: { userId: user.id, type, goal: g ?? undefined } });
  return ok({ id: s.id, startedAt: s.startedAt });
}, { rate: { limit: 30, windowMs: 3600000, key: "session-start" } });

export const GET = handler(async ({ user }) => ok(await db.activitySession.findFirst({ where: { userId: user.id, status: { in: ["ACTIVE", "PAUSED"] } }, orderBy: { startedAt: "desc" } })));
