import { describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";
vi.mock("@/lib/env", () => ({ env: { paymongo: { secretKey: "sk", webhookSecret: "whsk_unit", methods: [] }, appUrl: "http://x" } }));
import { verifyPaymongoSignature } from "@/lib/payments/paymongo";

const sign = (raw: string, t: number, secret = "whsk_unit") => createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
describe("PayMongo webhook signatures", () => {
  const raw = '{"data":{"id":"evt_1"}}'; const now = 1_800_000_000_000; const t = now / 1000;
  it("accepts a valid live signature and checks the right part", () => {
    expect(verifyPaymongoSignature(raw, `t=${t},te=,li=${sign(raw, t)}`, true, "whsk_unit", now)).toBe(true);
    expect(verifyPaymongoSignature(raw, `t=${t},te=${sign(raw, t)},li=`, true, "whsk_unit", now)).toBe(false); // test sig can't pass as live
    expect(verifyPaymongoSignature(raw, `t=${t},te=${sign(raw, t)},li=`, false, "whsk_unit", now)).toBe(true);
  });
  it("rejects tampering, wrong secrets, missing headers and replays", () => {
    expect(verifyPaymongoSignature(raw + " ", `t=${t},te=,li=${sign(raw, t)}`, true, "whsk_unit", now)).toBe(false);
    expect(verifyPaymongoSignature(raw, `t=${t},te=,li=${sign(raw, t, "other")}`, true, "whsk_unit", now)).toBe(false);
    expect(verifyPaymongoSignature(raw, null, true, "whsk_unit", now)).toBe(false);
    expect(verifyPaymongoSignature(raw, `t=${t - 600},te=,li=${sign(raw, t - 600)}`, true, "whsk_unit", now)).toBe(false);
    expect(verifyPaymongoSignature(raw, `t=${t},te=,li=${sign(raw, t)}`, true, "", now)).toBe(false); // no secret configured → nothing verifies
  });
});
