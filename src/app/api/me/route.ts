import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { userContext } from "@/lib/context";
import { verifyPassword } from "@/lib/auth/password";
import { destroySession } from "@/lib/auth/session";
import { levelFromXp } from "@/lib/economy";
import { audit } from "@/lib/audit";

export const GET = handler(async ({ user }) => {
  const ctx = await userContext(user);
  const wallet = await db.wallet.findUnique({ where: { userId: user.id } });
  return ok({
    user: { id: user.id, email: user.email, name: user.name, username: user.username, avatarUrl: user.avatarUrl, role: user.role, status: user.status, emailVerified: !!user.emailVerified, timezone: user.timezone, hasPassword: !!user.passwordHash },
    profile: ctx.profile, plus: ctx.plus,
    wallet: wallet && { coins: wallet.coins, xp: wallet.xp, streakFreezes: wallet.streakFreezes, ...levelFromXp(wallet.xp) },
  });
}, { allowSuspended: true });

/** Account deletion: personal data is erased (cascade). Requires password or typed confirmation for OAuth-only accounts. */
export const DELETE = handler(async ({ req, user }) => {
  const { password, confirm } = await body(req, z.object({ password: z.string().optional(), confirm: z.string().optional() }));
  if (user.passwordHash) {
    if (!password || !(await verifyPassword(password, user.passwordHash))) throw new ApiError(401, "Password is incorrect", "invalid_credentials");
  } else if (confirm !== "DELETE") throw new ApiError(400, 'Type DELETE to confirm', "confirm_required");
  if (["ADMIN", "OWNER"].includes(user.role) && (await db.user.count({ where: { role: user.role, status: "ACTIVE" } })) <= 1) throw new ApiError(400, `You're the last ${user.role.toLowerCase()} — promote someone else first`);
  await audit(user.id, "account.delete_self", "user", user.id).catch(() => {});
  await destroySession();
  await db.user.delete({ where: { id: user.id } });
  return ok({});
}, { allowSuspended: true, rate: { limit: 5, windowMs: 3600000, key: "delete-account" } });
