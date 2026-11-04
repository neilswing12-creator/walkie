import { db, type Tx } from "../db";
import { weekKey } from "../dates";
import type { MissionKind } from "../constants";
import { grant } from "../ledger";
import { ApiError } from "../api-error";

export const periodKeyFor = (period: string, day: string) => (period === "WEEKLY" ? weekKey(day) : period === "ONE_OFF" ? "once" : day);

/** Increment (or, with mode "max", raise to) progress on all enabled missions of a kind. */
export async function bumpMissions(tx: Tx, userId: string, day: string, kind: MissionKind, amount: number, mode: "add" | "max" = "add", isPlus = false) {
  if (amount <= 0) return [];
  const missions = await tx.mission.findMany({ where: { kind, enabled: true, ...(isPlus ? {} : { premium: false }) } });
  const completed: string[] = [];
  for (const m of missions) {
    const periodKey = periodKeyFor(m.period, day);
    const cur = await tx.missionProgress.upsert({
      where: { userId_missionId_periodKey: { userId, missionId: m.id, periodKey } },
      create: { userId, missionId: m.id, periodKey, progress: 0 },
      update: {},
    });
    if (cur.completedAt) continue;
    const next = mode === "add" ? cur.progress + Math.round(amount) : Math.max(cur.progress, Math.round(amount));
    const done = next >= m.target;
    await tx.missionProgress.update({ where: { id: cur.id }, data: { progress: Math.min(next, m.target), completedAt: done ? new Date() : null } });
    if (done) completed.push(m.title);
  }
  return completed;
}

export async function listMissions(userId: string, day: string, isPlus: boolean) {
  const missions = await db.mission.findMany({ where: { enabled: true }, orderBy: [{ period: "asc" }, { sort: "asc" }] });
  const keys = [...new Set(missions.map((m) => periodKeyFor(m.period, day)))];
  const progress = await db.missionProgress.findMany({ where: { userId, periodKey: { in: keys } } });
  return missions.map((m) => {
    const p = progress.find((x) => x.missionId === m.id && x.periodKey === periodKeyFor(m.period, day));
    return {
      id: m.id, key: m.key, title: m.title, description: m.description, kind: m.kind, period: m.period, difficulty: m.difficulty,
      target: m.target, rewardCoins: m.rewardCoins, rewardXp: m.rewardXp, premium: m.premium, locked: m.premium && !isPlus,
      progress: p?.progress ?? 0, completed: !!p?.completedAt, claimed: !!p?.claimedAt,
    };
  });
}

export async function claimMission(tx: Tx, userId: string, missionId: string, day: string, isPlus: boolean) {
  const m = await tx.mission.findUnique({ where: { id: missionId } });
  if (!m || !m.enabled) throw new ApiError(404, "Mission not found");
  if (m.premium && !isPlus) throw new ApiError(403, "This mission is part of Walkie Plus", "plus_required");
  const periodKey = periodKeyFor(m.period, day);
  const p = await tx.missionProgress.findUnique({ where: { userId_missionId_periodKey: { userId, missionId, periodKey } } });
  if (!p?.completedAt) throw new ApiError(400, "Finish the mission first", "not_complete");
  // Conditional update guarantees only one concurrent claim wins.
  const r = await tx.missionProgress.updateMany({ where: { id: p.id, claimedAt: null }, data: { claimedAt: new Date() } });
  if (r.count === 0) throw new ApiError(409, "Reward already claimed", "already_claimed");
  const mult = (await tx.appSetting.findUnique({ where: { key: "economy" } }))?.value as { missionRewardMultiplier?: number } | undefined;
  const k = Math.max(0, mult?.missionRewardMultiplier ?? 1);
  const coins = Math.round(m.rewardCoins * k), xp = Math.round(m.rewardXp * k);
  const g = await grant(tx, userId, { coins, xp, reason: "MISSION", key: `mission:${p.id}`, refType: "mission", refId: m.id });
  return { coins, xp, leveledUp: g.leveledUp, level: g.level };
}
