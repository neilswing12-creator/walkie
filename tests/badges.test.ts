import { describe, it, expect } from "vitest";
import { BADGES, CATEGORIES } from "@/lib/achievements/catalog";
import { metricFor, shopLevel } from "@/lib/achievements/engine";

describe("badge catalogue", () => {
  it("has unique keys", () => expect(new Set(BADGES.map((b) => b.key)).size).toBe(BADGES.length));
  it("covers every category", () => { for (const c of CATEGORIES) expect(BADGES.some((b) => b.category === c && b.enabled !== false)).toBe(true); });
  it("every badge has art, a positive target and rarity-scaled rewards", () => {
    for (const b of BADGES) { expect(b.art.pose && b.art.scene).toBeTruthy(); expect(b.target).toBeGreaterThan(0); expect(b.rewardCoins).toBeGreaterThan(0); }
    const avg = (r: string) => { const l = BADGES.filter((b) => b.rarity === r); return l.reduce((t, b) => t + b.rewardCoins, 0) / l.length; };
    expect(avg("LEGENDARY")).toBeGreaterThan(avg("RARE"));
  });
  it("art combinations are varied, not one image recoloured", () => expect(new Set(BADGES.map((b) => JSON.stringify(b.art))).size).toBeGreaterThan(BADGES.length * 0.8));
  it("includes the requested milestones", () => {
    for (const k of ["walk_steps_10000000", "run_single_42_2k", "bike_total_5000", "streak_365", "perfect_month", "pr_5k", "pets_legendary_all", "shop_level_50", "invite_10", "season_halloween_2027"]) expect(BADGES.find((b) => b.key === k)).toBeTruthy();
  });
  it("seasonal badges have windows", () => { for (const b of BADGES.filter((x) => x.category === "SEASONAL")) expect(b.startsAt && b.endsAt && b.startsAt < b.endsAt).toBeTruthy(); });
});

describe("engine helpers", () => {
  const owned = new Set(["husky", "corgi", "shiba"]);
  const m: any = { TOTAL_STEPS: 5000, __ownedSet: owned };
  it("reads plain metrics", () => expect(metricFor("TOTAL_STEPS", m, () => 0, { startsAt: null, endsAt: null })).toBe(5000));
  it("pet sets require every member", () => { expect(metricFor("PET_SET:husky,corgi", m, () => 0, { startsAt: null, endsAt: null })).toBe(1); expect(metricFor("PET_SET:husky,golden", m, () => 0, { startsAt: null, endsAt: null })).toBe(0); });
  it("seasonal progress only counts inside the window", () => { const f = (a: Date, b: Date) => (a.getUTCMonth() === 11 ? 3 : 0); expect(metricFor("SEASONAL_ACTIVITY", m, f, { startsAt: new Date("2026-12-18"), endsAt: new Date("2026-12-26") })).toBe(3); expect(metricFor("SEASONAL_ACTIVITY", m, f, { startsAt: null, endsAt: null })).toBe(0); });
  it("shop level grows with the shop and reaches 50", () => { expect(shopLevel(0, 0, 0)).toBe(1); expect(shopLevel(4, 120, 9)).toBeGreaterThanOrEqual(50); });
});
