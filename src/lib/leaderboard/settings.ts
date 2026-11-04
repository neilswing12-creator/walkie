/** Admin-configurable leaderboard rules (AppSetting "leaderboard"). Shown to users verbatim in "How scoring works". */
export const LEADERBOARD_DEFAULTS = {
  timezone: "UTC", // period boundaries (daily/weekly/monthly resets) for everyone
  weekStartsOn: 1 as 0 | 1, // 1 = Monday
  periods: ["day", "week", "month", "all"] as string[],
  boards: ["overall", "walk", "run", "bike", "steps"] as string[],
  scopes: ["friends", "global", "country", "community"] as string[],
  overall: { pointsWeight: 1, stepsPer1000: 8, missionWeight: 20, dailyCap: 2500 },
  includeUnverifiedDistance: false, // indoor/manual distances can't be verified → not ranked on distance boards
  countIndoorPoints: true, // indoor sessions are server-timed, so their activity points still count toward Overall
  maxRows: 100,
  minParticipantsForPodium: 3,
  rewards: {
    weeklyTop: [300, 200, 120], monthlyTop: [800, 500, 300], monthlyChampionItem: "acc_laurel",
    tiers: [{ key: "BRONZE", min: 400, coins: 15 }, { key: "SILVER", min: 1500, coins: 40 }, { key: "GOLD", min: 4000, coins: 80 }, { key: "DIAMOND", min: 9000, coins: 150 }],
    improvementBonus: 25, // personal-best bonus when you beat last week by 10%+
  },
  suspicious: { capDaysPerWeek: 4 },
  duel: { participationCoins: 15, winnerCoins: 30, maxActive: 5 },
};
export type LeaderboardSettings = typeof LEADERBOARD_DEFAULTS;
export type Board = "overall" | "walk" | "run" | "bike" | "steps";
export type PeriodKind = "day" | "week" | "month" | "all";
export const BOARD_LABEL: Record<Board, string> = { overall: "Overall", walk: "Walking", run: "Running", bike: "Cycling", steps: "Steps" };
export const BOARD_UNIT: Record<Board, string> = { overall: "pts", walk: "km", run: "km", bike: "km", steps: "steps" };
