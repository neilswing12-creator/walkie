import { z } from "zod";
import { handler, ok, body } from "@/lib/api";
import { applyOutfit } from "@/lib/game/wardrobe";
import { track } from "@/lib/analytics";
const slot = z.string().max(40).nullable().optional();
export const POST = handler(async ({ req, user }) => {
  const { set } = await body(req, z.object({ set: z.object({ HEAD: slot, FACE: slot, NECK: slot, BODY: slot, BACK: slot, FEET: slot }).strict() }));
  const equipped = await applyOutfit(user.id, set);
  await track("outfit_changed", user.id, { slots: Object.keys(set).length });
  return ok({ equipped });
}, { rate: { limit: 120, windowMs: 60000 } });
