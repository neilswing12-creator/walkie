import { handler, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { applyOutfit } from "@/lib/game/wardrobe";
import { SLOTS } from "@/lib/wardrobe";
export const DELETE = handler<{ id: string }>(async ({ params, user }) => {
  await db.savedLook.deleteMany({ where: { id: params.id, userId: user.id } });
  return ok({});
});
/** Wear a saved look (items no longer owned are skipped, never granted). */
export const POST = handler<{ id: string }>(async ({ params, user }) => {
  const l = await db.savedLook.findFirst({ where: { id: params.id, userId: user.id } });
  if (!l) throw new ApiError(404, "Look not found");
  const items = l.items as Record<string, string>;
  const owned = new Set((await db.inventoryItem.findMany({ where: { userId: user.id, quantity: { gt: 0 }, item: { key: { in: Object.values(items) } } }, include: { item: true } })).map((i) => i.item.key));
  const set = Object.fromEntries(SLOTS.map((s) => [s, items[s] && owned.has(items[s]) ? items[s] : null]));
  return ok({ equipped: await applyOutfit(user.id, set), skipped: Object.values(items).filter((k) => !owned.has(k)).length });
});
