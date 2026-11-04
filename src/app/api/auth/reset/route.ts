import { z } from "zod";
import { publicHandler, body, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { consumeToken } from "@/lib/auth/account";
import { hashPassword, passwordProblems } from "@/lib/auth/password";

export const POST = publicHandler(async ({ req }) => {
  const { token, password } = await body(req, z.object({ token: z.string().min(10), password: z.string() }));
  const problem = passwordProblems(password);
  if (problem) throw new ApiError(400, problem, "weak_password");
  const userId = await consumeToken(token, "PASSWORD_RESET");
  if (!userId) throw new ApiError(400, "This reset link is invalid or has expired", "invalid_token");
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password), emailVerified: new Date() } });
  await db.session.deleteMany({ where: { userId } }); // sign out everywhere
  return ok({});
}, { rate: { limit: 10, windowMs: 3600000, key: "reset" } });
