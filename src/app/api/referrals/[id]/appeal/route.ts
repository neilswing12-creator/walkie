import { z } from "zod";
import { handler, ok, body } from "@/lib/api";
import { appeal } from "@/lib/referrals/service";
export const POST = handler<{ id: string }>(async ({ req, params, user }) => {
  const { text } = await body(req, z.object({ text: z.string().trim().min(10, "Tell us a little more").max(1000) }));
  await appeal(user.id, params.id, text);
  return ok({ message: "Thanks — a person will review this soon." });
}, { rate: { limit: 5, windowMs: 86400000, key: "ref-appeal" } });
