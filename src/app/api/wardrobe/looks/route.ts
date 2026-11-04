import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { walkiePet } from "@/lib/game/wardrobe";
export const POST = handler(async ({ req, user }) => {
  const { name } = await body(req, z.object({ name: z.string().trim().min(1).max(30) }));
  if ((await db.savedLook.count({ where: { userId: user.id } })) >= 12) throw new ApiError(400, "You can save up to 12 looks — delete one first");
  const pet = await walkiePet(user.id);
  const items = Object.fromEntries(pet.accessories.map((a) => [a.slot, a.item.key])); // saved from the server's state, not the client's
  const look = await db.savedLook.create({ data: { userId: user.id, name, items } });
  return ok({ id: look.id, name: look.name, items });
});
