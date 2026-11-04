import { handler, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { userContext } from "@/lib/context";
import { claimMission } from "@/lib/game/missions";
import { evaluateProgress } from "@/lib/game/progression";
import { track } from "@/lib/analytics";

export const POST = handler<{ id: string }>(async ({ params, user }) => {
  const ctx = await userContext(user);
  const r = await db.$transaction((tx) => claimMission(tx, user.id, params.id, ctx.today, ctx.plus));
  const progress = await evaluateProgress(user.id);
  await track("mission_claimed", user.id, { missionId: params.id });
  await (await import("@/lib/leaderboard/service")).touchLeaderboard(user.id);
  return ok({ ...r, ...progress });
}, { rate: { limit: 60, windowMs: 60000 } });
