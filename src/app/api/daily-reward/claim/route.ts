import { handler, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { userContext } from "@/lib/context";
import { addDays } from "@/lib/dates";
import { DAILY_REWARDS } from "@/lib/economy";
import { grant, addInventory } from "@/lib/ledger";
import { track } from "@/lib/analytics";

/** One claim per user per local day — enforced by the (userId, date) unique index, not just this check. */
export const POST = handler(async ({ user }) => {
  const ctx = await userContext(user);
  const result = await db.$transaction(async (tx) => {
    if (await tx.dailyRewardClaim.findUnique({ where: { userId_date: { userId: user.id, date: ctx.today } } })) throw new ApiError(409, "You've already claimed today's reward. Come back tomorrow!", "already_claimed");
    const prev = await tx.dailyRewardClaim.findUnique({ where: { userId_date: { userId: user.id, date: addDays(ctx.today, -1) } } });
    const day = prev ? (prev.streakDay % 7) + 1 : 1;
    const def = DAILY_REWARDS[day - 1];
    try {
      await tx.dailyRewardClaim.create({ data: { userId: user.id, date: ctx.today, streakDay: day, reward: def as object } });
    } catch {
      throw new ApiError(409, "You've already claimed today's reward.", "already_claimed");
    }
    const g = await grant(tx, user.id, { coins: def.coins, xp: def.xp, reason: "DAILY_REWARD", key: `daily:${user.id}:${ctx.today}`, meta: { day } });
    const items: { name: string; qty: number }[] = [];
    for (const it of def.items ?? []) {
      const item = await tx.item.findUnique({ where: { key: it.key } });
      if (item) { await addInventory(tx, user.id, item.id, it.qty); items.push({ name: item.name, qty: it.qty }); }
    }
    return { day, coins: def.coins, xp: def.xp, items, leveledUp: g.leveledUp, level: g.level };
  });
  await track("daily_reward_claimed", user.id, { day: result.day });
  return ok(result);
}, { rate: { limit: 10, windowMs: 60000 } });
