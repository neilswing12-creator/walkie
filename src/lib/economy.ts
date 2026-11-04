/** Balanced, non pay-to-win progression economy. All values are server-authoritative. */

export const ECONOMY_DEFAULTS = {
  // Points are earned per *moving* minute × the activity's reward rate (ActivityTypeConfig.rewardRate).
  coinsPerPoint: 0.2,
  xpPerPoint: 0.5,
  dailyPointCap: 2500,
  minActivitySecForReward: 60,
  streakBonusPerDay: 0.02,
  streakBonusMax: 0.2,
  recordBonusPoints: 50,
  missionRewardMultiplier: 1,
  maxWalkKmh: 10,
  maxRunKmh: 24,
  maxBikeKmh: 60,
  petPlayCooldownMin: 90,
  petPetCooldownMin: 20,
  shopExpansionCost: [0, 800, 2000, 4500, 9000],
  starterCoins: 150,
};
export type EconomyConfig = typeof ECONOMY_DEFAULTS;

export interface RewardBreakdown { minutes: number; rate: number; basePoints: number; streakBonus: number; recordBonus: number; points: number; coins: number; xp: number; capped: boolean }

/**
 * Centralised reward calculation. Paused time never counts (movingSec only). Distance alone earns nothing,
 * so cycling's longer distances don't dominate and walking stays the most rewarding per minute.
 */
export function activityReward(movingSec: number, rate: number, cfg: EconomyConfig = ECONOMY_DEFAULTS, opts: { streakDays?: number; records?: number; pointsEarnedToday?: number } = {}): RewardBreakdown {
  const minutes = Math.floor(movingSec / 60);
  if (movingSec < cfg.minActivitySecForReward || rate <= 0) return { minutes, rate, basePoints: 0, streakBonus: 0, recordBonus: 0, points: 0, coins: 0, xp: 0, capped: false };
  const basePoints = Math.round(minutes * rate);
  const streakBonus = Math.round(basePoints * Math.min(cfg.streakBonusMax, (opts.streakDays ?? 0) * cfg.streakBonusPerDay));
  const recordBonus = (opts.records ?? 0) > 0 ? cfg.recordBonusPoints : 0;
  let points = basePoints + streakBonus + recordBonus;
  const room = Math.max(0, cfg.dailyPointCap - (opts.pointsEarnedToday ?? 0));
  const capped = points > room;
  points = Math.min(points, room);
  return { minutes, rate, basePoints, streakBonus, recordBonus, points, coins: Math.round(points * cfg.coinsPerPoint), xp: Math.round(points * cfg.xpPerPoint), capped };
}

export const maxAvgSpeeds = (cfg: EconomyConfig) => ({ walk: cfg.maxWalkKmh / 3.6, run: cfg.maxRunKmh / 3.6, bike: cfg.maxBikeKmh / 3.6, other: cfg.maxRunKmh / 3.6 });

/** Cumulative XP required to reach a level. L1 = 0, L2 = 100, L3 = 300, L4 = 600 … */
export const xpForLevel = (level: number) => 50 * (level - 1) * level;

export function levelFromXp(xp: number): { level: number; into: number; needed: number; progress: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - base, needed: next - base, progress: (xp - base) / (next - base) };
}

/** Pet levels use a gentler linear curve per species. */
export function petLevelFromXp(xp: number, xpPerLevel: number) {
  const level = Math.floor(xp / xpPerLevel) + 1;
  return { level, into: xp % xpPerLevel, needed: xpPerLevel, progress: (xp % xpPerLevel) / xpPerLevel };
}

export function petStage(level: number, s: { youngAtLevel: number; adultAtLevel: number; specialAtLevel: number }) {
  if (level >= s.specialAtLevel) return "SPECIAL";
  if (level >= s.adultAtLevel) return "ADULT";
  if (level >= s.youngAtLevel) return "YOUNG";
  return "BABY";
}

export type DailyRewardDef = { coins: number; xp: number; items?: { key: string; qty: number }[]; label: string };

/** Seven-day cycle. Missing a day gently restarts the cycle — nothing is lost. */
export const DAILY_REWARDS: DailyRewardDef[] = [
  { coins: 25, xp: 10, label: "25 coins" },
  { coins: 10, xp: 10, items: [{ key: "food_kibble", qty: 2 }], label: "2 Kibble bowls" },
  { coins: 40, xp: 15, label: "40 coins" },
  { coins: 10, xp: 15, items: [{ key: "toy_ball", qty: 1 }], label: "Squeaky ball" },
  { coins: 60, xp: 20, label: "60 coins" },
  { coins: 30, xp: 20, items: [{ key: "food_salmon", qty: 1 }], label: "Salmon treat + 30 coins" },
  { coins: 100, xp: 40, items: [{ key: "deco_flowerpot", qty: 1 }], label: "Flower pot + 100 coins" },
];

/** Lazily decays pet mood so pets feel alive without punishing breaks (never below 25). */
export function effectivePetStats(p: { happiness: number; energy: number; lastFedAt: Date | null; lastPlayedAt: Date | null; lastPettedAt: Date | null; acquiredAt: Date }, now = new Date()) {
  const last = Math.max(p.lastFedAt?.getTime() ?? 0, p.lastPlayedAt?.getTime() ?? 0, p.lastPettedAt?.getTime() ?? 0, p.acquiredAt.getTime());
  const hours = Math.max(0, (now.getTime() - last) / 3600000);
  const happiness = Math.max(25, Math.round(p.happiness - hours / 3));
  const energy = Math.max(25, Math.round(p.energy - hours / 4));
  return { happiness, energy };
}
