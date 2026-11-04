import { z } from "zod";
import { publicHandler, ok, body } from "@/lib/api";
import { db } from "@/lib/db";
import { track } from "@/lib/analytics";
export const POST = publicHandler(async ({ req }) => {
  const { email, platform, source } = await body(req, z.object({ email: z.string().trim().email("Enter a valid email").max(200), platform: z.enum(["ios", "android", "any"]).default("any"), source: z.string().max(40).optional() }));
  await db.waitlistEntry.upsert({ where: { email: email.toLowerCase() }, create: { email: email.toLowerCase(), platform, source }, update: { platform } });
  await track("waitlist_joined", null, { platform, source });
  return ok({ message: "You're on the list! Walkie will bark when the app is ready." });
}, { rate: { limit: 5, windowMs: 3600000, key: "waitlist" } });
