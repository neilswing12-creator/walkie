import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";

/** Apply an owned floor, wall or environment. These aren't consumed. */
export const POST = handler(async ({ req, user }) => {
  const { itemId } = await body(req, z.object({ itemId: z.string() }));
  const inv = await db.inventoryItem.findFirst({ where: { userId: user.id, itemId, quantity: { gt: 0 } }, include: { item: true } });
  if (!inv) throw new ApiError(400, "You don't own that yet");
  const c = inv.item.category;
  const data = c === "FLOOR" ? { floorKey: inv.item.key } : c === "WALL" ? { wallKey: inv.item.key } : c === "ENVIRONMENT" ? { environment: inv.item.key.replace(/^env_/, "") } : null;
  if (!data) throw new ApiError(400, "That item isn't a floor, wall or environment");
  await db.shopLayout.update({ where: { userId: user.id }, data });
  return ok(data);
});
