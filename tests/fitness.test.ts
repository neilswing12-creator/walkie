import { describe, it, expect } from "vitest";
import { haversine, processRoute, paceSecPerKm, formatPace, estimateCalories, estimateSteps, checkPlausibility, type RawPoint } from "@/lib/fitness";

/** Builds a straight northward track: `n` points `stepM` apart every `dtSec`. */
function track(n: number, stepM: number, dtSec: number, acc = 5, startAlt: number | null = null, climb = 0): RawPoint[] {
  const dLat = stepM / 111195; // metres per degree latitude
  return Array.from({ length: n }, (_, i) => [14.5 + i * dLat, 121, 1_700_000_000_000 + i * dtSec * 1000, acc, startAlt == null ? null : startAlt + i * climb]);
}

describe("haversine", () => {
  it("matches a known distance (1° latitude ≈ 111.2 km)", () => {
    expect(haversine(0, 0, 1, 0)).toBeCloseTo(111195, -1);
  });
  it("is zero for identical points", () => expect(haversine(14.5, 121, 14.5, 121)).toBe(0));
});

describe("processRoute", () => {
  it("sums distance along a clean track", () => {
    const r = processRoute(track(101, 10, 5), false); // 100 segments × 10 m
    expect(r.distanceM).toBeGreaterThan(995);
    expect(r.distanceM).toBeLessThan(1005);
    expect(r.splits).toHaveLength(1);
    expect(r.splits[0].sec).toBeCloseTo(500, -1); // 1 km at 2 m/s
  });
  it("drops low-accuracy points", () => {
    const pts = track(20, 10, 5);
    pts[5][3] = 80;
    const r = processRoute(pts, false);
    expect(r.rejected).toBe(1);
  });
  it("rejects teleport jumps that exceed physical speed", () => {
    const pts = track(10, 10, 5);
    pts.push([pts[9][0] + 0.05, 121, pts[9][2] + 5000, 5, null]); // ~5.5 km in 5 s
    const r = processRoute(pts, true);
    expect(r.distanceM).toBeLessThan(100);
    expect(r.rejected).toBeGreaterThan(0);
  });
  it("ignores GPS jitter while standing still", () => {
    const pts: RawPoint[] = Array.from({ length: 50 }, (_, i) => [14.5 + (i % 2 ? 0.00001 : 0), 121, 1_700_000_000_000 + i * 1000, 5, null]);
    expect(processRoute(pts, false).distanceM).toBe(0);
  });
  it("computes elevation gain with hysteresis", () => {
    const r = processRoute(track(51, 10, 5, 5, 10, 1), false); // +1 m per point
    expect(r.elevationGainM).toBeGreaterThanOrEqual(45);
    expect(r.elevationGainM).toBeLessThanOrEqual(50);
  });
});

describe("pace & formatting", () => {
  it("pace is seconds per km", () => expect(paceSecPerKm(5000, 1500)).toBe(300));
  it("returns null for tiny distances", () => expect(paceSecPerKm(10, 100)).toBeNull());
  it("formats pace", () => expect(formatPace(330)).toBe("5'30\""));
  it("converts to per-mile", () => expect(formatPace(300, "imperial")).toBe("8'03\""));
});

describe("estimates", () => {
  it("MET calories scale with weight and time", () => {
    const a = estimateCalories("OUTDOOR_WALK", 3600, 70);
    expect(a).toBe(245); // 3.5 MET × 70 kg × 1 h
    expect(estimateCalories("OUTDOOR_WALK", 3600, 90)).toBeGreaterThan(a);
  });
  it("defaults to 70 kg for implausible weights", () => expect(estimateCalories("FREE_WORKOUT", 3600, 5)).toBe(350));
  it("estimates steps from stride", () => expect(estimateSteps(750, false)).toBe(1000));
});

describe("cycling", () => {
  it("allows bike speeds that would be rejected for running", () => {
    const pts = track(61, 50, 5); // 10 m/s ≈ 36 km/h
    expect(processRoute(pts, "bike").distanceM).toBeGreaterThan(2900);
    expect(processRoute(pts, "run").distanceM).toBeLessThan(100);
  });
  it("speed-based calories for rides", () => expect(estimateCalories("OUTDOOR_CYCLE", 3600, 70, 25 / 3.6)).toBe(840));
  it("no step estimates make sense for bikes but rides at car speed are flagged", () => expect(checkPlausibility("OUTDOOR_CYCLE", 100000, 3600, 3600).ok).toBe(false));
  it("normal ride ok", () => expect(checkPlausibility("ROAD_CYCLE", 30000, 3600, 3700).ok).toBe(true));
});

describe("plausibility", () => {
  it("accepts a normal run", () => expect(checkPlausibility("OUTDOOR_RUN", 5000, 1500, 1600).ok).toBe(true));
  it("flags a 'walk' at car speed", () => expect(checkPlausibility("OUTDOOR_WALK", 20000, 1200, 1200).ok).toBe(false));
  it("flags moving time > elapsed", () => expect(checkPlausibility("OUTDOOR_RUN", 1000, 900, 300).ok).toBe(false));
});
