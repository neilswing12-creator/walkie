import "server-only";
/**
 * Leaderboards — every score is computed here from server records (activities that passed plausibility checks,
 * platform-verified step syncs, and mission ledger entries). Clients can never write a score.
 * Scores are materialised per user × period × board so ranking is one indexed query even with many users.
 */
import { db } from "../db";
import type { Prisma } from "@prisma/client";
import { getSetting } from "../settings";
import { addDays, dateKey } from "../dates";
import { ACTIVITY_META, type ActivityType } from "../constants";
import { friendIds } from "../social";
import { grant, addInventory } from "../ledger";
import { notify } from "../notify";
import { LEADERBOARD_DEFAULTS, type Board, type LeaderboardSettings, type PeriodKind } from "./settings";

const BOARDS: Board[] = ["overall", "walk", "run", "bike", "steps"];

export async function lbSettings(): Promise<LeaderboardSettings> {
  const s = (await getSetting("leaderboard")) as Partial<LeaderboardSettings>;
  const d = LEADERBOARD_DEFAULTS;
  return { ...d, ...s, overall: { ...d.overall, ...(s.overall ?? {}) }, rewards: { ...d.rewards, ...(s.rewards ?? {}) }, suspicious: { ...d.suspicious, ...(s.suspicious ?? {}) }, duel: { ...d.duel, ...(s.duel ?? {}) } };
}

/* ── periods ──────────────────────────────────────────────────── */
export function weekStart(day: string, startsOn: 0 | 1) {
  const [y, m, d] = day.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(day, -((dow - startsOn + 7) % 7));
}
export function periodKey(kind: PeriodKind, day: string, cfg: Pick<LeaderboardSettings, "weekStartsOn">) {
  return kind === "day" ? `D:${day}` : kind === "week" ? `W:${weekStart(day, cfg.weekStartsOn)}` : kind === "month" ? `M:${day.slice(0, 7)}` : "A";
}
/** Inclusive date-key range of a period key (null bounds = all time). */
export function periodRange(key: string): [string | null, string | null] {
  if (key === "A") return [null, null];
  const [k, v] = key.split(":");
  if (k === "D") return [v, v];
  if (k === "W") return [v, addDays(v, 6)];
  const [y, m] = v.split("-").map(Number);
  return [`${v}-01`, new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)];
}
export function previousPeriod(kind: "week" | "month", day: string, cfg: LeaderboardSettings) {
  if (kind === "week") return periodKey("week", addDays(weekStart(day, cfg.weekStartsOn), -7), cfg);
  const [y, m] = day.split("-").map(Number);
  return `M:${new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7)}`;
}

/* ── scoring ──────────────────────────────────────────────────── */
type Day = { points: number; walkM: number; runM: number; bikeM: number; steps: number; missions: number; unverifiedM: number; flagged: number };
const emptyDay = (): Day => ({ points: 0, walkM: 0, runM: 0, bikeM: 0, steps: 0, missions: 0, unverifiedM: 0, flagged: 0 });

async function userDays(userId: string, cfg: LeaderboardSettings) {
  const [acts, summaries, missions] = await Promise.all([
    db.activity.findMany({ where: { userId, status: { in: ["COMPLETED", "FLAGGED"] }, deletedAt: null }, select: { type: true, distanceM: true, points: true, startedAt: true, source: true, status: true } }),
    db.dailySummary.findMany({ where: { userId, steps: { gt: 0 }, stepsSource: { not: null } }, select: { date: true, steps: true } }),
    db.ledgerEntry.findMany({ where: { userId, reason: "MISSION" }, select: { createdAt: true } }),
  ]);
  const days = new Map<string, Day>();
  const at = (k: string) => { let d = days.get(k); if (!d) { d = emptyDay(); days.set(k, d); } return d; };
  for (const a of acts) {
    const d = at(dateKey(a.startedAt, cfg.timezone));
    if (a.status === "FLAGGED") { d.flagged++; continue; } // failed plausibility → never ranked
    const verified = a.source !== "MANUAL";
    if (verified || cfg.countIndoorPoints) d.points += a.points;
    const fam = ACTIVITY_META[a.type as ActivityType]?.family;
    if (!verified && !cfg.includeUnverifiedDistance) { d.unverifiedM += a.distanceM; continue; }
    if (fam === "walk") d.walkM += a.distanceM; else if (fam === "run") d.runM += a.distanceM; else if (fam === "bike") d.bikeM += a.distanceM;
  }
  for (const s of summaries) at(s.date).steps += s.steps; // HealthKit / Health Connect only (platform-verified)
  for (const m of missions) at(dateKey(m.createdAt, cfg.timezone)).missions++;
  return days;
}

