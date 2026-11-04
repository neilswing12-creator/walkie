import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { userContext } from "@/lib/context";
import { consumeInventory } from "@/lib/ledger";
import { addPetXp, getOwnedPet } from "@/lib/game/pets";
import { bumpMissions } from "@/lib/game/missions";
import { effectivePetStats } from "@/lib/economy";

const schema = z.object({ action: z.enum(["feed", "play", "pet"]), itemId: z.string().optional() });
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export const POST = handler<{ id: string }>(async ({ req, params, user }) => {
  const { action, itemId } = await body(req, schema);
  const ctx = await userContext(user);
  const result = await db.$transaction(async (tx) => {
    const pet = await getOwnedPet(tx, user.id, params.id);
    const now = new Date();
    const cur = effectivePetStats(pet, now);
    let dh = 0, de = 0, xp = 0;
    let mission: "FEED_PET" | "PLAY_PET" | null = null;
    if (action === "feed") {
      if (!itemId) throw new ApiError(400, "Pick a snack to feed");
      const item = await tx.item.findUnique({ where: { id: itemId } });
      if (!item || item.category !== "FOOD") throw new ApiError(400, "That's not food!");
      if (cur.energy >= 100) throw new ApiError(400, `${pet.nickname} is full right now`, "full");
      await consumeInventory(tx, user.id, item.id, 1);
      const e = (item.effect as { energy?: number; happiness?: number; xp?: number }) ?? {};
      de = e.energy ?? 10; dh = e.happiness ?? 5; xp = e.xp ?? 5; mission = "FEED_PET";
    } else if (action === "play") {
      if (pet.lastPlayedAt && now.getTime() - pet.lastPlayedAt.getTime() < ctx.economy.petPlayCooldownMin * 60000) {
        const mins = Math.ceil((ctx.economy.petPlayCooldownMin * 60000 - (now.getTime() - pet.lastPlayedAt.getTime())) / 60000);
        throw new ApiError(429, `${pet.nickname} needs a rest — play again in ${mins} min`, "cooldown");
      }
      if (cur.energy < 15) throw new ApiError(400, `${pet.nickname} is too tired to play. Try a snack first!`, "tired");
      // owning a toy gives a bonus (best toy wins), toys are not consumed
      const toys = await tx.inventoryItem.findMany({ where: { userId: user.id, quantity: { gt: 0 }, item: { category: "TOY" } }, include: { item: true } });
      const bonus = Math.max(0, ...toys.map((t) => (t.item.effect as { xp?: number })?.xp ?? 0));
      dh = 15; de = -10; xp = 15 + bonus; mission = "PLAY_PET";
    } else {
      if (pet.lastPettedAt && now.getTime() - pet.lastPettedAt.getTime() < ctx.economy.petPetCooldownMin * 60000) return { pet: { happiness: cur.happiness, energy: cur.energy }, xp: 0, note: "already_petted" };
      dh = 6; xp = 3;
    }
    const updated = await tx.pet.update({
      where: { id: pet.id },
      data: { happiness: clamp(cur.happiness + dh), energy: clamp(cur.energy + de), ...(action === "feed" ? { lastFedAt: now } : action === "play" ? { lastPlayedAt: now } : { lastPettedAt: now }) },
    });
    const lvl = await addPetXp(tx, pet.id, xp);
    if (mission) await bumpMissions(tx, user.id, ctx.today, mission, 1, "add", ctx.plus);
    return { pet: { happiness: updated.happiness, energy: updated.energy, level: lvl?.level, stage: lvl?.stage }, xp, leveledUp: lvl?.leveledUp, evolved: lvl?.evolved };
  });
  const { evaluateAchievements } = await import("@/lib/achievements/engine");
  return ok({ ...result, unlocked: result.leveledUp || result.evolved ? await evaluateAchievements(user.id) : [] });
}, { rate: { limit: 60, windowMs: 60000 } });
