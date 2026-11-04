import { z } from "zod";
import { handler, ok, body } from "@/lib/api";
import { adminDecide } from "@/lib/referrals/service";
export const PATCH = handler<{ id: string }>(async ({ req, params, user }) => {
  const { action, note } = await body(req, z.object({ action: z.enum(["approve", "reject"]), note: z.string().max(500).optional() }));
  await adminDecide(params.id, user.id, action, note);
  return ok({});
}, { role: "ADMIN" });
