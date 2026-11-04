/**
 * Centralised achievement engine. All progress is derived from real, server-validated records
 * (COMPLETED activities, health-synced summaries, pets, shop, social tables) — never from client input.
 * Unlocks are idempotent: unique (userId, achievementId) + ledger idempotency key `ach:{user}:{achievement}`.
 */
import { db } from "../db";
import { ACTIVITY_META, type ActivityType } from "../constants";
import { dateKey, weekDays, addDays } from "../dates";
import { grant, addInventory } from "../ledger";
import { notify } from "../notify";
import { gridSize } from "../game/shop-rules";

export type Metrics = Record<string, number>;
const fam = (t: string) => ACTIVITY_META[t as ActivityType]?.family ?? "other";

export async function computeMetrics(userId: string): Promise<{ metrics: Metrics; seasonal: (from: Date, to: Date) => number }> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } });
  const tz = user.timezone || "UTC";
  const [acts, days, streak, wallet, pets, species, layout, inv, friends, visitsMade, visitors, shares, challenges, missions, invites] = await Promise.all([
    db.activity.findMany({ where: { userId, status: "COMPLETED" }, select: { type: true, startedAt: true, distanceM: true, durationSec: true, estimatedSteps: true, records: true }, orderBy: { startedAt: "asc" }, take: 20000 }),
    db.dailySummary.findMany({ where: { userId }, select: { date: true, steps: true, activities: true, activeMinutes: true, goalMet: true } }),
    db.streak.findUnique({ where: { userId } }),
    db.wallet.findUnique({ where: { userId } }),
    db.pet.findMany({ where: { userId }, select: { level: true, stage: true, species: { select: { key: true, rarity: true } } } }),
    db.petSpecies.findMany({ where: { enabled: true }, select: { key: true, rarity: true } }),
    db.shopLayout.findUnique({ where: { userId }, include: { placements: { include: { item: { select: { category: true, footprintW: true, footprintD: true } } } } } }),
    db.inventoryItem.count({ where: { userId, quantity: { gt: 0 }, item: { category: "ENVIRONMENT" } } }),
    db.friendship.count({ where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] } }),
    db.shopVisit.count({ where: { visitorId: userId } }),
    db.shopVisit.count({ where: { ownerId: userId } }),
    db.analyticsEvent.count({ where: { userId, name: "activity_shared" } }),
    db.challengeParticipant.findMany({ where: { userId, completedAt: { not: null } }, select: { challenge: { select: { community: true } } } }),
    db.missionProgress.count({ where: { userId, completedAt: { not: null } } }),
    // Anti-spam: only invited users who verified their email AND completed a real activity count.
    db.referral.count({ where: { referrerId: userId, status: "REWARD_GRANTED", referee: { status: "ACTIVE", activities: { some: { status: "COMPLETED" } } } } }),
  ]);

  const m: Metrics = {};
  const set = (k: string, v: number) => { m[k] = Math.max(m[k] ?? 0, v); };
  let totalDist = 0, estSteps = 0, totalSec = 0;
  const recordCounts: Record<string, number> = {};
  const activeDays = new Set<string>();
  let early = 0, night = 0;
  for (const a of acts) {
    const f = fam(a.type);
    totalDist += a.distanceM; estSteps += a.estimatedSteps ?? 0; totalSec += a.durationSec;
    set("SINGLE_DISTANCE", a.distanceM);
    set("ACTIVITY_SINGLE_DURATION", Math.floor(a.durationSec / 60));
    if (f === "run") { m.RUN_COUNT = (m.RUN_COUNT ?? 0) + 1; set("RUN_SINGLE_DISTANCE", a.distanceM); m.RUN_TOTAL_DISTANCE = (m.RUN_TOTAL_DISTANCE ?? 0) + a.distanceM; set("RUN_SINGLE_DURATION", Math.floor(a.durationSec / 60)); }
    if (f === "bike") { m.RIDE_COUNT = (m.RIDE_COUNT ?? 0) + 1; set("RIDE_SINGLE_DISTANCE", a.distanceM); m.RIDE_TOTAL_DISTANCE = (m.RIDE_TOTAL_DISTANCE ?? 0) + a.distanceM; set("RIDE_SINGLE_DURATION", Math.floor(a.durationSec / 60)); }
    if (f === "walk") set("WALK_SINGLE_DURATION", Math.floor(a.durationSec / 60));
    const recs = (a.records as string[] | null) ?? [];
    if (recs.length) m.RECORDS_SET = (m.RECORDS_SET ?? 0) + 1;
    for (const r of recs) recordCounts[r] = (recordCounts[r] ?? 0) + 1;
    if (a.durationSec >= 60) {
      activeDays.add(dateKey(a.startedAt, tz));
      const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(a.startedAt)) % 24;
      if (h < 7 && h >= 4) early++;
      if (h >= 21 || h < 2) night++;
    }
  }
  for (const [r, n] of Object.entries(recordCounts)) m[`RECORD:${r}`] = n;
  const goalDays = new Set<string>();
  let maxSteps = 0, maxActive = 0, healthSteps = 0;
  for (const d of days) {
    healthSteps += d.steps;
    if (d.activities > 0 || d.steps >= 1000) activeDays.add(d.date);
    if (d.goalMet) goalDays.add(d.date);
    maxSteps = Math.max(maxSteps, d.steps); maxActive = Math.max(maxActive, d.activeMinutes);
  }
  // per-day estimated steps from activities, for web users without Health
  const estByDay: Record<string, number> = {};
  for (const a of acts) { const k = dateKey(a.startedAt, tz); estByDay[k] = (estByDay[k] ?? 0) + (a.estimatedSteps ?? 0); }
  maxSteps = Math.max(maxSteps, ...Object.values(estByDay), 0);

  m.TOTAL_STEPS = Math.max(healthSteps, estSteps);
  m.TOTAL_DISTANCE = totalDist;
  m.TOTAL_ACTIVE_MINUTES = Math.floor(totalSec / 60);
  m.ACTIVITY_COUNT = acts.length;
  m.ACTIVE_DAYS = activeDays.size;
  m.STREAK = streak?.longest ?? 0;
  m.EARLY_BIRD = early; m.NIGHT_OWL = night;
  m.DAILY_STEPS_MAX = maxSteps; m.DAILY_ACTIVE_MAX = maxActive;
  m.MISSION_COUNT = missions; m.LEVEL = wallet?.level ?? 1;

  // weekends, perfect weeks/months, busiest month (timezone-aware via local date keys)
  let weekends = 0;
  for (const d of activeDays) { const dow = new Date(d + "T12:00:00Z").getUTCDay(); if (dow === 6 && activeDays.has(addDays(d, 1))) weekends++; }
  m.WEEKEND_WARRIOR = weekends;
  const weeks = new Set<string>(); let perfectWeeks = 0;
  for (const d of goalDays) { const w = weekDays(d); if (weeks.has(w[0])) continue; weeks.add(w[0]); if (w.every((x) => goalDays.has(x))) perfectWeeks++; }
  m.PERFECT_WEEKS = perfectWeeks;
  const byMonth: Record<string, { active: number; goal: number }> = {};
  for (const d of activeDays) (byMonth[d.slice(0, 7)] ??= { active: 0, goal: 0 }).active++;
  for (const d of goalDays) (byMonth[d.slice(0, 7)] ??= { active: 0, goal: 0 }).goal++;
  m.MONTH_ACTIVE_DAYS_MAX = Math.max(0, ...Object.values(byMonth).map((x) => x.active));
  const today = dateKey(new Date(), tz);
  m.PERFECT_MONTHS = Object.entries(byMonth).filter(([mo, x]) => { const [y, mm] = mo.split("-").map(Number); const len = new Date(Date.UTC(y, mm, 0)).getUTCDate(); return `${mo}-${String(len).padStart(2, "0")}` < today && x.goal >= len; }).length;

  // pets
  const owned = new Set(pets.map((p) => p.species.key));
  m.PET_COUNT = pets.length;
  m.PET_MAX_LEVEL = Math.max(0, ...pets.map((p) => p.level));
  m.PET_EVOLVED = pets.filter((p) => p.stage !== "BABY").length;
  m.PET_ALL = species.length > 0 && species.every((s) => owned.has(s.key)) ? 1 : 0;
  for (const r of ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHICAL"]) { const pool = species.filter((s) => s.rarity === r); m[`PET_RARITY_ALL:${r}`] = pool.length > 0 && pool.every((s) => owned.has(s.key)) ? 1 : 0; }
  m.__owned = 0; (m as any).__ownedSet = owned;

  // shop
  const placements = layout?.placements ?? [];
  const buildings = placements.filter((p) => p.item.category === "BUILDING").length;
  m.SHOP_PLACEMENTS = placements.length;
  m.SHOP_BUILDINGS = buildings;
  m.SHOP_EXPANSION = layout?.expansion ?? 0;
  m.ENV_OWNED = inv;
  m.SHOP_LEVEL = shopLevel(layout?.expansion ?? 0, placements.length, buildings);
  const cells = placements.reduce((t, p) => t + p.item.footprintW * p.item.footprintD, 0);
  m.SHOP_FULL = (layout?.expansion ?? 0) >= 4 ? Math.floor((cells / gridSize(4) ** 2) * 100) : 0;

  // social
  m.FRIEND_COUNT = friends; m.SHOP_VISITS_MADE = visitsMade; m.SHOP_VISITORS = visitors; m.SHARED_ACTIVITIES = shares;
  m.CHALLENGES_COMPLETED = challenges.length; m.COMMUNITY_CHALLENGES = challenges.filter((c) => c.challenge.community).length;
  m.QUALIFIED_INVITES = invites;
  const [lbRes, duelWins, cheers] = await Promise.all([
    db.leaderboardResult.findMany({ where: { userId }, select: { rank: true, tier: true } }),
    db.duel.count({ where: { winnerId: userId, status: "DONE" } }),
    db.cheer.count({ where: { fromId: userId } }),
  ]);
  m.LEADERBOARD_PODIUM = lbRes.filter((r) => r.rank != null && r.rank <= 3).length;
  m.LEADERBOARD_CHAMPION = lbRes.filter((r) => r.rank === 1).length;
  m.LEADERBOARD_TIER_GOLD = lbRes.filter((r) => r.tier === "GOLD" || r.tier === "DIAMOND").length;
  m.LEADERBOARD_WEEKS = lbRes.length;
  m.DUEL_WINS = duelWins; m.CHEERS_SENT = cheers;

  return { metrics: m, seasonal: (from, to) => acts.filter((a) => a.startedAt >= from && a.startedAt <= to && a.durationSec >= 60).length };
}

