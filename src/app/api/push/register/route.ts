import { z } from "zod";
import { handler, ok, body } from "@/lib/api";
import { db } from "@/lib/db";
/** Called by the native app after the user grants push permission. */
export const POST = handler(async ({ req, user }) => {
  const { token, platform } = await body(req, z.object({ token: z.string().min(20).max(4096), platform: z.enum(["ios", "android", "web"]) }));
  await db.pushToken.upsert({ where: { token }, create: { token, platform, userId: user.id }, update: { userId: user.id, platform } });
  await db.profile.update({ where: { userId: user.id }, data: { notifyPush: true } });
  return ok({});
});
