import type { Tx } from "../db";
import { ApiError } from "../api-error";
import { petLevelFromXp, petStage } from "../economy";

export async function addPetXp(tx: Tx, petId: string, xp: number) {
  const pet = await tx.pet.findUnique({ where: { id: petId }, include: { species: true } });
  if (!pet || xp <= 0) return null;
  const total = pet.xp + Math.round(xp);
  const { level } = petLevelFromXp(total, pet.species.xpPerLevel);
  const stage = petStage(level, pet.species);
  await tx.pet.update({ where: { id: petId }, data: { xp: total, level, stage } });
  return { leveledUp: level > pet.level, evolved: stage !== pet.stage, level, stage };
}

export async function getOwnedPet(tx: Tx, userId: string, petId: string) {
  const pet = await tx.pet.findFirst({ where: { id: petId, userId }, include: { species: true } });
  if (!pet) throw new ApiError(404, "Pet not found");
  return pet;
}
