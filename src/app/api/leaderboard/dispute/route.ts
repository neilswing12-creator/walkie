import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
export const POST = handler(async ({ req, user }) => {
  const b = await body(req, z.object({ text: z.string().trim().min(10).max(1000), disqualificationId: z.string().max(40).optional(), period: z.string().max(20).optional() }));
  if (b.disqualificationId && !(await db.leaderboardDisqualification.findFirst({ where: { id: b.disqualificationId, userId: user.id } }))) throw new ApiError(404, "Not found");
  if (await db.leaderboardDispute.count({ where: { userId: user.id, status: "OPEN" } }) >= 3) throw new ApiError(429, "You have open reviews already — we'll get back to you");
  await db.leaderboardDispute.create({ data: { userId: user.id, text: b.text, disqualificationId: b.disqualificationId, period: b.period } });
  return ok({ message: "Thanks — a person will review this." });
}, { rate: { limit: 5, windowMs: 86400000 } });
