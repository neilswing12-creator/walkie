import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";

const schema = z.object({ slot: z.enum(["HEAD", "FACE", "NECK", "BODY", "BACK", "FEET"]), itemId: z.string().nullable() });

export const POST = handler<{ id: string }>(async ({ req, params, user }) => {
  const { slot, itemId } = await body(req, schema);
  const pet = await db.pet.findFirst({ where: { id: params.id, userId: user.id }, include: { species: true } });
  if (!pet) throw new ApiError(404, "Pet not found");
  if (pet.species.key !== "husky" && !["HEAD", "FACE", "NECK", "BACK"].includes(slot)) throw new ApiError(400, "Only Walkie can wear clothes and shoes");
  if (!itemId) {
    await db.equippedAccessory.deleteMany({ where: { petId: pet.id, slot } });
    return ok({});
  }
  const inv = await db.inventoryItem.findFirst({ where: { userId: user.id, itemId, quantity: { gt: 0 } }, include: { item: true } });
  if (!inv || inv.item.category !== "ACCESSORY") throw new ApiError(400, "You don't own that accessory");
  if (inv.item.slot !== slot) throw new ApiError(400, "That accessory doesn't go there");
  // An accessory can be worn by as many pets as you own copies of it.
  const inUse = await db.equippedAccessory.count({ where: { itemId, pet: { userId: user.id }, NOT: { petId: pet.id } } });
  if (inUse >= inv.quantity) throw new ApiError(400, "Another pet is wearing that one — buy another or swap it over");
  await db.equippedAccessory.upsert({ where: { petId_slot: { petId: pet.id, slot } }, create: { petId: pet.id, slot, itemId }, update: { itemId } });
  return ok({});
});
