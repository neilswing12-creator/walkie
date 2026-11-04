import "server-only";
import { db } from "../db";
import { ApiError } from "../api-error";
import { areFriends } from "../social";
import { grant } from "../ledger";
import { notify } from "../notify";
import { dateKey } from "../dates";
import { ACTIVITY_META, type ActivityType } from "../constants";
import { lbSettings, displayName } from "./service";

export const DUEL_METRICS = ["STEPS", "WALK", "RUN", "BIKE", "POINTS"] as const;
export type DuelMetric = (typeof DUEL_METRICS)[number];
export const DUEL_LABEL: Record<DuelMetric, string> = { STEPS: "steps", WALK: "km walked", RUN: "km run", BIKE: "km ridden", POINTS: "activity points" };

/** Server-side progress inside the duel window — verified activities and platform step syncs only. */
export async function duelProgress(userId: string, metric: string, from: Date, to: Date) {
  if (metric === "STEPS") {
    const cfg = await lbSettings();
    const a = dateKey(from, cfg.timezone), b = dateKey(to, cfg.timezone);
    const rows = await db.dailySummary.findMany({ where: { userId, date: { gte: a, lte: b }, stepsSource: { not: null } }, select: { steps: true } });
    return rows.reduce((t, r) => t + r.steps, 0);
  }
  const acts = await db.activity.findMany({ where: { userId, status: "COMPLETED", startedAt: { gte: from, lt: to } }, select: { type: true, distanceM: true, points: true, source: true } });
  if (metric === "POINTS") return acts.reduce((t, a) => t + a.points, 0);
  const fam = metric === "WALK" ? "walk" : metric === "RUN" ? "run" : "bike";
  return Math.round(acts.filter((a) => a.source !== "MANUAL" && ACTIVITY_META[a.type as ActivityType]?.family === fam).reduce((t, a) => t + a.distanceM, 0) / 10) / 100;
}

export async function createDuel(userId: string, opponentId: string, metric: DuelMetric, days: number) {
  if (opponentId === userId) throw new ApiError(400, "Challenge a friend, not yourself!");
  if (!(await areFriends(userId, opponentId))) throw new ApiError(403, "You can only challenge friends");
  const cfg = await lbSettings();
  const active = await db.duel.count({ where: { status: { in: ["PENDING", "ACTIVE"] }, OR: [{ challengerId: userId }, { opponentId: userId }] } });
  if (active >= cfg.duel.maxActive) throw new ApiError(400, `You already have ${active} friendly challenges going`);
  const dupe = await db.duel.findFirst({ where: { status: { in: ["PENDING", "ACTIVE"] }, OR: [{ challengerId: userId, opponentId }, { challengerId: opponentId, opponentId: userId }] } });
  if (dupe) throw new ApiError(409, "You already have a challenge with this friend");
  const d = await db.duel.create({ data: { challengerId: userId, opponentId, metric, days } });
  const me = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
  await notify(opponentId, { type: "CHALLENGE", title: `${me ? displayName(me) : "A friend"} challenged you!`, body: `Most ${DUEL_LABEL[metric]} in ${days} day${days > 1 ? "s" : ""}. Accept to start.`, link: "/app/leaderboard?tab=friends" });
  return d;
}

export async function respondDuel(userId: string, id: string, action: "accept" | "decline" | "cancel") {
  const d = await db.duel.findUnique({ where: { id } });
  if (!d || (d.challengerId !== userId && d.opponentId !== userId)) throw new ApiError(404, "Challenge not found");
  if (action === "cancel") {
    if (d.challengerId !== userId || d.status !== "PENDING") throw new ApiError(400, "Only pending challenges you sent can be cancelled");
    return db.duel.update({ where: { id }, data: { status: "CANCELLED" } });
  }
  if (d.opponentId !== userId || d.status !== "PENDING") throw new ApiError(400, "This challenge isn't waiting for you");
  if (action === "decline") return db.duel.update({ where: { id }, data: { status: "DECLINED" } });
  const now = new Date();
  const r = await db.duel.updateMany({ where: { id, status: "PENDING" }, data: { status: "ACTIVE", startsAt: now, endsAt: new Date(now.getTime() + d.days * 86400000) } });
  if (r.count) await notify(d.challengerId, { type: "CHALLENGE", title: "Challenge accepted!", body: "Game on — may the best walker win 🐾", link: "/app/leaderboard?tab=friends" });
  return db.duel.findUnique({ where: { id } });
}

export async function listDuels(userId: string) {
  await settleDuels();
  const rows = await db.duel.findMany({ where: { OR: [{ challengerId: userId }, { opponentId: userId }], status: { in: ["PENDING", "ACTIVE", "DONE"] } }, orderBy: { createdAt: "desc" }, take: 20, include: { challenger: { include: { profile: true } }, opponent: { include: { profile: true } } } });
  return Promise.all(rows.map(async (d) => {
    const live = d.status === "ACTIVE" || d.status === "DONE";
    const [a, b] = live ? await Promise.all([duelProgress(d.challengerId, d.metric, d.startsAt!, d.endsAt!), duelProgress(d.opponentId, d.metric, d.startsAt!, d.endsAt!)]) : [0, 0];
    const meFirst = d.challengerId === userId;
    return { id: d.id, metric: d.metric, label: DUEL_LABEL[d.metric as DuelMetric], days: d.days, status: d.status, endsAt: d.endsAt, incoming: d.status === "PENDING" && d.opponentId === userId,
      me: { score: meFirst ? a : b }, friend: { id: meFirst ? d.opponentId : d.challengerId, name: displayName(meFirst ? d.opponent : d.challenger), score: meFirst ? b : a },
      result: d.status === "DONE" ? (d.winnerId === userId ? "won" : d.winnerId ? "lost" : "tie") : null };
  }));
}

/** Finishes expired duels: participation coins for both, a bonus for the winner. Idempotent via ledger keys. */
export async function settleDuels() {
  const cfg = await lbSettings();
  const due = await db.duel.findMany({ where: { status: "ACTIVE", endsAt: { lt: new Date() } }, take: 100 });
  for (const d of due) {
    const [a, b] = await Promise.all([duelProgress(d.challengerId, d.metric, d.startsAt!, d.endsAt!), duelProgress(d.opponentId, d.metric, d.startsAt!, d.endsAt!)]);
    const winnerId = a === b ? null : a > b ? d.challengerId : d.opponentId;
    const moved = await db.duel.updateMany({ where: { id: d.id, status: "ACTIVE" }, data: { status: "DONE", winnerId } });
    if (!moved.count) continue;
    await db.$transaction(async (tx) => {
      for (const uid of [d.challengerId, d.opponentId]) {
        const coins = (a + b > 0 ? cfg.duel.participationCoins : 0) + (uid === winnerId ? cfg.duel.winnerCoins : 0);
        if (coins) await grant(tx, uid, { coins, xp: coins, reason: "DUEL", key: `duel:${d.id}:${uid}`, refType: "duel", refId: d.id });
      }
    });
    for (const uid of [d.challengerId, d.opponentId]) await notify(uid, { type: "CHALLENGE", title: winnerId === uid ? "You won the friendly challenge! 🏆" : winnerId ? "Challenge finished — great effort!" : "It's a tie!", body: `${a + b > 0 ? "Coins added for taking part." : ""}`, link: "/app/leaderboard?tab=friends" });
  }
  return due.length;
}
