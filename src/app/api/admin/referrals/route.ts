import { z } from "zod";
import { handler, ok, query } from "@/lib/api";
import { db } from "@/lib/db";
import { hasRole } from "@/lib/auth/session";

export const GET = handler(async ({ req, user }) => {
  const q = query(req, z.object({ status: z.string().max(30).optional() }));
  const [rows, byStatus, credits, top, activeTrials] = await Promise.all([
    db.referral.findMany({ where: q.status ? { status: q.status } : {}, orderBy: { updatedAt: "desc" }, take: 200, include: { referrer: { select: { id: true, name: true, email: true, createdAt: true } }, referee: { select: { id: true, name: true, email: true, createdAt: true, emailVerified: true } } } }),
    db.referral.groupBy({ by: ["status"], _count: true }),
    db.vipCredit.aggregate({ where: { source: { startsWith: "REFERRAL" }, status: "ACTIVE" }, _sum: { days: true }, _count: true }),
    db.referral.groupBy({ by: ["referrerId"], where: { status: "REWARD_GRANTED" }, _count: true, orderBy: { _count: { referrerId: "desc" } }, take: 10 }),
    db.vipCredit.findMany({ where: { status: "ACTIVE", startsAt: { lte: new Date() }, endsAt: { gt: new Date() } }, distinct: ["userId"], select: { userId: true } }),
  ]);
  const names = await db.user.findMany({ where: { id: { in: top.map((t) => t.referrerId) } }, select: { id: true, name: true } });
  const total = byStatus.reduce((t, s) => t + s._count, 0);
  const n = (s: string[]) => byStatus.filter((x) => s.includes(x.status)).reduce((t, x) => t + x._count, 0);
  const full = hasRole(user, "ADMIN"); // signal details are ADMIN-only; support staff see statuses
  return ok({
    analytics: { total, successful: n(["REWARD_GRANTED"]), pending: n(["PENDING", "REGISTERED", "VERIFICATION_REQUIRED", "QUALIFIED"]), review: n(["UNDER_REVIEW"]), suspicious: n(["SUSPICIOUS"]), rejected: n(["REJECTED"]), vipDays: credits._sum.days ?? 0, credits: credits._count, conversion: total ? n(["REWARD_GRANTED"]) / total : 0, fraudRate: total ? n(["REJECTED", "SUSPICIOUS"]) / total : 0, activeTrials: activeTrials.length,
      topReferrers: top.map((t) => ({ name: names.find((x) => x.id === t.referrerId)?.name ?? "?", count: t._count })) },
    rows: rows.map((r) => ({ id: r.id, status: r.status, riskScore: r.riskScore, reasons: full ? r.riskReasons : null, history: full ? r.history : null, appealText: r.appealText, appealAt: r.appealAt, createdAt: r.createdAt,
      referrer: { id: r.referrer.id, name: r.referrer.name, email: full ? r.referrer.email : r.referrer.email.replace(/^(.).*(@.*)$/, "$1•••$2") },
      referee: { id: r.referee.id, name: r.referee.name, email: full ? r.referee.email : r.referee.email.replace(/^(.).*(@.*)$/, "$1•••$2"), createdAt: r.referee.createdAt, verified: !!r.referee.emailVerified } })),
  });
}, { role: "MODERATOR" });
