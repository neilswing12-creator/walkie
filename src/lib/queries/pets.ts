import "server-only";
import { db } from "../db";
import { userContext } from "../context";
import { lifetimeStats, statForKind } from "../game/stats";
import { effectivePetStats, petLevelFromXp } from "../economy";
import type { CurrentUser } from "../auth/session";

export function unlockHint(sp: { unlockType: string; unlockValue: number; priceCoins: number | null; premium: boolean }) {
  switch (sp.unlockType) {
    case "DEFAULT": return "Your first companion";
    case "LEVEL": return `Reach level ${sp.unlockValue}`;
    case "TOTAL_DISTANCE": return `Travel ${sp.unlockValue / 1000} km in total`;
    case "TOTAL_STEPS": return `Take ${sp.unlockValue.toLocaleString()} steps`;
    case "STREAK": return `Keep a ${sp.unlockValue}-day streak`;
    case "MISSIONS": return `Complete ${sp.unlockValue} missions`;
    case "PURCHASE": return `Adopt for ${sp.priceCoins?.toLocaleString()} coins`;
    case "EVENT": return "Limited-time event";
    default: return "Special unlock";
  }
}

export async function getPetCollection(user: CurrentUser) {
  const ctx = await userContext(user);
  const [species, owned, stats] = await Promise.all([
    db.petSpecies.findMany({ where: { enabled: true }, orderBy: { sort: "asc" } }),
    db.pet.findMany({ where: { userId: user.id }, include: { accessories: { include: { item: true } } } }),
    lifetimeStats(user.id),
  ]);
  return {
    activePetId: ctx.profile.activePetId, plus: ctx.plus,
    pets: species.map((sp) => {
      const p = owned.find((o) => o.speciesId === sp.id);
      const progress = ["PURCHASE", "DEFAULT", "EVENT", "ACHIEVEMENT"].includes(sp.unlockType) ? null : Math.min(1, statForKind(stats, sp.unlockType) / Math.max(1, sp.unlockValue));
      return {
        speciesId: sp.id, key: sp.key, name: sp.name, rarity: sp.rarity, description: sp.description, personality: sp.personality,
        premium: sp.premium, unlockType: sp.unlockType, priceCoins: sp.priceCoins, hint: unlockHint(sp), progress, imageUrl: sp.imageUrl,
        owned: p && { id: p.id, nickname: p.nickname, stage: p.stage, ...effectivePetStats(p), ...petLevelFromXp(p.xp, sp.xpPerLevel), accessories: p.accessories.map((a) => ({ slot: a.slot, key: a.item.key, color: a.item.color, name: a.item.name })) },
      };
    }),
  };
}
export type PetCollection = Awaited<ReturnType<typeof getPetCollection>>;

export async function getPetDetail(user: CurrentUser, petId: string) {
  const ctx = await userContext(user);
  const pet = await db.pet.findFirst({ where: { id: petId, userId: user.id }, include: { species: true, accessories: { include: { item: true } } } });
  if (!pet) return null;
  const inv = await db.inventoryItem.findMany({ where: { userId: user.id, quantity: { gt: 0 }, item: { category: { in: ["FOOD", "TOY", "ACCESSORY"] } } }, include: { item: true } });
  return {
    isActive: ctx.profile.activePetId === pet.id,
    pet: { id: pet.id, nickname: pet.nickname, stage: pet.stage, xp: pet.xp, acquiredAt: pet.acquiredAt.toISOString(), acquiredVia: pet.acquiredVia, ...effectivePetStats(pet), ...petLevelFromXp(pet.xp, pet.species.xpPerLevel),
      lastPlayedAt: pet.lastPlayedAt?.toISOString() ?? null, lastPettedAt: pet.lastPettedAt?.toISOString() ?? null,
      accessories: pet.accessories.map((a) => ({ slot: a.slot, itemId: a.itemId, key: a.item.key, color: a.item.color, name: a.item.name })) },
    species: { key: pet.species.key, name: pet.species.name, rarity: pet.species.rarity, personality: pet.species.personality, description: pet.species.description, youngAtLevel: pet.species.youngAtLevel, adultAtLevel: pet.species.adultAtLevel, specialAtLevel: pet.species.specialAtLevel },
    inventory: inv.map((i) => ({ itemId: i.itemId, key: i.item.key, name: i.item.name, category: i.item.category, quantity: i.quantity, slot: i.item.slot, color: i.item.color, effect: i.item.effect as Record<string, number> | null })),
  };
}
