import { z } from "zod";
import { publicHandler, body, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { issueToken } from "@/lib/auth/account";
import { sendEmail, emails } from "@/lib/email";
import { env } from "@/lib/env";

export const POST = publicHandler(async ({ req }) => {
  const { email } = await body(req, z.object({ email: z.string().trim().email() }));
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (user && user.status !== "DELETED" && user.status !== "BANNED") {
    const token = await issueToken(user.id, "PASSWORD_RESET");
    const e = emails.reset(`${env.appUrl}/reset-password?token=${token}`);
    await sendEmail(user.email, e.subject, e.html, e.text);
  }
  return ok({ message: "If that email has an account, a reset link is on its way." }); // never reveal existence
}, { rate: { limit: 5, windowMs: 3600000, key: "forgot" } });
