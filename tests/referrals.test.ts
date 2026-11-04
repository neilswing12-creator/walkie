import { describe, it, expect, vi } from "vitest";
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/db", () => ({ db: {} }));
import { normalizeEmail, isDisposable, issueInstallToken, verifyInstallToken } from "@/lib/referrals/signals";
import { statusCopy } from "@/lib/referrals/service";

describe("referral signals", () => {
  it("normalizes aliases so one person can't farm with +tags or gmail dots", () => {
    expect(normalizeEmail("R.i.l.e.y+alt@Gmail.com")).toBe("riley@gmail.com");
    expect(normalizeEmail("riley@googlemail.com")).toBe("riley@gmail.com");
    expect(normalizeEmail("a.b+x@example.com")).toBe("a.b@example.com"); // dots only stripped for gmail
  });
  it("flags disposable domains", () => { expect(isDisposable("x@mailinator.com")).toBe(true); expect(isDisposable("x@example.com")).toBe(false); });
  it("install tokens are signed; forgeries are rejected", () => {
    const t = issueInstallToken();
    expect(verifyInstallToken(t)).toBeTruthy();
    expect(verifyInstallToken(t.replace(/.$/, (c) => (c === "a" ? "b" : "a")))).toBeFalsy();
    expect(verifyInstallToken("forged.token")).toBeFalsy();
  });
  it("user-facing copy never reveals fraud signals", () => {
    for (const s of ["UNDER_REVIEW", "SUSPICIOUS", "REJECTED"]) for (const role of ["referrer", "referee"] as const)
      expect(statusCopy(s, role)).not.toMatch(/device|ip|network|alias|fingerprint|fraud|score/i);
  });
});
