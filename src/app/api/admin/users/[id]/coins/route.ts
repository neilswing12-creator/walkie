import { z } from "zod";
import { randomUUID } from "node:crypto";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { grant, spend } from "@/lib/ledger";
import { audit } from "@/lib/audit";
import { requireReauth } from "@/lib/auth/session";

/** Support adjustments (e.g. compensating a bug). Always ledgered and audited. */
export const POST = handler<{ id: string }>(async ({ req, params, user }) => {
  const { amount, reason, confirmPassword } = await body(req, z.object({ amount: z.number().int().min(-100000).max(100000).refine((n) => n !== 0), reason: z.string().min(3).max(200), confirmPassword: z.string().max(200).optional() }));
  if (params.id === user.id) throw new ApiError(403, "You can't adjust your own balance");
  if (!(await db.user.findUnique({ where: { id: params.id } }))) throw new ApiError(404, "User not found");
  await requireReauth(user, confirmPassword);
  const key = `admin:${randomUUID()}`;
  await db.$transaction(async (tx) => { if (amount > 0) await grant(tx, params.id, { coins: amount, reason: "ADMIN_ADJUST", key, meta: { by: user.id, reason } }); else await spend(tx, params.id, { coins: -amount, reason: "ADMIN_ADJUST", key, meta: { by: user.id, reason } }); });
  await audit(user.id, "user.coins_adjust", "user", params.id, { amount, reason });
  return ok({});
}, { role: "ADMIN" });
