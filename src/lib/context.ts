import "server-only";
import { db } from "./db";
import { dateKey } from "./dates";
import { isPlus } from "./payments/entitlements";
import { getEconomy } from "./settings";
import { setupNewUser } from "./game/setup";
import type { CurrentUser } from "./auth/session";

/** Everything most game endpoints need about the caller. */
export async function userContext(user: CurrentUser) {
  let profile = await db.profile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    await db.$transaction((tx) => setupNewUser(tx, user.id));
    profile = await db.profile.findUniqueOrThrow({ where: { userId: user.id } });
  }
  const [plus, economy] = await Promise.all([isPlus(user.id), getEconomy()]);
  const tz = user.timezone || "UTC";
  return { user, profile, plus, economy, tz, today: dateKey(new Date(), tz), goals: { dailyStepGoal: profile.dailyStepGoal, dailyActiveMinGoal: profile.dailyActiveMinGoal } };
}
