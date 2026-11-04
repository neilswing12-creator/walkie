import { handler, ok } from "@/lib/api";
import { db } from "@/lib/db";
export const GET = handler(async ({ user }) => ok(await db.leaderboardResult.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 12, select: { period: true, board: true, rank: true, score: true, tier: true, rewardCoins: true, rewardItem: true } })));
