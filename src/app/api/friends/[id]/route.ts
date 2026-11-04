import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";

export const PATCH = handler<{ id: string }>(async ({ req, params, user }) => {
  const { action } = await body(req, z.object({ action: z.enum(["accept", "decline", "block"]) }));
  const f = await db.friendship.findUnique({ where: { id: params.id } });
  if (!f || (f.addresseeId !== user.id && f.requesterId !== user.id)) throw new ApiError(404, "Request not found");
  if (action !== "block" && (f.addresseeId !== user.id || f.status !== "PENDING")) throw new ApiError(400, "Only the person who received the request can respond");
  if (action === "block") {
    // ensure the blocker is the requester so the block is attributable
    await db.friendship.update({ where: { id: f.id }, data: { status: "BLOCKED", requesterId: user.id, addresseeId: f.requesterId === user.id ? f.addresseeId : f.requesterId } });
  } else {
    await db.friendship.update({ where: { id: f.id }, data: { status: action === "accept" ? "ACCEPTED" : "DECLINED" } });
    if (action === "accept") { const { evaluateAchievements } = await import("@/lib/achievements/engine"); await Promise.all([evaluateAchievements(f.requesterId), evaluateAchievements(user.id)]); }
    if (action === "accept") await notify(f.requesterId, { type: "FRIEND", title: "Friend request accepted", body: `${user.name} accepted your request.`, link: "/app/friends" });
  }
  return ok({});
});

export const DELETE = handler<{ id: string }>(async ({ params, user }) => {
  const r = await db.friendship.deleteMany({ where: { id: params.id, OR: [{ requesterId: user.id }, { addresseeId: user.id }], NOT: { status: "BLOCKED", addresseeId: user.id } } });
  if (!r.count) throw new ApiError(404, "Not found");
  return ok({});
});
