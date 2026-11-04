import { z } from "zod";
import { publicHandler, ok, body } from "@/lib/api";
import { db } from "@/lib/db";
export const POST = publicHandler(async ({ req, user }) => {
  const i = await body(req, z.object({ email: z.string().trim().email().max(200), subject: z.string().trim().min(3).max(120), message: z.string().trim().min(10, "Tell us a little more").max(4000), website: z.string().max(0).optional() /* honeypot */ }));
  await db.supportTicket.create({ data: { userId: user?.id ?? null, email: i.email, subject: i.subject, message: i.message } });
  return ok({ message: "Thanks! We'll reply by email soon." });
}, { rate: { limit: 5, windowMs: 3600000, key: "support" } });
