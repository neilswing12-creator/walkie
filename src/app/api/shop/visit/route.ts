import { handler, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { userContext } from "@/lib/context";
import { bumpMissions } from "@/lib/game/missions";
export const POST = handler(async ({ user }) => {
  const ctx = await userContext(user);
  await db.$transaction((tx) => bumpMissions(tx, user.id, ctx.today, "VISIT_SHOP", 1, "max", ctx.plus));
  return ok({});
}, { rate: { limit: 30, windowMs: 60000 } });
