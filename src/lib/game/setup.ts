import type { Tx } from "../db";
import { grant, addInventory } from "../ledger";
import { ECONOMY_DEFAULTS } from "../economy";
import { STARTER_WARDROBE } from "../wardrobe";

/** Creates everything a brand-new account needs. Idempotent. */
export async function setupNewUser(tx: Tx, userId: string, starterCoins = ECONOMY_DEFAULTS.starterCoins) {
  await tx.profile.upsert({ where: { userId }, create: { userId }, update: {} });
  await tx.wallet.upsert({ where: { userId }, create: { userId }, update: {} });
  await tx.streak.upsert({ where: { userId }, create: { userId }, update: {} });
  await tx.shopLayout.upsert({ where: { userId }, create: { userId }, update: {} });
  const husky = await tx.petSpecies.findUnique({ where: { key: "husky" } });
  if (husky) {
    const pet = await tx.pet.upsert({
      where: { userId_speciesId: { userId, speciesId: husky.id } },
      create: { userId, speciesId: husky.id, nickname: "Walkie", acquiredVia: "DEFAULT" },
      update: {},
    });
    await tx.profile.update({ where: { userId }, data: { activePetId: pet.id } });
  }
  const starter = await tx.item.findMany({ where: { key: { in: ["food_kibble", "deco_bush", "furn_bench", "floor_grass", "wall_picket"] } } });
  const qty: Record<string, number> = { food_kibble: 3, deco_bush: 2, furn_bench: 1, floor_grass: 1, wall_picket: 1 };
  const already = await tx.ledgerEntry.findUnique({ where: { idempotencyKey: `starter:${userId}` } });
  if (!already) for (const it of starter) await addInventory(tx, userId, it.id, qty[it.key] ?? 1);
  await grant(tx, userId, { coins: starterCoins, xp: 0, reason: "STARTER", key: `starter:${userId}` });
  await ensureStarterWardrobe(tx, userId);
}

/** Free starter clothes so every look's preset is wearable. Idempotent (ledger key), safe for existing users. */
export async function ensureStarterWardrobe(tx: Tx, userId: string) {
  const g = await grant(tx, userId, { coins: 0, xp: 0, reason: "STARTER", key: `starter-wardrobe:${userId}` }); // claims the key first
  if (g.duplicate) return false;
  const items = await tx.item.findMany({ where: { key: { in: STARTER_WARDROBE } } });
  for (const it of items) {
    const have = await tx.inventoryItem.findUnique({ where: { userId_itemId: { userId, itemId: it.id } } });
    if (!have?.quantity) await addInventory(tx, userId, it.id, 1);
  }
  // brand-new Walkie starts in the classic bandana (only if nothing is worn yet)
  const bandana = items.find((i) => i.key === "acc_bandana");
  const husky = await tx.petSpecies.findUnique({ where: { key: "husky" } });
  const pet = husky && (await tx.pet.findUnique({ where: { userId_speciesId: { userId, speciesId: husky.id } }, include: { accessories: true } }));
  if (bandana && pet && pet.accessories.length === 0) await tx.equippedAccessory.create({ data: { petId: pet.id, slot: "NECK", itemId: bandana.id } });
  return true;
}
