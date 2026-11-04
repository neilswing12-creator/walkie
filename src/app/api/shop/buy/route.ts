import { z } from "zod";
import { randomUUID } from "node:crypto";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { spend, addInventory } from "@/lib/ledger";
import { isPlus } from "@/lib/payments/entitlements";
import { isAvailable } from "@/lib/queries/shop";
import { track } from "@/lib/analytics";

const schema = z.object({ itemId: z.string(), quantity: z.number().int().min(1).max(20).default(1), requestId: z.string().min(8).max(64).optional() });
const SINGLE = ["FLOOR", "WALL", "ENVIRONMENT"];

export const POST = handler(async ({ req, user }) => {
  const { itemId, quantity, requestId } = await body(req, schema);
  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item || !isAvailable(item)) throw new ApiError(404, "That item isn't available right now");
  if (item.priceCoins <= 0) throw new ApiError(403, "This one is earned through badges and events, not sold", "reward_only");
  if (item.premium && !(await isPlus(user.id))) throw new ApiError(403, "This item is part of Walkie Plus", "plus_required");
  const qty = SINGLE.includes(item.category) ? 1 : quantity;
  const total = item.priceCoins * qty;
  const result = await db.$transaction(async (tx) => {
    if (SINGLE.includes(item.category)) {
      const have = await tx.inventoryItem.findUnique({ where: { userId_itemId: { userId: user.id, itemId } } });
      if (have && have.quantity > 0) throw new ApiError(409, "You already own this");
    }
    await spend(tx, user.id, { coins: total, reason: "PURCHASE", key: `buy:${user.id}:${requestId ?? randomUUID()}`, refType: "item", refId: item.id, meta: { qty } });
    if (item.category === "BOOST" && item.key === "boost_freeze") {
      await tx.wallet.update({ where: { userId: user.id }, data: { streakFreezes: { increment: qty } } });
      return { quantity: qty, freezes: true };
    }
    const inv = await addInventory(tx, user.id, item.id, qty);
    return { quantity: inv.quantity };
  });
  const wallet = await db.wallet.findUnique({ where: { userId: user.id } });
  await track("item_purchased", user.id, { item: item.key, category: item.category, price: total });
  const unlocked = item.category === "ENVIRONMENT" ? await (await import("@/lib/achievements/engine")).evaluateAchievements(user.id) : [];
  return ok({ ...result, coins: wallet?.coins ?? 0, unlocked });
}, { rate: { limit: 40, windowMs: 60000 } });
