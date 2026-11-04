import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";

/** Pause / resume / abandon. Paused time is accumulated server-side and never earns points. */
export const PATCH = handler<{ id: string }>(async ({ req, params, user }) => {
  const { action } = await body(req, z.object({ action: z.enum(["pause", "resume", "abandon"]) }));
  const s = await db.activitySession.findFirst({ where: { id: params.id, userId: user.id } });
  if (!s) throw new ApiError(404, "Session not found");
  if (s.status === "FINISHED" || s.status === "ABANDONED") throw new ApiError(409, "Session already ended");
  const now = new Date();
  if (action === "pause") {
    if (s.status === "PAUSED") return ok({ status: s.status, pausedMs: s.pausedMs });
    await db.activitySession.updateMany({ where: { id: s.id, status: "ACTIVE" }, data: { status: "PAUSED", pausedAt: now } });
  } else if (action === "resume") {
    if (s.status === "ACTIVE") return ok({ status: s.status, pausedMs: s.pausedMs });
    const extra = s.pausedAt ? now.getTime() - s.pausedAt.getTime() : 0;
    await db.activitySession.updateMany({ where: { id: s.id, status: "PAUSED" }, data: { status: "ACTIVE", pausedAt: null, pausedMs: { increment: extra } } });
  } else {
    await db.activitySession.update({ where: { id: s.id }, data: { status: "ABANDONED", finishedAt: now } });
  }
  const r = await db.activitySession.findUniqueOrThrow({ where: { id: s.id } });
  return ok({ status: r.status, pausedMs: r.pausedMs });
}, { rate: { limit: 240, windowMs: 3600000, key: "session-patch" } });
