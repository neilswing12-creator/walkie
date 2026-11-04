import { handler, ok } from "@/lib/api";
import { sendVerification } from "@/lib/auth/account";

export const POST = handler(async ({ user }) => {
  if (user.emailVerified) return ok({ alreadyVerified: true });
  const r = await sendVerification(user.id, user.email);
  return ok({ sent: r.sent });
}, { rate: { limit: 3, windowMs: 3600000, key: "verify-resend" }, allowSuspended: true });
