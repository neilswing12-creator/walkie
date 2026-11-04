import { handler, ok, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { isPlus } from "@/lib/payments/entitlements";
export const POST = handler<{ id: string }>(async ({ params, user }) => {
  const c = await db.challenge.findUnique({ where: { id: params.id }, include: { _count: { select: { participants: true } } } });
  if (!c || !c.enabled || c.endsAt < new Date()) throw new ApiError(404, "Challenge not found or finished");
  if (c.premium && !(await isPlus(user.id))) throw new ApiError(403, "This challenge is part of Walkie Plus", "plus_required");
  if (c.maxParticipants && c._count.participants >= c.maxParticipants) throw new ApiError(400, "This challenge is full");
  // team mode: the server assigns the smaller team so nobody can stack a side
  let team: string | null = null;
  if (c.teamMode) { const [p, w] = await Promise.all([db.challengeParticipant.count({ where: { challengeId: c.id, team: "PUPS" } }), db.challengeParticipant.count({ where: { challengeId: c.id, team: "WOLVES" } })]); team = p <= w ? "PUPS" : "WOLVES"; }
  await db.challengeParticipant.upsert({ where: { challengeId_userId: { challengeId: c.id, userId: user.id } }, create: { challengeId: c.id, userId: user.id, team }, update: {} });
  return ok({});
});
