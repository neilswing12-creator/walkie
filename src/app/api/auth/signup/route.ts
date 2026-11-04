import { z } from "zod";
import { publicHandler, body, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { hashPassword, passwordProblems } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { createUserWithSetup, sendVerification } from "@/lib/auth/account";
import { isValidTimezone } from "@/lib/dates";
import { track } from "@/lib/analytics";
import { cookies } from "next/headers";
import { onSignup, processReferral } from "@/lib/referrals/service";

const schema = z.object({
  name: z.string().trim().min(1, "Tell us your name").max(60),
  email: z.string().trim().email("That email doesn't look right").max(200),
  password: z.string(),
  timezone: z.string().optional(),
  referralCode: z.string().trim().max(20).optional(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the Terms and Privacy Policy" }) }),
});

export const POST = publicHandler(async ({ req }) => {
  const input = await body(req, schema);
  const problem = passwordProblems(input.password);
  if (problem) throw new ApiError(400, problem, "weak_password");
  const email = input.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) throw new ApiError(409, "An account with this email already exists", "email_taken");
  const user = await createUserWithSetup({
    email, name: input.name, passwordHash: await hashPassword(input.password),
    timezone: input.timezone && isValidTimezone(input.timezone) ? input.timezone : "UTC",
  });
  await createSession(user.id);
  const jar = await cookies();
  if (await onSignup(user.id, input.referralCode || jar.get("walkie_ref")?.value)) await processReferral(user.id).catch(() => {});
  jar.delete("walkie_ref");
  await sendVerification(user.id, user.email);
  await track("signup", user.id, { method: "password" });
  return ok({ id: user.id });
}, { rate: { limit: 5, windowMs: 3600000, key: "signup" } });
