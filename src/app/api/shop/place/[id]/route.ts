import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { addInventory } from "@/lib/ledger";
import { validatePlacement } from "@/lib/game/shop-rules";

const schema = z.object({ x: z.number().int(), z: z.number().int(), rotation: z.number().int().min(0).max(3) });

async function owned(userId: string, id: string) {
  const pl = await db.shopPlacement.findUnique({ where: { id }, include: { item: true, layout: { include: { placements: { include: { item: true } } } } } });
  if (!pl || pl.layout.userId !== userId) throw new ApiError(404, "Item not found in your shop");
  return pl;
}

export const PATCH = handler<{ id: string }>(async ({ req, params, user }) => {
  const p = await body(req, schema);
  const pl = await owned(user.id, params.id);
  const v = validatePlacement({ id: pl.id, x: p.x, z: p.z, rotation: p.rotation, w: pl.item.footprintW, d: pl.item.footprintD }, pl.layout.placements.map((o) => ({ id: o.id, x: o.x, z: o.z, rotation: o.rotation, w: o.item.footprintW, d: o.item.footprintD })), pl.layout.expansion);
  if (!v.ok) throw new ApiError(400, v.reason, "invalid_placement");
  await db.shopPlacement.update({ where: { id: pl.id }, data: p });
  return ok({});
}, { rate: { limit: 120, windowMs: 60000 } });

/** Removing returns the item to inventory. */
export const DELETE = handler<{ id: string }>(async ({ params, user }) => {
  const pl = await owned(user.id, params.id);
  await db.$transaction(async (tx) => {
    const r = await tx.shopPlacement.deleteMany({ where: { id: pl.id } });
    if (r.count) await addInventory(tx, user.id, pl.itemId, 1);
  });
  return ok({});
}, { rate: { limit: 120, windowMs: 60000 } });
