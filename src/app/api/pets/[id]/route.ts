import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getPetDetail } from "@/lib/queries/pets";

export const GET = handler<{ id: string }>(async ({ params, user }) => {
  const d = await getPetDetail(user, params.id);
  if (!d) throw new ApiError(404, "Pet not found");
  return ok(d);
}, { allowSuspended: true });

export const PATCH = handler<{ id: string }>(async ({ req, params, user }) => {
  const { nickname } = await body(req, z.object({ nickname: z.string().trim().min(1, "Give your pet a name").max(24).regex(/^[\p{L}\p{N} '\-]+$/u, "Letters, numbers and spaces only") }));
  const r = await db.pet.updateMany({ where: { id: params.id, userId: user.id }, data: { nickname } });
  if (!r.count) throw new ApiError(404, "Pet not found");
  return ok({ nickname });
});