function scorePeriod(days: Map<string, Day>, range: [string | null, string | null], cfg: LeaderboardSettings) {
  const v: Record<Board, number> = { overall: 0, walk: 0, run: 0, bike: 0, steps: 0 };
  let capDays = 0, unverifiedM = 0, flagged = 0;
  for (const [k, d] of days) {
    if ((range[0] && k < range[0]) || (range[1] && k > range[1])) continue;
    const raw = d.points * cfg.overall.pointsWeight + Math.floor(d.steps / 1000) * cfg.overall.stepsPer1000 + d.missions * cfg.overall.missionWeight;
    if (raw >= cfg.overall.dailyCap) capDays++;
    v.overall += Math.min(cfg.overall.dailyCap, raw);
    v.walk += d.walkM / 1000; v.run += d.runM / 1000; v.bike += d.bikeM / 1000; v.steps += d.steps;
    unverifiedM += d.unverifiedM; flagged += d.flagged;
  }
  const flags: string[] = [];
  if (capDays >= cfg.suspicious.capDaysPerWeek) flags.push(`DAILY_CAP_HIT_${capDays}x`);
  if (flagged) flags.push(`FLAGGED_ACTIVITIES_${flagged}`);
  if (unverifiedM > 0) flags.push("UNVERIFIED_DISTANCE_EXCLUDED");
  for (const b of BOARDS) v[b] = Math.round(v[b] * (b === "steps" || b === "overall" ? 1 : 100)) / (b === "steps" || b === "overall" ? 1 : 100);
  return { values: v, flags, unverifiedKm: Math.round(unverifiedM / 100) / 10 };
}

/** Recompute a user's scores for the periods containing `days` (default: today) plus all-time. Idempotent. */
export async function refreshUserScores(userId: string, touched: (string | Date)[] = [new Date()]) {
  const cfg = await lbSettings();
  const days = await userDays(userId, cfg);
  const keys = new Set<string>(["A"]);
  for (const t of touched) {
    const day = typeof t === "string" ? t : dateKey(t, cfg.timezone);
    for (const kind of ["day", "week", "month"] as PeriodKind[]) keys.add(periodKey(kind, day, cfg));
  }
  for (const period of keys) {
    const { values, flags } = scorePeriod(days, periodRange(period), cfg);
    for (const board of BOARDS) {
      await db.leaderboardScore.upsert({ where: { userId_period_board: { userId, period, board } }, create: { userId, period, board, value: values[board], flags: board === "overall" ? flags : undefined }, update: { value: values[board], ...(board === "overall" ? { flags } : {}) } });
    }
  }
}
/** Fire-and-forget hook used after activity/health/mission writes. */
export const touchLeaderboard = (userId: string, at: (string | Date)[] = [new Date()]) => refreshUserScores(userId, at).catch((e) => console.error("[leaderboard] refresh failed", e?.message));

export async function personalSummary(userId: string, period: string) {
  const cfg = await lbSettings();
  return scorePeriod(await userDays(userId, cfg), periodRange(period), cfg);
}

/* ── boards ───────────────────────────────────────────────────── */
export type Scope = "friends" | "global" | "country" | "community";
const normCommunity = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
export const displayName = (u: { name: string; profile?: { publicName: string | null } | null }) => u.profile?.publicName?.trim() || `${u.name.split(" ")[0]}${u.name.split(" ")[1] ? ` ${u.name.split(" ")[1][0]}.` : ""}`;

const notDisqualified = (period: string) => ({ lbDisq: { none: { liftedAt: null, OR: [{ period: null }, { period }] } } });

async function scopeWhere(viewerId: string, scope: Scope, period: string): Promise<{ ok: true; where: Prisma.UserWhereInput } | { ok: false; reason: "country" | "community"; where: null }> {
  const me = await db.profile.findUnique({ where: { userId: viewerId } });
  const base: Prisma.UserWhereInput = { status: "ACTIVE", ...notDisqualified(period) };
  if (scope === "friends") {
    const ids = await friendIds(viewerId);
    // friends see each other unless the friend made their activity private; you always see yourself
    return { ok: true as const, where: { ...base, OR: [{ id: viewerId }, { id: { in: ids }, profile: { activityVisibility: { not: "PRIVATE" } } }] } };
  }
  if (scope === "country" && !me?.country) return { ok: false, reason: "country" as const, where: null };
  if (scope === "community" && !me?.community) return { ok: false, reason: "community" as const, where: null };
  const pub = { leaderboardOptIn: true, ...(scope === "country" ? { country: me!.country } : {}), ...(scope === "community" ? { community: normCommunity(me!.community) } : {}) };
  return { ok: true as const, where: { ...base, profile: pub } };
}

