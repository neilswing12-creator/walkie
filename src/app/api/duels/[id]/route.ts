import { z } from "zod";
import { handler, ok, body } from "@/lib/api";
import { respondDuel } from "@/lib/leaderboard/duels";
export const POST = handler<{ id: string }>(async ({ req, params, user }) => {
  const { action } = await body(req, z.object({ action: z.enum(["accept", "decline", "cancel"]) }));
  return ok(await respondDuel(user.id, params.id, action));
});
