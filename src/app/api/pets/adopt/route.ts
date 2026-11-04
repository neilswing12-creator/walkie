import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { spend } from "@/lib/ledger";
import { isPlus } from "@/lib/payments/entitlements";
import { notify } from "@/lib/notify";
import { evaluateProgress } from "@/lib/game/progression";

export const POST = handler(async ({ req, user }) => {
  const { speciesId } = await body(req, z.object({ speciesId: z.string() }));
  const sp = await db.petSpecies.findUnique({ where: { id: speciesId } });
  if (!sp || !sp.enabled || sp.unlockType !== "PURCHASE" || !sp.priceCoins) throw new ApiError(400, "This pet can't be adopted with coins");
  if (sp.premium && !(await isPlus(user.id))) throw new ApiError(403, "This pet is part of Walkie Plus", "plus_required");
  const pet = await db.$transaction(async (tx) => {
    if (await tx.pet.findUnique({ where: { userId_speciesId: { userId: user.id, speciesId } } })) throw new ApiError(409, "You already have this pet");
    await spend(tx, user.id, { coins: sp.priceCoins!, reason: "PET_UNLOCK", key: `adopt:${user.id}:${sp.id}`, refType: "species", refId: sp.id });
    return tx.pet.create({ data: { userId: user.id, speciesId, nickname: sp.defaultName, acquiredVia: "PURCHASE" } });
  });
  await notify(user.id, { type: "PET", title: `Welcome home, ${pet.nickname}!`, body: `Your new ${sp.name} has joined the pet shop.`, link: `/app/pets/${pet.id}` });
  await evaluateProgress(user.id);
  return ok({ id: pet.id });
}, { rate: { limit: 20, windowMs: 60000 } });
