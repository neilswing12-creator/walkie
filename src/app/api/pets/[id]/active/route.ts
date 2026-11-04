import { handler, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
export const POST = handler<{ id: string }>(async ({ params, user }) => {
  const pet = await db.pet.findFirst({ where: { id: params.id, userId: user.id } });
  if (!pet) throw new ApiError(404, "Pet not found");
  await db.profile.update({ where: { userId: user.id }, data: { activePetId: pet.id } });
  return ok({});
});
