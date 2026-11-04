import { describe, it, expect } from "vitest";
import { activityReward, levelFromXp, xpForLevel, petStage, effectivePetStats, ECONOMY_DEFAULTS, DAILY_REWARDS } from "@/lib/economy";
import { validatePlacement, footprint, gridSize } from "@/lib/game/shop-rules";
import { weekKey, diffDays, addDays, weekDays, dateKey } from "@/lib/dates";
import { displayStreak } from "@/lib/game/streak";
import { sanitizeProps } from "@/lib/analytics";

describe("economy", () => {
  const C = ECONOMY_DEFAULTS;
  it("points = moving minutes × rate (spec examples)", () => {
    expect(activityReward(30 * 60, 10, C).basePoints).toBe(300); // walk
    expect(activityReward(30 * 60, 7, C).basePoints).toBe(210);  // run
    expect(activityReward(30 * 60, 4, C).basePoints).toBe(120);  // bike
  });
  it("coins and XP derive from points", () => { const r = activityReward(30 * 60, 10, C); expect(r.coins).toBe(60); expect(r.xp).toBe(150); });
  it("partial minutes don't count (paused time never reaches movingSec)", () => expect(activityReward(119, 10, C).basePoints).toBe(10));
  it("gives nothing under the minimum duration", () => expect(activityReward(30, 10, C).points).toBe(0));
  it("streak bonus is capped", () => { expect(activityReward(600, 10, C, { streakDays: 3 }).streakBonus).toBe(6); expect(activityReward(600, 10, C, { streakDays: 100 }).streakBonus).toBe(20); });
  it("record bonus applies once", () => expect(activityReward(600, 10, C, { records: 3 }).recordBonus).toBe(C.recordBonusPoints));
  it("respects the daily point cap", () => { const r = activityReward(3600, 10, C, { pointsEarnedToday: C.dailyPointCap - 100 }); expect(r.points).toBe(100); expect(r.capped).toBe(true); });
  it("cycling isn't unrewarding", () => expect(activityReward(1800, 4, C).coins).toBeGreaterThan(0));
  it("level curve is monotonic and consistent", () => {
    expect(xpForLevel(1)).toBe(0); expect(xpForLevel(2)).toBe(100); expect(xpForLevel(3)).toBe(300);
    expect(levelFromXp(0).level).toBe(1); expect(levelFromXp(99).level).toBe(1); expect(levelFromXp(100).level).toBe(2); expect(levelFromXp(650).level).toBe(4);
  });
  it("pet stages follow thresholds", () => {
    const s = { youngAtLevel: 5, adultAtLevel: 12, specialAtLevel: 25 };
    expect(petStage(1, s)).toBe("BABY"); expect(petStage(5, s)).toBe("YOUNG"); expect(petStage(12, s)).toBe("ADULT"); expect(petStage(30, s)).toBe("SPECIAL");
  });
  it("pet mood decays gently and never below 25", () => {
    const old = new Date(Date.now() - 30 * 86400000);
    expect(effectivePetStats({ happiness: 90, energy: 90, lastFedAt: null, lastPlayedAt: null, lastPettedAt: null, acquiredAt: old })).toEqual({ happiness: 25, energy: 25 });
  });
  it("daily reward cycle has 7 days", () => expect(DAILY_REWARDS).toHaveLength(7));
});

describe("shop placement rules", () => {
  it("swaps footprint on odd rotations", () => expect(footprint(3, 2, 1)).toEqual({ w: 2, d: 3 }));
  it("grid grows with expansion", () => expect(gridSize(2)).toBe(12));
  it("accepts a valid placement", () => expect(validatePlacement({ x: 0, z: 0, rotation: 0, w: 2, d: 2 }, [], 0).ok).toBe(true));
  it("rejects out-of-bounds", () => expect(validatePlacement({ x: 7, z: 0, rotation: 0, w: 2, d: 1 }, [], 0).ok).toBe(false));
  it("rejects overlaps", () => expect(validatePlacement({ x: 1, z: 1, rotation: 0, w: 1, d: 1 }, [{ id: "a", x: 0, z: 0, rotation: 0, w: 2, d: 2 }], 0).ok).toBe(false));
  it("allows moving an item onto its own cells", () => expect(validatePlacement({ id: "a", x: 1, z: 0, rotation: 0, w: 2, d: 2 }, [{ id: "a", x: 0, z: 0, rotation: 0, w: 2, d: 2 }], 0).ok).toBe(true));
  it("rejects rotation that pushes outside bounds", () => expect(validatePlacement({ x: 6, z: 6, rotation: 1, w: 3, d: 1 }, [], 0).ok).toBe(false));
  it("rejects invalid rotation values", () => expect(validatePlacement({ x: 0, z: 0, rotation: 5, w: 1, d: 1 }, [], 0).ok).toBe(false));
});

describe("dates & streaks", () => {
  it("computes ISO weeks", () => { expect(weekKey("2026-11-04")).toBe("2026-W45"); expect(weekKey("2027-01-01")).toBe("2026-W53"); });
  it("diffs days across months", () => expect(diffDays("2026-10-30", "2026-11-02")).toBe(3));
  it("adds days", () => expect(addDays("2026-12-31", 1)).toBe("2027-01-01"));
  it("week starts on Monday", () => expect(weekDays("2026-11-04")[0]).toBe("2026-11-02"));
  it("respects time zones", () => { const d = new Date("2026-11-04T20:00:00Z"); expect(dateKey(d, "Asia/Manila")).toBe("2026-11-05"); expect(dateKey(d, "America/New_York")).toBe("2026-11-04"); });
  it("a streak survives until the end of the next day", () => {
    expect(displayStreak({ current: 4, lastActiveDate: "2026-11-03" }, "2026-11-04")).toEqual({ current: 4, activeToday: false });
    expect(displayStreak({ current: 4, lastActiveDate: "2026-11-01" }, "2026-11-04").current).toBe(0);
  });
});

describe("analytics privacy filter", () => {
  it("strips health, location and identity fields", () => {
    expect(sanitizeProps({ type: "OUTDOOR_RUN", lat: 1, lng: 2, steps: 100, calories: 50, weightKg: 70, email: "a@b.c", route: "x", plan: "plus" })).toEqual({ type: "OUTDOOR_RUN", plan: "plus" });
  });
  it("drops long strings and objects", () => expect(sanitizeProps({ big: "x".repeat(100), obj: { a: 1 } as unknown as string, ok: true })).toEqual({ ok: true }));
});
