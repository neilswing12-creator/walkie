import { handler, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { grant } from "@/lib/ledger";
export const POST = handler<{ id: string }>(async ({ params, user }) => {
  const r = await db.$transaction(async (tx) => {
    const p = await tx.challengeParticipant.findUnique({ where: { challengeId_userId: { challengeId: params.id, userId: user.id } }, include: { challenge: true } });
    if (!p?.completedAt) throw new ApiError(400, "Finish the challenge first");
    const u = await tx.challengeParticipant.updateMany({ where: { id: p.id, claimedAt: null }, data: { claimedAt: new Date() } });
    if (!u.count) throw new ApiError(409, "Already claimed", "already_claimed");
    await grant(tx, user.id, { coins: p.challenge.rewardCoins, xp: p.challenge.rewardXp, reason: "CHALLENGE", key: `challenge:${p.id}`, refType: "challenge", refId: p.challengeId });
    return { coins: p.challenge.rewardCoins, xp: p.challenge.rewardXp };
  });
  const { evaluateAchievements } = await import("@/lib/achievements/engine");
  return ok({ ...r, unlocked: await evaluateAchievements(user.id) });
});
