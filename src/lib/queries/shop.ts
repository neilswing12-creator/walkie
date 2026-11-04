import "server-only";
import { db } from "../db";
import { userContext } from "../context";
import { gridSize } from "../game/shop-rules";
import type { CurrentUser } from "../auth/session";

export function isAvailable(it: { enabled: boolean; availableFrom: Date | null; availableTo: Date | null }, now = new Date()) {
  return it.enabled && (!it.availableFrom || it.availableFrom <= now) && (!it.availableTo || it.availableTo >= now);
}

export async function getShopState(userId: string) {
  const layout = await db.shopLayout.upsert({ where: { userId }, create: { userId }, update: {}, include: { placements: { include: { item: true } } } });
  const [inventory, pets] = await Promise.all([
    db.inventoryItem.findMany({ where: { userId }, include: { item: true } }),
    db.pet.findMany({ where: { userId }, include: { species: { select: { key: true } } } }),
  ]);
  return {
    layout: { id: layout.id, name: layout.name, environment: layout.environment, expansion: layout.expansion, size: gridSize(layout.expansion), floorKey: layout.floorKey, wallKey: layout.wallKey },
    placements: layout.placements.map((p) => ({ id: p.id, itemId: p.itemId, key: p.item.key, model: p.item.model ?? "bush", color: p.item.color ?? "#9ccf9c", x: p.x, z: p.z, rotation: p.rotation, w: p.item.footprintW, d: p.item.footprintD, name: p.item.name })),
    inventory: inventory.filter((i) => i.quantity > 0 || ["FLOOR", "WALL", "ENVIRONMENT"].includes(i.item.category)).map((i) => ({ itemId: i.itemId, key: i.item.key, name: i.item.name, category: i.item.category, quantity: i.quantity, model: i.item.model, color: i.item.color, w: i.item.footprintW, d: i.item.footprintD, rarity: i.item.rarity })),
    pets: pets.map((p) => ({ id: p.id, species: p.species.key, nickname: p.nickname, happiness: p.happiness })),
  };
}
export type ShopState = Awaited<ReturnType<typeof getShopState>>;

export async function getCatalog(user: CurrentUser) {
  const ctx = await userContext(user);
  const [items, wallet, inv, species, ownedPets] = await Promise.all([
    db.item.findMany({ where: { enabled: true }, orderBy: [{ category: "asc" }, { sort: "asc" }] }),
    db.wallet.findUnique({ where: { userId: user.id } }),
    db.inventoryItem.findMany({ where: { userId: user.id } }),
    db.petSpecies.findMany({ where: { enabled: true, unlockType: "PURCHASE" }, orderBy: { sort: "asc" } }),
    db.pet.findMany({ where: { userId: user.id }, select: { speciesId: true } }),
  ]);
  const now = new Date();
  return {
    coins: wallet?.coins ?? 0, plus: ctx.plus,
    items: items.filter((i) => isAvailable(i, now) && i.priceCoins > 0).map((i) => ({
      id: i.id, key: i.key, name: i.name, description: i.description, category: i.category, rarity: i.rarity, priceCoins: i.priceCoins,
      premium: i.premium, seasonal: i.seasonal, model: i.model, color: i.color, w: i.footprintW, d: i.footprintD, slot: i.slot,
      owned: inv.find((x) => x.itemId === i.id)?.quantity ?? 0, locked: i.premium && !ctx.plus,
    })),
    adoptable: species.map((s) => ({ id: s.id, key: s.key, name: s.name, rarity: s.rarity, priceCoins: s.priceCoins ?? 0, premium: s.premium, owned: ownedPets.some((p) => p.speciesId === s.id), description: s.description })),
  };
}
export type Catalog = Awaited<ReturnType<typeof getCatalog>>;
