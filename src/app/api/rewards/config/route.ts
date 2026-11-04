import { publicHandler, ok } from "@/lib/api";
import { getActivityConfigs } from "@/lib/game/activity-types";
import { getEconomy } from "@/lib/settings";
/** Public reward configuration so clients can *estimate* rewards. The server always recalculates. */
export const GET = publicHandler(async () => {
  const [types, e] = await Promise.all([getActivityConfigs(), getEconomy()]);
  return ok({ types: types.filter((t) => t.enabled).map((t) => ({ key: t.key, name: t.name, family: t.family, rate: t.rewardRate, color: t.color, icon: t.icon })), coinsPerPoint: e.coinsPerPoint, xpPerPoint: e.xpPerPoint, dailyPointCap: e.dailyPointCap, minActivitySec: e.minActivitySecForReward });
});
