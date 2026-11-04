import { db } from "../db";
import { ACTIVITY_META, ACTIVITY_TYPES, type ActivityType, type ActivityFamily } from "../constants";

export type ActivityConfig = { key: ActivityType; name: string; family: ActivityFamily; icon: string; color: string; description: string; enabled: boolean; gps: boolean; rewardRate: number; met: number; sort: number };

export function defaultConfigs(): ActivityConfig[] {
  return ACTIVITY_TYPES.map((k, i) => ({ key: k, name: ACTIVITY_META[k].label, family: ACTIVITY_META[k].family, icon: ACTIVITY_META[k].icon, color: ACTIVITY_META[k].color, description: ACTIVITY_META[k].description, enabled: true, gps: ACTIVITY_META[k].gps, rewardRate: ACTIVITY_META[k].rate, met: ACTIVITY_META[k].met, sort: i }));
}

/** Live activity catalogue (admin-editable), falling back to defaults for types not yet in the DB. */
export async function getActivityConfigs(): Promise<ActivityConfig[]> {
  const rows = await db.activityTypeConfig.findMany();
  return defaultConfigs().map((d) => {
    const r = rows.find((x) => x.key === d.key);
    // family & gps capability are structural — kept from code so validation stays correct
    return r ? { ...d, name: r.name, icon: r.icon, color: r.color, description: r.description, enabled: r.enabled, rewardRate: r.rewardRate, met: r.met, sort: r.sort } : d;
  }).sort((a, b) => a.sort - b.sort);
}

export async function getActivityConfig(type: ActivityType) {
  return (await getActivityConfigs()).find((c) => c.key === type)!;
}
