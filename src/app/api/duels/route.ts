import { z } from "zod";
import { handler, ok, body } from "@/lib/api";
import { createDuel, listDuels, DUEL_METRICS } from "@/lib/leaderboard/duels";
export const GET = handler(async ({ user }) => ok(await listDuels(user.id)));
export const POST = handler(async ({ req, user }) => {
  const b = await body(req, z.object({ opponentId: z.string().max(40), metric: z.enum(DUEL_METRICS), days: z.union([z.literal(1), z.literal(3), z.literal(7)]) }));
  return ok(await createDuel(user.id, b.opponentId, b.metric, b.days));
}, { rate: { limit: 20, windowMs: 3600000 } });
