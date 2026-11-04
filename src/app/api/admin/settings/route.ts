import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { SETTING_DEFAULTS, getSetting, type SettingKey } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { integrationStatus } from "@/lib/env";

const schemas: Record<SettingKey, z.ZodTypeAny> = {
  branding: z.object({ appName: z.string().min(1).max(30), tagline: z.string().max(80), supportEmail: z.string().email() }).partial(),
  economy: z.object({ coinsPerPoint: z.number().min(0).max(5), xpPerPoint: z.number().min(0).max(5), dailyPointCap: z.number().int().min(0).max(100000), minActivitySecForReward: z.number().int().min(0).max(3600), streakBonusPerDay: z.number().min(0).max(0.2), streakBonusMax: z.number().min(0).max(1), recordBonusPoints: z.number().int().min(0).max(5000), missionRewardMultiplier: z.number().min(0).max(10), maxWalkKmh: z.number().min(3).max(20), maxRunKmh: z.number().min(8).max(40), maxBikeKmh: z.number().min(15).max(100), petPlayCooldownMin: z.number().int().min(0).max(1440), petPetCooldownMin: z.number().int().min(0).max(1440), starterCoins: z.number().int().min(0).max(5000), shopExpansionCost: z.array(z.number().int().min(0)).min(1).max(10) }).partial(),
  maintenance: z.object({ enabled: z.boolean(), message: z.string().max(200) }).partial(),
  notifications: z.object({ maxPerDay: z.number().int().min(0).max(20), quietHoursStart: z.number().int().min(0).max(23), quietHoursEnd: z.number().int().min(0).max(23) }).partial(),
  analytics: z.object({ enabled: z.boolean(), forwardToProvider: z.boolean() }).partial(),
  ads: z.object({ enabled: z.boolean(), rewardedOnly: z.boolean() }).partial(),
  referrals: z.object({ enabled: z.boolean(), referrerRewardDays: z.number().int().min(0).max(30), refereeTrialDays: z.number().int().min(0).max(60), stacking: z.boolean(), maxStackedDays: z.number().int().min(1).max(3650), requireEmailVerified: z.boolean(), requireOnboarding: z.boolean(), requireFirstActivity: z.boolean(), minAccountAgeHours: z.number().int().min(0).max(720), referrerRewardDelayHours: z.number().int().min(0).max(720), maxRewardsPerReferrerPer30Days: z.number().int().min(0).max(1000), reviewThreshold: z.number().int().min(1).max(100), suspiciousThreshold: z.number().int().min(1).max(100), sensitivity: z.number().min(0.25).max(3), ipRetentionDays: z.number().int().min(1).max(90) }).partial(),
  maps: z.object({
    web: z.array(z.enum(["google", "apple", "open"])).max(3),
    ios: z.array(z.enum(["google", "apple", "open"])).max(3),
    android: z.array(z.enum(["google", "open"])).max(2), // Apple Maps has no Android SDK — rejected server-side
    googleNativeSdk: z.boolean(),
  }).partial().refine((m) => Object.values(m).every((v) => !Array.isArray(v) || new Set(v).size === v.length), "Each provider can only be listed once"),
  leaderboard: z.object({
    timezone: z.string().max(60).refine((tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } }, "Unknown timezone"),
    weekStartsOn: z.union([z.literal(0), z.literal(1)]),
    periods: z.array(z.enum(["day", "week", "month", "all"])).min(1), boards: z.array(z.enum(["overall", "walk", "run", "bike", "steps"])).min(1), scopes: z.array(z.enum(["friends", "global", "country", "community"])).min(1),
    overall: z.object({ pointsWeight: z.number().min(0).max(10), stepsPer1000: z.number().min(0).max(100), missionWeight: z.number().min(0).max(500), dailyCap: z.number().int().min(100).max(100000) }),
    includeUnverifiedDistance: z.boolean(), countIndoorPoints: z.boolean(), maxRows: z.number().int().min(10).max(500), minParticipantsForPodium: z.number().int().min(1).max(100),
    rewards: z.object({ weeklyTop: z.array(z.number().int().min(0).max(10000)).max(10), monthlyTop: z.array(z.number().int().min(0).max(20000)).max(10), monthlyChampionItem: z.string().max(40).nullable(), tiers: z.array(z.object({ key: z.string().max(20), min: z.number().min(0), coins: z.number().int().min(0).max(5000) })).max(8), improvementBonus: z.number().int().min(0).max(1000) }),
    suspicious: z.object({ capDaysPerWeek: z.number().int().min(1).max(7) }),
    duel: z.object({ participationCoins: z.number().int().min(0).max(500), winnerCoins: z.number().int().min(0).max(1000), maxActive: z.number().int().min(1).max(20) }),
  }).partial(),
};

export const GET = handler(async () => {
  const keys = Object.keys(SETTING_DEFAULTS) as SettingKey[];
  const values = Object.fromEntries(await Promise.all(keys.map(async (k) => [k, await getSetting(k)])));
  return ok({ values, integrations: integrationStatus() });
}, { role: "ADMIN" });

export const PATCH = handler(async ({ req, user }) => {
  const { key, value } = await body(req, z.object({ key: z.enum(Object.keys(SETTING_DEFAULTS) as [SettingKey, ...SettingKey[]]), value: z.unknown() }));
  const parsed = schemas[key].safeParse(value);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid settings");
  const merged = { ...(await getSetting(key)), ...parsed.data };
  await db.appSetting.upsert({ where: { key }, create: { key, value: merged }, update: { value: merged } });
  await audit(user.id, `settings.${key}`, "setting", key, { fields: Object.keys(parsed.data) });
  return ok(merged);
}, { role: "ADMIN" });