export async function getBoard(viewerId: string, kind: PeriodKind, board: Board, scope: Scope, opts: { day?: string } = {}) {
  const cfg = await lbSettings();
  const day = opts.day ?? dateKey(new Date(), cfg.timezone);
  const period = periodKey(kind, day, cfg);
  await refreshUserScores(viewerId); // the viewer's own score is always fresh
  const sw = await scopeWhere(viewerId, scope, period);
  const me = await db.profile.findUnique({ where: { userId: viewerId } });
  if (!sw.ok) return { period, board, scope, needs: sw.reason, rows: [], me: null, total: 0 };
  if (scope === "global") await snapshotRanks(period, board);
  const where: Prisma.LeaderboardScoreWhereInput = { period, board, value: { gt: 0 }, user: sw.where };
  const [rows, total, mine] = await Promise.all([
    db.leaderboardScore.findMany({ where, orderBy: [{ value: "desc" }, { updatedAt: "asc" }], take: cfg.maxRows, include: { user: { select: { id: true, name: true, avatarUrl: true, profile: { select: { publicName: true, country: true, showPhotoOnBoards: true, walkieLook: true, walkieFur: true } }, pets: { where: { species: { key: "husky" } }, select: { accessories: { select: { item: { select: { key: true, color: true } } } } } } } } } }),
    db.leaderboardScore.count({ where }),
    db.leaderboardScore.findUnique({ where: { userId_period_board: { userId: viewerId, period, board } } }),
  ]);
  const ranked = rows.map((r, i) => ({
    rank: i + 1, userId: r.user.id, me: r.user.id === viewerId, name: displayName(r.user), country: r.user.profile?.country ?? null,
    photo: r.user.profile?.showPhotoOnBoards ? r.user.avatarUrl : null, score: r.value,
    change: scope === "global" && r.prevRank ? r.prevRank - (i + 1) : null,
    walkie: { look: r.user.profile?.walkieLook ?? "classic", fur: r.user.profile?.walkieFur ?? "classic", accessories: r.user.pets[0]?.accessories.map((a) => ({ key: a.item.key, color: a.item.color })) ?? [] },
  }));
  const inScope = !!(await db.user.count({ where: { AND: [{ id: viewerId }, sw.where] } }));
  let myRank: number | null = null;
  if (mine && mine.value > 0 && inScope) myRank = (await db.leaderboardScore.count({ where: { ...where, OR: [{ value: { gt: mine.value } }, { value: mine.value, updatedAt: { lt: mine.updatedAt } }] } })) + 1;
  let aboveScore: number | null = null;
  if (myRank && myRank > 1) aboveScore = ranked[myRank - 2]?.score ?? (await db.leaderboardScore.findFirst({ where: { ...where, value: { gt: mine!.value } }, orderBy: { value: "asc" } }))?.value ?? null;
  const disq = await db.leaderboardDisqualification.findFirst({ where: { userId: viewerId, liftedAt: null, OR: [{ period: null }, { period }] }, select: { id: true, reason: true, period: true } });
  return {
    period, board, scope, total, rows: ranked,
    me: { rank: myRank, score: mine?.value ?? 0, gapToNext: aboveScore != null ? Math.round(Math.max(0, aboveScore - (mine?.value ?? 0)) * 100) / 100 : null, inScope, change: scope === "global" && mine?.prevRank && myRank ? mine.prevRank - myRank : null, disqualified: disq ? { id: disq.id } : null /* staff reason stays internal */ },
    privacy: { optedIn: !!me?.leaderboardOptIn, country: me?.country ?? null, community: me?.community ?? null, publicName: me?.publicName ?? null },
  };
}

/** Once per day per board, remember everyone's global rank → "▲3 since yesterday". */
async function snapshotRanks(period: string, board: string) {
  const today = dateKey(new Date(), (await lbSettings()).timezone);
  const key = `lbsnap:${period}:${board}`;
  const row = await db.appSetting.findUnique({ where: { key } });
  if ((row?.value as { day?: string } | null)?.day === today) return;
  await db.appSetting.upsert({ where: { key }, create: { key, value: { day: today } }, update: { value: { day: today } } });
  const list = await db.leaderboardScore.findMany({ where: { period, board, value: { gt: 0 }, user: { status: "ACTIVE", profile: { leaderboardOptIn: true } } }, orderBy: [{ value: "desc" }, { updatedAt: "asc" }], take: 2000, select: { id: true } });
  for (let i = 0; i < list.length; i++) await db.leaderboardScore.update({ where: { id: list[i].id }, data: { prevRank: i + 1 } });
}

/* ── settlement & rewards ─────────────────────────────────────── */
export function tierFor(score: number, cfg: LeaderboardSettings) {
  return [...cfg.rewards.tiers].reverse().find((t) => score >= t.min) ?? null;
}

