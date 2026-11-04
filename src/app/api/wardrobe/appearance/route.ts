import { z } from "zod";
import { handler, ok, body } from "@/lib/api";
import { db } from "@/lib/db";
import { applyOutfit, presetFor } from "@/lib/game/wardrobe";
import { FURS, LOOKS } from "@/lib/wardrobe";
/** Presentation style + fur tone (optional, changeable any time, never inferred from gender). `reset` re-dresses the look's starter outfit. */
export const PATCH = handler(async ({ req, user }) => {
  const b = await body(req, z.object({ look: z.enum(Object.keys(LOOKS) as [string, ...string[]]).optional(), fur: z.enum(Object.keys(FURS) as [string, ...string[]]).optional(), reset: z.boolean().optional() }));
  const p = await db.profile.update({ where: { userId: user.id }, data: { ...(b.look ? { walkieLook: b.look } : {}), ...(b.fur ? { walkieFur: b.fur } : {}) } });
  const equipped = b.reset ? await applyOutfit(user.id, presetFor(p.walkieLook)) : undefined;
  return ok({ look: p.walkieLook, fur: p.walkieFur, equipped });
});
