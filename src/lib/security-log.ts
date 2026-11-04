import "server-only";
import { db } from "./db";
import { currentIpHash } from "./referrals/signals";

/** Records a security-relevant event (hashed IP only). Best-effort: monitoring must never break the request. */
export async function securityEvent(kind: string, userId?: string | null, meta?: Record<string, string | number | boolean | null>) {
  try { await db.securityEvent.create({ data: { kind, userId: userId ?? null, ipHash: await currentIpHash().catch(() => null), meta: meta ?? undefined } }); } catch { /* ignore */ }
}

/** Retention: expired sessions/tokens and old security events are deleted (called from the hourly cron). */
export async function purgeExpired() {
  const now = new Date();
  const [s, t, e] = await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.verificationToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date(now.getTime() - 7 * 86400000) } }, { usedAt: { lt: new Date(now.getTime() - 7 * 86400000) } }] } }),
    db.securityEvent.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 180 * 86400000) } } }),
  ]);
  return { sessions: s.count, tokens: t.count, securityEvents: e.count };
}
