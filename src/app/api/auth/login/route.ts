import { z } from "zod";
import { publicHandler, body, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { securityEvent } from "@/lib/security-log";
import { track } from "@/lib/analytics";
import { recordSignal, registerDevice } from "@/lib/referrals/signals";

const schema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(200) });
const DUMMY = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5x8b5ZJm0h8cH7V0GQyQ1a9x9x9x9xu";

export const POST = publicHandler(async ({ req, ip }) => {
  const { email, password } = await body(req, schema);
  const lim = rateLimit(`login:${email.toLowerCase()}`, 8, 15 * 60000);
  if (!lim.ok) { await securityEvent("auth.login_throttled"); throw new ApiError(429, "Too many attempts. Try again in a few minutes.", "rate_limited"); }
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY); // constant-ish time
  if (!user || !user.passwordHash || !valid) { await securityEvent("auth.login_failed", user?.id ?? null, { knownAccount: !!user }); throw new ApiError(401, "Email or password is incorrect", "invalid_credentials"); }
  if (user.status === "BANNED") throw new ApiError(403, "This account has been banned. Contact support if you think this is a mistake.", "banned");
  if (user.status === "DELETED") throw new ApiError(401, "Email or password is incorrect", "invalid_credentials");
  await createSession(user.id);
  await Promise.all([recordSignal("LOGIN", user.id), registerDevice(user.id)]).catch(() => {});
  await track("login", user.id, { method: "password" });
  void ip;
  return ok({ id: user.id, role: user.role });
}, { rate: { limit: 30, windowMs: 15 * 60000, key: "login-ip" } });
