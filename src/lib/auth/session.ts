import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "../db";
import { randomToken, sha256 } from "./crypto";
import { REAUTH_WINDOW_MIN, ROLE_RANK, SESSION_COOKIE, STAFF_SESSION_HOURS, type Role } from "../constants";
import { env } from "../env";

const SESSION_DAYS = 30;

export async function createSession(userId: string) {
  const token = randomToken(32);
  const h = await headers();
  await db.session.create({
    data: { userId, tokenHash: sha256(token), userAgent: h.get("user-agent")?.slice(0, 200), expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000) },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: env.isProd, sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86400 });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

async function readToken(): Promise<string | undefined> {
  const h = await headers();
  const auth = h.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7); // native clients
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export const getSessionContext = cache(async () => {
  const token = await readToken();
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  const u = session.user;
  if (u.status === "BANNED" || u.status === "DELETED") return null;
  return { session, user: u };
});

/** Staff sessions older than STAFF_SESSION_HOURS must sign in again before using admin tools. */
export function staffSessionStale(sess: { createdAt: Date }) {
  return Date.now() - sess.createdAt.getTime() > STAFF_SESSION_HOURS * 3600000;
}

/** Step-up check for sensitive actions: the actor's password, or (password-less OAuth staff) a sign-in within REAUTH_WINDOW_MIN. */
export async function requireReauth(user: { passwordHash: string | null }, password: string | undefined) {
  const ctx = await getSessionContext();
  if (user.passwordHash) {
    const { verifyPassword } = await import("./password");
    if (!password || !(await verifyPassword(password, user.passwordHash))) throw new (await import("../api-error")).ApiError(401, "Confirm your password to do this", "reauth_required");
  } else if (!ctx || Date.now() - ctx.session.createdAt.getTime() > REAUTH_WINDOW_MIN * 60000) {
    throw new (await import("../api-error")).ApiError(401, "Please sign in again to do this", "reauth_required");
  }
}

export const getCurrentUser = cache(async () => {
  const c = await getSessionContext();
  if (!c) return null;
  const u = c.user;
  // throttle lastActiveAt writes to once per 10 minutes
  if (!u.lastActiveAt || Date.now() - u.lastActiveAt.getTime() > 600000) {
    await db.user.update({ where: { id: u.id }, data: { lastActiveAt: new Date() } }).catch(() => {});
  }
  return u;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function hasRole(user: { role: string } | null | undefined, min: Role) {
  if (!user) return false;
  return (ROLE_RANK[user.role as Role] ?? 0) >= ROLE_RANK[min];
}
