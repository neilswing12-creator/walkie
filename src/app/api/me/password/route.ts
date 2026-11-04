import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { hashPassword, passwordProblems, verifyPassword } from "@/lib/auth/password";
import { getSessionContext } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

export const POST = handler(async ({ req, user }) => {
  const { current, next } = await body(req, z.object({ current: z.string().optional(), next: z.string() }));
  if (user.passwordHash && (!current || !(await verifyPassword(current, user.passwordHash)))) throw new ApiError(401, "Current password is incorrect");
  const p = passwordProblems(next);
  if (p) throw new ApiError(400, p);
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  // sign out every other device; keep this one
  const ctx = await getSessionContext();
  await db.session.deleteMany({ where: { userId: user.id, ...(ctx ? { NOT: { id: ctx.session.id } } : {}) } });
  await audit(user.id, "account.password_changed", "user", user.id).catch(() => {});
  await sendEmail(user.email, "Your Walkie password was changed", `<p>Your Walkie password was just changed and other devices were signed out.</p><p>If this wasn't you, reset your password right away and contact ${"support@walkie.run"}.</p>`, "Your Walkie password was just changed and other devices were signed out. If this wasn't you, reset your password right away.").catch(() => {});
  return ok({});
}, { rate: { limit: 5, windowMs: 3600000, key: "pw-change" } });
