import { handler, ok } from "@/lib/api";
import { userContext } from "@/lib/context";
import { listMissions } from "@/lib/game/missions";
export const GET = handler(async ({ user }) => {
  const ctx = await userContext(user);
  return ok(await listMissions(user.id, ctx.today, ctx.plus));
}, { allowSuspended: true });
