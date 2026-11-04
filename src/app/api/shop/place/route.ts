import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { consumeInventory } from "@/lib/ledger";
import { validatePlacement } from "@/lib/game/shop-rules";
import { PLACEABLE_CATEGORIES, type ItemCategory } from "@/lib/constants";
import { evaluateProgress } from "@/lib/game/progression";

const schema = z.object({ itemId: z.string(), x: z.number().int(), z: z.number().int(), rotation: z.number().int().min(0).max(3) });

export const POST = handler(async ({ req, user }) => {
  const p = await body(req, schema);
  const placement = await db.$transaction(async (tx) => {
    const layout = await tx.shopLayout.findUniqueOrThrow({ where: { userId: user.id }, include: { placements: { include: { item: true } } } });
    const item = await tx.item.findUnique({ where: { id: p.itemId } });
    if (!item || !PLACEABLE_CATEGORIES.includes(item.category as ItemCategory)) throw new ApiError(400, "That item can't be placed");
    if (layout.placements.length >= 200) throw new ApiError(400, "Your shop is full — expand it for more space");
    const v = validatePlacement({ x: p.x, z: p.z, rotation: p.rotation, w: item.footprintW, d: item.footprintD }, layout.placements.map((o) => ({ id: o.id, x: o.x, z: o.z, rotation: o.rotation, w: o.item.footprintW, d: o.item.footprintD })), layout.expansion);
    if (!v.ok) throw new ApiError(400, v.reason, "invalid_placement");
    await consumeInventory(tx, user.id, item.id, 1); // ownership check + removal from inventory
    return tx.shopPlacement.create({ data: { layoutId: layout.id, itemId: item.id, x: p.x, z: p.z, rotation: p.rotation } });
  });
  await evaluateProgress(user.id);
  return ok({ id: placement.id });
}, { rate: { limit: 120, windowMs: 60000 } });
