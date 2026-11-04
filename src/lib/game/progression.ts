/** Post-event evaluation: achievements and pet discoveries. Each unlock is idempotent. */
import { db } from "../db";
import { notify } from "../notify";
import { evaluateAchievements } from "../achievements/engine";
import { lifetimeStats, statForKind } from "./stats";
import { isPlus } from "../payments/entitlements";

export async function evaluateProgress(userId: string) {
  const stats = await lifetimeStats(userId);
  const unlockedAchievements: { title: string; coins: number; key?: string; rarity?: string; id?: string }[] = [];
  const discoveredPets: { key: string; name: string; rarity: string }[] = [];

  const unlocked = await evaluateAchievements(userId);
  unlockedAchievements.push(...unlocked.map((u) => ({ title: u.title, coins: u.coins, key: u.key, rarity: u.rarity, id: u.id })));
  const plus = await isPlus(userId);
  const species = await db.petSpecies.findMany({ where: { enabled: true, unlockType: { in: ["LEVEL", "TOTAL_DISTANCE", "TOTAL_STEPS", "STREAK", "MISSIONS"] } } });
  const ownedPets = new Set((await db.pet.findMany({ where: { userId }, select: { speciesId: true } })).map((p) => p.speciesId));
  const fresh = await lifetimeStats(userId); // achievements may have levelled the user
  for (const sp of species) {
    if (ownedPets.has(sp.id) || (sp.premium && !plus)) continue;
    if (statForKind(fresh, sp.unlockType) < sp.unlockValue) continue;
    try {
      await db.pet.create({ data: { userId, speciesId: sp.id, nickname: sp.defaultName, acquiredVia: sp.unlockType } });
      discoveredPets.push({ key: sp.key, name: sp.name, rarity: sp.rarity });
      await notify(userId, { type: "PET", title: `You discovered a ${sp.name}!`, body: `${sp.defaultName} wants to join your pet shop.`, link: "/app/explore" });
    } catch {
      /* unique constraint — already owned */
    }
  }
  if (discoveredPets.length) { const more = await evaluateAchievements(userId); unlockedAchievements.push(...more.map((u) => ({ title: u.title, coins: u.coins, key: u.key, rarity: u.rarity, id: u.id }))); }
  return { unlockedAchievements, discoveredPets };
}