/** Settles a finished week/month on the Overall board: podium coins (+ monthly champion item) for public boards, and
 * personal tier + improvement rewards for everyone who took part. Idempotent per user (unique result + ledger keys). */
export async function settlePeriod(period: string) {
  const cfg = await lbSettings();
  if (!/^[WM]:/.test(period)) throw new Error("Only weeks and months are settled");
  const [, end] = periodRange(period);
  if (end! >= dateKey(new Date(), cfg.timezone)) throw new Error("Period hasn't finished yet");
  const isMonth = period.startsWith("M:");
  // make sure every participant's score is final
  const participants = await db.activity.findMany({ where: { status: "COMPLETED", startedAt: { gte: new Date(`${periodRange(period)[0]}T00:00:00Z`), lt: new Date(new Date(`${end}T00:00:00Z`).getTime() + 2 * 86400000) } }, distinct: ["userId"], select: { userId: true } });
  for (const p of participants) await refreshUserScores(p.userId, [periodRange(period)[0]!]);
  const all = await db.leaderboardScore.findMany({ where: { period, board: "overall", value: { gt: 0 }, user: { status: "ACTIVE", ...notDisqualified(period) } }, orderBy: [{ value: "desc" }, { updatedAt: "asc" }], include: { user: { select: { id: true, profile: { select: { leaderboardOptIn: true, notifyCompetition: true } } } } } });
  const publicRanked = all.filter((r) => r.user.profile?.leaderboardOptIn);
  const prizes = isMonth ? cfg.rewards.monthlyTop : cfg.rewards.weeklyTop;
  const podiumOk = publicRanked.length >= cfg.minParticipantsForPodium;
  let granted = 0;
  for (const r of all) {
    const rank = r.user.profile?.leaderboardOptIn ? publicRanked.indexOf(r) + 1 : null;
    const tier = tierFor(r.value, cfg);
    let coins = tier?.coins ?? 0;
    if (podiumOk && rank && rank <= prizes.length) coins += prizes[rank - 1];
    let improved = false;
    if (!isMonth) {
      const prev = await db.leaderboardScore.findUnique({ where: { userId_period_board: { userId: r.userId, period: previousPeriod("week", periodRange(period)[0]!, cfg), board: "overall" } } });
      improved = !!prev && prev.value > 0 && r.value >= prev.value * 1.1;
      if (improved) coins += cfg.rewards.improvementBonus;
    }
    const item = podiumOk && isMonth && rank === 1 ? cfg.rewards.monthlyChampionItem : null;
    try {
      await db.$transaction(async (tx) => {
        await tx.leaderboardResult.create({ data: { period, board: "overall", userId: r.userId, rank, score: r.value, tier: tier?.key ?? null, rewardCoins: coins, rewardItem: item } });
        if (coins > 0) await grant(tx, r.userId, { coins, xp: Math.round(coins / 2), reason: "LEADERBOARD", key: `lb:${period}:${r.userId}`, refType: "leaderboard", refId: period });
        if (item) { const it = await tx.item.findUnique({ where: { key: item } }); if (it) await addInventory(tx, r.userId, it.id, 1); }
      });
      granted++;
      if (r.user.profile?.notifyCompetition !== false && coins > 0) await notify(r.userId, { type: "CHALLENGE", title: rank && rank <= 3 && podiumOk ? `You finished #${rank} on the ${isMonth ? "monthly" : "weekly"} podium!` : `${isMonth ? "Monthly" : "Weekly"} results are in`, body: `${tier ? `${tier.key[0]}${tier.key.slice(1).toLowerCase()} tier · ` : ""}${improved ? "personal best bonus · " : ""}+${coins} coins`, link: "/app/leaderboard" });
    } catch { /* already settled for this user */ }
  }
  await db.appSetting.upsert({ where: { key: `lbsettled:${period}` }, create: { key: `lbsettled:${period}`, value: { at: new Date().toISOString(), participants: all.length } }, update: {} });
  return { period, participants: all.length, rewarded: granted, podium: podiumOk };
}

/** Settles the last finished week and month if not done yet (cron + lazy). */
export async function settleDue() {
  const cfg = await lbSettings();
  const today = dateKey(new Date(), cfg.timezone);
  const out = [];
  for (const kind of ["week", "month"] as const) {
    const p = previousPeriod(kind, today, cfg);
    if (addDays(periodRange(p)[1]!, 1) >= today) continue; // one grace day so late syncs/backfills still count
    if (await db.appSetting.findUnique({ where: { key: `lbsettled:${p}` } })) continue;
    out.push(await settlePeriod(p));
  }
  return out;
}