export const shopLevel = (expansion: number, placements: number, buildings: number) => 1 + expansion * 3 + Math.floor(placements / 3) + buildings;

export function metricFor(kind: string, metrics: Metrics, seasonal: (f: Date, t: Date) => number, a: { startsAt: Date | null; endsAt: Date | null }) {
  if (kind === "SEASONAL_ACTIVITY") return a.startsAt && a.endsAt ? seasonal(a.startsAt, a.endsAt) : 0;
  if (kind.startsWith("PET_SET:")) { const set = (metrics as any).__ownedSet as Set<string>; return kind.slice(8).split(",").every((k) => set?.has(k)) ? 1 : 0; }
  return metrics[kind] ?? 0;
}

const live = (a: { enabled: boolean; archived: boolean }) => a.enabled && !a.archived;

/** Recompute progress, unlock what's earned, grant rewards once. Returns newly unlocked badges. */
export async function evaluateAchievements(userId: string) {
  const [defs, owned, { metrics, seasonal }] = await Promise.all([
    db.achievement.findMany({ where: { enabled: true, archived: false } }),
    db.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
    computeMetrics(userId),
  ]);
  const have = new Set(owned.map((o) => o.achievementId));
  const now = new Date();
  const unlocked: { id: string; key: string; title: string; rarity: string; coins: number; xp: number; item?: string | null }[] = [];
  const progressRows = await db.achievementProgress.findMany({ where: { userId } });
  for (const a of defs.filter(live)) {
    if (have.has(a.id)) continue;
    // seasonal badges can only be earned inside their window (already-earned ones are never removed)
    if (a.startsAt && now < a.startsAt) continue;
    if (a.endsAt && a.kind === "SEASONAL_ACTIVITY" && now > new Date(a.endsAt.getTime() + 7 * 86400000)) continue;
    const value = metricFor(a.kind, metrics, seasonal, a);
    const prev = progressRows.find((p) => p.achievementId === a.id)?.progress ?? -1;
    if (value !== prev) await db.achievementProgress.upsert({ where: { userId_achievementId: { userId, achievementId: a.id } }, create: { userId, achievementId: a.id, progress: value }, update: { progress: value } });
    if (value < a.target) continue;
    const ok = await db.$transaction(async (tx) => {
      try { await tx.userAchievement.create({ data: { userId, achievementId: a.id } }); } catch { return false; } // unique → concurrent unlock lost the race
      await grant(tx, userId, { coins: a.rewardCoins, xp: a.rewardXp, reason: "ACHIEVEMENT", key: `ach:${userId}:${a.id}`, refType: "achievement", refId: a.id });
      const entry = await tx.ledgerEntry.findUnique({ where: { idempotencyKey: `ach:${userId}:${a.id}` } });
      if (a.rewardItemKey) { const item = await tx.item.findUnique({ where: { key: a.rewardItemKey } }); if (item) await addInventory(tx, userId, item.id, a.rewardItemQty); }
      await tx.userAchievement.update({ where: { userId_achievementId: { userId, achievementId: a.id } }, data: { rewardTxId: entry?.id } });
      return true;
    });
    if (ok) {
      unlocked.push({ id: a.id, key: a.key, title: a.title, rarity: a.rarity, coins: a.rewardCoins, xp: a.rewardXp, item: a.rewardItemKey });
      await notify(userId, { type: "ACHIEVEMENT", title: `New badge: ${a.title}`, body: `${a.description} · +${a.rewardCoins} coins`, link: `/app/badges?b=${a.key}` });
    }
  }
  return unlocked;
}
