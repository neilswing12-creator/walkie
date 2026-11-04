import "server-only";
import { db } from "../db";
import { ApiError } from "../api-error";
import { ensureStarterWardrobe } from "./setup";
import { getEntitlement } from "../payments/entitlements";
import { isAvailable } from "../queries/shop";
import { FURS, LOOKS, SLOTS, WARDROBE, WARDROBE_BY_KEY, type Slot } from "../wardrobe";

export async function walkiePet(userId: string) {
  const husky = await db.petSpecies.findUnique({ where: { key: "husky" } });
  const pet = husky && (await db.pet.findUnique({ where: { userId_speciesId: { userId, speciesId: husky.id } }, include: { accessories: { include: { item: true } } } }));
  if (!pet) throw new ApiError(404, "Walkie not found");
  return pet;
}

export async function getWardrobe(userId: string) {
  await db.$transaction((tx) => ensureStarterWardrobe(tx, userId)).catch(() => {}); // backfill for accounts created before the wardrobe
  const [pet, items, inv, profile, looks, wallet, ent] = await Promise.all([
    walkiePet(userId),
    db.item.findMany({ where: { category: "ACCESSORY", key: { in: WARDROBE.map((w) => w.key) } } }),
    db.inventoryItem.findMany({ where: { userId, item: { category: "ACCESSORY" } }, select: { itemId: true, quantity: true } }),
    db.profile.findUnique({ where: { userId }, select: { walkieLook: true, walkieFur: true } }),
    db.savedLook.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    db.wallet.findUnique({ where: { userId }, select: { coins: true } }),
    getEntitlement(userId),
  ]);
  const owned = new Map(inv.map((i) => [i.itemId, i.quantity]));
  const order = new Map(WARDROBE.map((w, i) => [w.key, i]));
  return {
    petId: pet.id, nickname: pet.nickname, coins: wallet?.coins ?? 0, plus: ent.plus,
    look: profile?.walkieLook ?? "classic", fur: profile?.walkieFur ?? "classic",
    equipped: Object.fromEntries(pet.accessories.map((a) => [a.slot, a.item.key])) as Partial<Record<Slot, string>>,
    items: items.filter((i) => i.enabled || (owned.get(i.id) ?? 0) > 0).sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0)).map((i) => ({
      id: i.id, key: i.key, name: i.name, description: i.description, slot: i.slot as Slot, rarity: i.rarity, color: i.color, priceCoins: i.priceCoins, premium: i.premium,
      owned: (owned.get(i.id) ?? 0) > 0, rewardOnly: i.priceCoins <= 0, available: isAvailable(i),
    })),
    savedLooks: looks.map((l) => ({ id: l.id, name: l.name, items: l.items as Record<string, string> })),
  };
}

/** Server-validated outfit change: each key must exist, be owned and fit the slot. Unknown slots are ignored. */
export async function applyOutfit(userId: string, set: Partial<Record<string, string | null>>) {
  const pet = await walkiePet(userId);
  const keys = Object.values(set).filter((k): k is string => !!k);
  const items = keys.length ? await db.item.findMany({ where: { key: { in: keys }, category: "ACCESSORY" } }) : [];
  const inv = items.length ? await db.inventoryItem.findMany({ where: { userId, itemId: { in: items.map((i) => i.id) }, quantity: { gt: 0 } } }) : [];
  const ops: (() => Promise<unknown>)[] = [];
  for (const [slot, key] of Object.entries(set)) {
    if (!SLOTS.includes(slot as Slot)) continue;
    if (!key) { ops.push(() => db.equippedAccessory.deleteMany({ where: { petId: pet.id, slot } })); continue; }
    const it = items.find((i) => i.key === key);
    if (!it || !WARDROBE_BY_KEY[key]) throw new ApiError(400, "Unknown item");
    if (it.slot !== slot) throw new ApiError(400, `${it.name} doesn't go there`);
    const have = inv.find((x) => x.itemId === it.id);
    if (!have) throw new ApiError(403, `You don't own ${it.name} yet`, "not_owned");
    const inUse = await db.equippedAccessory.count({ where: { itemId: it.id, pet: { userId }, NOT: { petId: pet.id } } });
    if (inUse >= have.quantity) throw new ApiError(400, `Another pet is wearing ${it.name}`);
    ops.push(() => db.equippedAccessory.upsert({ where: { petId_slot: { petId: pet.id, slot } }, create: { petId: pet.id, slot, itemId: it.id }, update: { itemId: it.id } }));
  }
  for (const op of ops) await op();
  const after = await db.equippedAccessory.findMany({ where: { petId: pet.id }, include: { item: true } });
  return Object.fromEntries(after.map((a) => [a.slot, a.item.key]));
}

export function presetFor(look: string) {
  const preset = (LOOKS as Record<string, { preset: readonly string[] }>)[look]?.preset ?? LOOKS.classic.preset;
  const set: Record<string, string | null> = Object.fromEntries(SLOTS.map((s) => [s, null]));
  for (const k of preset) set[WARDROBE_BY_KEY[k].slot] = k;
  return set;
}
export const validLook = (l: string) => l in LOOKS;
export const validFur = (f: string) => f in FURS;
