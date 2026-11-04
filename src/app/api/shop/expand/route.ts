import { handler, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { spend } from "@/lib/ledger";
import { getEconomy } from "@/lib/settings";

export const POST = handler(async ({ user }) => {
  const eco = await getEconomy();
  const res = await db.$transaction(async (tx) => {
    const layout = await tx.shopLayout.findUniqueOrThrow({ where: { userId: user.id } });
    const next = layout.expansion + 1;
    const cost = eco.shopExpansionCost[next];
    if (cost == null) throw new ApiError(400, "Your shop is already at its biggest size");
    await spend(tx, user.id, { coins: cost, reason: "PURCHASE", key: `expand:${user.id}:${next}`, refType: "expansion", meta: { level: next } });
    // optimistic concurrency: only bump if nobody else did
    const u = await tx.shopLayout.updateMany({ where: { id: layout.id, expansion: layout.expansion }, data: { expansion: next } });
    if (!u.count) throw new ApiError(409, "Shop changed — try again");
    return { expansion: next, cost };
  });
  const { evaluateAchievements } = await import("@/lib/achievements/engine");
  return ok({ ...res, unlocked: await evaluateAchievements(user.id) });
});
