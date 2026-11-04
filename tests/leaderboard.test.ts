import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { weekStart, periodKey, periodRange, previousPeriod, tierFor } from "@/lib/leaderboard/service";
import { LEADERBOARD_DEFAULTS as cfg } from "@/lib/leaderboard/settings";

describe("leaderboard periods (resets)", () => {
  it("weeks start on the configured day", () => {
    expect(weekStart("2026-11-04", 1)).toBe("2026-11-02"); // Wed → Mon
    expect(weekStart("2026-11-02", 1)).toBe("2026-11-02");
    expect(weekStart("2026-11-01", 1)).toBe("2026-10-26"); // Sunday belongs to the previous Mon-week
    expect(weekStart("2026-11-04", 0)).toBe("2026-11-01"); // Sunday-start weeks
  });
  it("period keys and ranges", () => {
    expect(periodKey("day", "2026-11-04", cfg)).toBe("D:2026-11-04");
    expect(periodKey("week", "2026-11-04", cfg)).toBe("W:2026-11-02");
    expect(periodKey("month", "2026-11-04", cfg)).toBe("M:2026-11");
    expect(periodRange("W:2026-11-02")).toEqual(["2026-11-02", "2026-11-08"]);
    expect(periodRange("M:2026-02")).toEqual(["2026-02-01", "2026-02-28"]);
    expect(periodRange("M:2028-02")).toEqual(["2028-02-01", "2028-02-29"]);
    expect(periodRange("A")).toEqual([null, null]);
  });
  it("previous periods for settlement", () => {
    expect(previousPeriod("week", "2026-11-04", cfg)).toBe("W:2026-10-26");
    expect(previousPeriod("month", "2026-11-04", cfg)).toBe("M:2026-10");
    expect(previousPeriod("month", "2026-01-15", cfg)).toBe("M:2025-12");
  });
  it("tiers reward personal effort at every level", () => {
    expect(tierFor(100, cfg)).toBeNull();
    expect(tierFor(400, cfg)?.key).toBe("BRONZE");
    expect(tierFor(4500, cfg)?.key).toBe("GOLD");
    expect(tierFor(99999, cfg)?.key).toBe("DIAMOND");
  });
});
