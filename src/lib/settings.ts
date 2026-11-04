import "server-only";
import { db } from "./db";
import { ECONOMY_DEFAULTS, type EconomyConfig } from "./economy";
import { REFERRAL_DEFAULTS } from "./referrals/settings";
import { LEADERBOARD_DEFAULTS } from "./leaderboard/settings";
import { MAPS_DEFAULTS } from "./maps/types";

export const SETTING_DEFAULTS = {
  branding: { appName: "Walkie", tagline: "Every step is an adventure.", supportEmail: "support@walkie.run" },
  economy: ECONOMY_DEFAULTS,
  maintenance: { enabled: false, message: "Walkie is having a quick nap. We'll be right back!" },
  notifications: { maxPerDay: 3, quietHoursStart: 21, quietHoursEnd: 8 },
  analytics: { enabled: true, forwardToProvider: true },
  ads: { enabled: false, rewardedOnly: true },
  referrals: REFERRAL_DEFAULTS,
  leaderboard: LEADERBOARD_DEFAULTS,
  maps: MAPS_DEFAULTS,
};
export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSetting<K extends SettingKey>(key: K): Promise<(typeof SETTING_DEFAULTS)[K]> {
  const row = await db.appSetting.findUnique({ where: { key } });
  return { ...SETTING_DEFAULTS[key], ...((row?.value as object) ?? {}) } as (typeof SETTING_DEFAULTS)[K];
}

export const getEconomy = () => getSetting("economy") as Promise<EconomyConfig>;

export async function isFlagOn(key: string, userId?: string) {
  const f = await db.featureFlag.findUnique({ where: { key } });
  if (!f || !f.enabled) return false;
  if (f.rolloutPercent >= 100 || !userId) return f.rolloutPercent >= 100;
  let h = 0;
  for (const c of userId + key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 100 < f.rolloutPercent;
}
