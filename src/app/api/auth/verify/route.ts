import { z } from "zod";
import { publicHandler, body, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { consumeToken } from "@/lib/auth/account";
import { processReferral } from "@/lib/referrals/service";
import { recordSignal } from "@/lib/referrals/signals";

export const POST = publicHandler(async ({ req }) => {
  const { token } = await body(req, z.object({ token: z.string().min(10) }));
  const userId = await consumeToken(token, "EMAIL_VERIFY");
  if (!userId) throw new ApiError(400, "This verification link is invalid or has expired", "invalid_token");
  await db.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
  await recordSignal("VERIFY", userId).catch(() => {});
  await processReferral(userId).catch((e) => console.error("[referral]", e?.message));
  return ok({});
}, { rate: { limit: 20, windowMs: 3600000, key: "verify" } });
