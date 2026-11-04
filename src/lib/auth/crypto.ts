import { createHash, randomBytes, timingSafeEqual, createHmac } from "node:crypto";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const hmacSha256Hex = (secret: string, payload: string) => createHmac("sha256", secret).update(payload).digest("hex");
export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
