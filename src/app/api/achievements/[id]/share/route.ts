import { handler, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/auth/crypto";
import { env } from "@/lib/env";
import { track } from "@/lib/analytics";
/** Public achievement link. Contains badge + first name + unlock date only — never activity routes or health data. */
export const POST = handler<{ id: string }>(async ({ params, user }) => {
  const ua = await db.userAchievement.findUnique({ where: { userId_achievementId: { userId: user.id, achievementId: params.id } } });
  if (!ua) throw new ApiError(404, "You haven't earned this badge yet");
  const shareId = ua.shareId ?? randomToken(9);
  if (!ua.shareId) await db.userAchievement.update({ where: { id: ua.id }, data: { shareId } });
  await track("badge_shared", user.id, {});
  return ok({ url: `${env.appUrl}/b/${shareId}` });
}, { rate: { limit: 30, windowMs: 3600000 } });
export const DELETE = handler<{ id: string }>(async ({ params, user }) => {
  await db.userAchievement.updateMany({ where: { userId: user.id, achievementId: params.id }, data: { shareId: null } });
  return ok({});
});
