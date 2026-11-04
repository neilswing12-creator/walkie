/**
 * The currency ledger. Every coin/XP change goes through here inside a DB transaction.
 * - idempotencyKey (unique) makes double-submits and retries harmless
 * - spend() uses a conditional update (coins >= price) so concurrent purchases cannot overdraw
 */
import type { Tx } from "./db";
import { levelFromXp } from "./economy";
import { ApiError } from "./api-error";

export async function grant(tx: Tx, userId: string, p: { coins?: number; xp?: number; points?: number; reason: string; key: string; refType?: string; refId?: string; meta?: object }) {
  const existing = await tx.ledgerEntry.findUnique({ where: { idempotencyKey: p.key } });
  if (existing) return { duplicate: true as const, leveledUp: false, level: 0 };
  const coins = Math.max(0, Math.floor(p.coins ?? 0));
  const xp = Math.max(0, Math.floor(p.xp ?? 0));
  const points = Math.max(0, Math.floor(p.points ?? 0));
  await tx.ledgerEntry.create({ data: { userId, coins, xp, points, reason: p.reason, idempotencyKey: p.key, refType: p.refType, refId: p.refId, meta: p.meta as any } });
  const w = await tx.wallet.upsert({
    where: { userId },
    create: { userId, coins, lifetimeCoins: coins, xp, points, lifetimePoints: points },
    update: { coins: { increment: coins }, lifetimeCoins: { increment: coins }, xp: { increment: xp }, points: { increment: points }, lifetimePoints: { increment: points } },
  });
  const { level } = levelFromXp(w.xp);
  const leveledUp = level > w.level;
  if (leveledUp) await tx.wallet.update({ where: { userId }, data: { level } });
  return { duplicate: false as const, leveledUp, level };
}

export async function spend(tx: Tx, userId: string, p: { coins: number; reason: string; key: string; refType?: string; refId?: string; meta?: object }) {
  const amount = Math.floor(p.coins);
  if (amount < 0) throw new ApiError(400, "Invalid amount");
  const existing = await tx.ledgerEntry.findUnique({ where: { idempotencyKey: p.key } });
  if (existing) throw new ApiError(409, "This purchase was already processed", "duplicate");
  const res = await tx.wallet.updateMany({ where: { userId, coins: { gte: amount } }, data: { coins: { decrement: amount } } });
  if (res.count === 0) throw new ApiError(402, "Not enough coins yet — a walk will fix that!", "insufficient_funds");
  await tx.ledgerEntry.create({ data: { userId, coins: -amount, reason: p.reason, idempotencyKey: p.key, refType: p.refType, refId: p.refId, meta: p.meta as any } });
}

export async function addInventory(tx: Tx, userId: string, itemId: string, qty: number) {
  return tx.inventoryItem.upsert({ where: { userId_itemId: { userId, itemId } }, create: { userId, itemId, quantity: qty }, update: { quantity: { increment: qty } } });
}

export async function consumeInventory(tx: Tx, userId: string, itemId: string, qty = 1) {
  const res = await tx.inventoryItem.updateMany({ where: { userId, itemId, quantity: { gte: qty } }, data: { quantity: { decrement: qty } } });
  if (res.count === 0) throw new ApiError(400, "You don't have that item in your inventory", "not_owned");
}
