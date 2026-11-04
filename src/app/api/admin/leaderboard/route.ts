import { z } from "zod";
import { handler, ok, query, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { lbSettings, periodKey, refreshUserScores, settlePeriod, displayName } from "@/lib/leaderboard/service";
import { dateKey } from "@/lib/dates";

/** Integrity console: top scores with review flags, disqualifications, disputes, settlement. */
export const GET = handler(async ({ req }) => {
  const q = query(req, z.object({ period: z.enum(["day", "week", "month", "all"]).default("week"), board: z.enum(["overall", "walk", "run", "bike", "steps"]).default("overall"), flagged: z.enum(["1", "0"]).optional() }));
  const cfg = await lbSettings();
  const period = periodKey(q.period, dateKey(new Date(), cfg.timezone), cfg);
  const [rows, optedIn, participants, disq, disputes, results, duels, cheers] = await Promise.all([
    db.leaderboardScore.findMany({ where: { period, board: q.board, value: { gt: 0 } }, orderBy: { value: "desc" }, take: 100, include: { user: { select: { id: true, name: true, email: true, status: true, profile: { select: { publicName: true, leaderboardOptIn: true, country: true } }, lbDisq: { where: { liftedAt: null }, select: { id: true, period: true, reason: true } } } } } }),
    db.profile.count({ where: { leaderboardOptIn: true } }),
    db.leaderboardScore.count({ where: { period, board: "overall", value: { gt: 0 } } }),
    db.leaderboardDisqualification.findMany({ where: { liftedAt: null }, orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true, email: true } } } }),
    db.leaderboardDispute.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "asc" }, take: 50, include: { user: { select: { name: true, email: true } } } }),
    db.leaderboardResult.groupBy({ by: ["period"], _count: true, _sum: { rewardCoins: true }, orderBy: { period: "desc" }, take: 8 }),
    db.duel.groupBy({ by: ["status"], _count: true }),
    db.cheer.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
  ]);
  const list = rows.filter((r) => q.flagged !== "1" || (Array.isArray(r.flags) && r.flags.length) || r.user.lbDisq.length);
  return ok({
    period, analytics: { optedIn, participants, flagged: rows.filter((r) => Array.isArray(r.flags) && r.flags.length).length, disqualified: disq.length, openDisputes: disputes.length, cheers7d: cheers, duels: Object.fromEntries(duels.map((d) => [d.status, d._count])), settled: results.map((r) => ({ period: r.period, users: r._count, coins: r._sum.rewardCoins ?? 0 })) },
    rows: list.map((r, i) => ({ rank: i + 1, userId: r.user.id, name: displayName(r.user), email: r.user.email, public: !!r.user.profile?.leaderboardOptIn, country: r.user.profile?.country, score: r.value, flags: r.flags ?? [], disqualified: r.user.lbDisq.find((d) => !d.period || d.period === period) ?? null })),
    disqualifications: disq.map((d) => ({ id: d.id, user: d.user.name, email: d.user.email, period: d.period, reason: d.reason, createdAt: d.createdAt })),
    disputes: disputes.map((d) => ({ id: d.id, user: d.user.name, email: d.user.email, text: d.text, period: d.period, disqualificationId: d.disqualificationId, createdAt: d.createdAt })),
  });
}, { role: "MODERATOR" });

const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("disqualify"), userId: z.string(), period: z.string().max(20).nullable(), reason: z.string().trim().min(3).max(300) }),
  z.object({ action: z.literal("lift"), id: z.string(), note: z.string().max(300).optional() }),
  z.object({ action: z.literal("recompute"), userId: z.string() }),
  z.object({ action: z.literal("settle"), period: z.string().regex(/^[WM]:\d{4}-\d{2}(-\d{2})?$/) }),
  z.object({ action: z.literal("resolveDispute"), id: z.string(), accept: z.boolean(), response: z.string().trim().min(3).max(500) }),
]);
export const POST = handler(async ({ req, user }) => {
  const a = await body(req, action);
  if (a.action === "disqualify") {
    const d = await db.leaderboardDisqualification.create({ data: { userId: a.userId, period: a.period, reason: a.reason, adminId: user.id } });
    await notify(a.userId, { type: "SYSTEM", title: "Leaderboard review", body: "One of your leaderboard entries is on hold after a review. Your activities and rewards are unaffected — you can ask for a second look from the leaderboard.", link: "/app/leaderboard" });
    await audit(user.id, "leaderboard.disqualify", "user", a.userId, { period: a.period, reason: a.reason });
    return ok(d);
  }
  if (a.action === "lift") {
    const d = await db.leaderboardDisqualification.update({ where: { id: a.id }, data: { liftedAt: new Date() } });
    await audit(user.id, "leaderboard.lift", "user", d.userId, { id: a.id, note: a.note });
    return ok(d);
  }
  if (a.action === "recompute") { await refreshUserScores(a.userId); await audit(user.id, "leaderboard.recompute", "user", a.userId, {}); return ok({}); }
  if (a.action === "settle") {
    try { const r = await settlePeriod(a.period); await audit(user.id, "leaderboard.settle", "period", a.period, r); return ok(r); }
    catch (e: any) { throw new ApiError(400, e.message); }
  }
  const disp = await db.leaderboardDispute.findUnique({ where: { id: a.id } });
  if (!disp || disp.status !== "OPEN") throw new ApiError(404, "Dispute not found");
  await db.leaderboardDispute.update({ where: { id: a.id }, data: { status: a.accept ? "ACCEPTED" : "REJECTED", response: a.response, resolvedBy: user.id, resolvedAt: new Date() } });
  if (a.accept && disp.disqualificationId) await db.leaderboardDisqualification.update({ where: { id: disp.disqualificationId }, data: { liftedAt: new Date() } });
  await notify(disp.userId, { type: "SYSTEM", title: a.accept ? "Review accepted — you're back on the boards" : "Leaderboard review completed", body: a.response, link: "/app/leaderboard" });
  await audit(user.id, "leaderboard.dispute", "dispute", a.id, { accept: a.accept });
  return ok({});
}, { role: "ADMIN" });
