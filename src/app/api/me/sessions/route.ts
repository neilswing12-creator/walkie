import { handler, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { getSessionContext } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
/** Active sign-ins (device hint + dates only — token hashes never leave the server). */
export const GET = handler(async ({ user }) => {
  const cur = await getSessionContext();
  const rows = await db.session.findMany({ where: { userId: user.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, select: { id: true, userAgent: true, createdAt: true, expiresAt: true } });
  return ok(rows.map((r) => ({ ...r, current: r.id === cur?.session.id })));
}, { allowSuspended: true });
/** Sign out every other device. */
export const DELETE = handler(async ({ user }) => {
  const cur = await getSessionContext();
  const r = await db.session.deleteMany({ where: { userId: user.id, ...(cur ? { NOT: { id: cur.session.id } } : {}) } });
  await audit(user.id, "account.sessions_revoked", "user", user.id, { count: r.count }).catch(() => {});
  return ok({ revoked: r.count });
}, { allowSuspended: true, rate: { limit: 10, windowMs: 3600000 } });
