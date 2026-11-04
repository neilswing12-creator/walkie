import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { areFriends } from "@/lib/social";
import { notify } from "@/lib/notify";
import { dateKey } from "@/lib/dates";
import { displayName } from "@/lib/leaderboard/service";
/** Friendly encouragement — one cheer per friend per day. */
export const POST = handler(async ({ req, user }) => {
  const { userId } = await body(req, z.object({ userId: z.string().max(40) }));
  if (userId === user.id || !(await areFriends(user.id, userId))) throw new ApiError(403, "You can cheer on friends");
  try { await db.cheer.create({ data: { fromId: user.id, toId: userId, day: dateKey(new Date(), user.timezone) } }); }
  catch { throw new ApiError(409, "You already cheered them on today"); }
  const [me, them] = await Promise.all([db.user.findUnique({ where: { id: user.id }, include: { profile: true } }), db.profile.findUnique({ where: { userId } })]);
  if (them?.notifyCompetition !== false) await notify(userId, { type: "FRIEND", title: `${me ? displayName(me) : "A friend"} cheered you on! 📣`, body: "Keep it up — your pack is rooting for you.", link: "/app/leaderboard" });
  return ok({});
}, { rate: { limit: 30, windowMs: 3600000 } });
