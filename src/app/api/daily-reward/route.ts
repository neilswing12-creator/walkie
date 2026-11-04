import { handler, ok } from "@/lib/api";
import { userContext } from "@/lib/context";
import { dailyRewardState } from "@/lib/queries/home";
export const GET = handler(async ({ user }) => {
  const ctx = await userContext(user);
  return ok(await dailyRewardState(user.id, ctx.today));
}, { allowSuspended: true });
