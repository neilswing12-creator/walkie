import { describe, expect, it } from "vitest";
import { privacyTrim, routeLength } from "../src/lib/route-privacy";
// straight line north from Rizal Park, one point every ~5 m
const line = (metres: number) => Array.from({ length: Math.round(metres / 5) + 1 }, (_, i) => [14.583 + (i * 5) / 111195, 120.979] as [number, number]);
describe("share route privacy trim", () => {
  it("hides 150 m at each end of a normal walk", () => {
    const r = line(2000), t = privacyTrim(r);
    expect(routeLength(t)).toBeGreaterThan(1650); expect(routeLength(t)).toBeLessThan(1710);
    expect(t[0]).not.toEqual(r[0]); expect(t[t.length - 1]).not.toEqual(r[r.length - 1]);
  });
  it("still shows a short walk (trims 20 % per end instead of everything)", () => {
    const r = line(30), t = privacyTrim(r);
    expect(t.length).toBeGreaterThanOrEqual(2);
    expect(t[0]).not.toEqual(r[0]); expect(t[t.length - 1]).not.toEqual(r[r.length - 1]);
  });
  it("never returns the exact start or finish", () => {
    for (const m of [12, 40, 200, 600]) { const r = line(m), t = privacyTrim(r); expect(t).not.toContainEqual(r[0]); expect(t).not.toContainEqual(r[r.length - 1]); }
  });
  it("too few points → no route", () => expect(privacyTrim(line(5))).toEqual([]));
});
