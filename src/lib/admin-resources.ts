/** Schema-driven admin CRUD for catalogue tables. Each write is validated and audit-logged. */
import { z } from "zod";
import { db } from "./db";
import { RARITIES, ITEM_CATEGORIES, MISSION_KINDS, PET_UNLOCK_TYPES, ALLOWED_AD_SCREENS } from "./constants";

const key = z.string().trim().regex(/^[a-z0-9_-]{2,40}$/, "Keys are lowercase letters, numbers, _ or -");
const optDate = z.union([z.coerce.date(), z.null()]).optional();

export const RESOURCES = {
  pets: {
    label: "Pets", delegate: () => db.petSpecies, orderBy: { sort: "asc" as const },
    schema: z.object({ key, name: z.string().min(1).max(40), defaultName: z.string().min(1).max(24), description: z.string().max(300), personality: z.string().max(120), rarity: z.enum(RARITIES), unlockType: z.enum(PET_UNLOCK_TYPES), unlockValue: z.coerce.number().int().min(0), priceCoins: z.coerce.number().int().min(0).nullable().optional(), premium: z.boolean(), enabled: z.boolean(), imageUrl: z.string().max(300).nullable().optional(), xpPerLevel: z.coerce.number().int().min(10).max(10000), youngAtLevel: z.coerce.number().int().min(1), adultAtLevel: z.coerce.number().int().min(1), specialAtLevel: z.coerce.number().int().min(1), sort: z.coerce.number().int() }),
    canDelete: async (id: string) => (await db.pet.count({ where: { speciesId: id } })) === 0 || "Pets of this species are owned by users — disable it instead",
  },
  items: {
    label: "Shop items", delegate: () => db.item, orderBy: { sort: "asc" as const },
    schema: z.object({ key, name: z.string().min(1).max(40), description: z.string().max(200), category: z.enum(ITEM_CATEGORIES), rarity: z.enum(RARITIES), priceCoins: z.coerce.number().int().min(0).max(1000000), premium: z.boolean(), seasonal: z.boolean(), availableFrom: optDate, availableTo: optDate, enabled: z.boolean(), model: z.string().max(30).nullable().optional(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(), footprintW: z.coerce.number().int().min(1).max(4), footprintD: z.coerce.number().int().min(1).max(4), slot: z.enum(["HEAD", "NECK", "BACK"]).nullable().optional(), imageUrl: z.string().max(300).nullable().optional(), sort: z.coerce.number().int() }),
    canDelete: async (id: string) => (await db.inventoryItem.count({ where: { itemId: id, quantity: { gt: 0 } } })) + (await db.shopPlacement.count({ where: { itemId: id } })) === 0 || "Users own this item — disable it instead",
  },
  missions: {
    label: "Missions", delegate: () => db.mission, orderBy: { sort: "asc" as const },
    schema: z.object({ key, title: z.string().min(1).max(60), description: z.string().max(200), kind: z.enum(MISSION_KINDS), target: z.coerce.number().int().min(1), period: z.enum(["DAILY", "WEEKLY"]), difficulty: z.enum(["EASY", "MEDIUM", "HARD"]), rewardCoins: z.coerce.number().int().min(0).max(10000), rewardXp: z.coerce.number().int().min(0).max(10000), premium: z.boolean(), enabled: z.boolean(), sort: z.coerce.number().int() }),
    canDelete: async () => true as const,
  },
  challenges: {
    label: "Challenges", delegate: () => db.challenge, orderBy: { endsAt: "desc" as const },
    schema: z.object({ key, title: z.string().min(1).max(80), description: z.string().max(300), kind: z.enum(["STEPS", "WALK_DISTANCE", "RUN_DISTANCE", "BIKE_DISTANCE", "ACTIVE_MINUTES", "ACTIVITY_COUNT"]), teamMode: z.boolean().optional(), target: z.coerce.number().int().min(1), period: z.enum(["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"]), community: z.boolean(), startsAt: z.coerce.date(), endsAt: z.coerce.date(), rewardCoins: z.coerce.number().int().min(0), rewardXp: z.coerce.number().int().min(0), premium: z.boolean(), enabled: z.boolean(), maxParticipants: z.coerce.number().int().min(1).nullable().optional() }),
    canDelete: async () => true as const,
  },
  achievements: {
    label: "Achievements", delegate: () => db.achievement, orderBy: { sort: "asc" as const },
    schema: z.object({ key, title: z.string().min(1).max(60), description: z.string().max(200), category: z.enum(["WALKING", "RUNNING", "CYCLING", "FITNESS", "STREAKS", "RECORDS", "PETS", "SHOP", "SOCIAL", "SEASONAL"]), rarity: z.enum(RARITIES), kind: z.string().regex(/^[A-Z_]+(:[A-Za-z_,]+)?$/, "Unknown progress type").max(80), target: z.coerce.number().int().min(1), rewardCoins: z.coerce.number().int().min(0).max(100000), rewardXp: z.coerce.number().int().min(0).max(100000), rewardItemKey: z.string().max(40).nullable().optional(), rewardItemQty: z.coerce.number().int().min(1).max(20), icon: z.string().max(20), art: z.object({ pose: z.string().max(20), scene: z.string().max(20), acc: z.string().max(30).optional(), prop: z.string().max(20).optional(), label: z.string().max(10).optional() }).nullable().optional(), imageUrl: z.string().max(300).nullable().optional(), startsAt: optDate, endsAt: optDate, hidden: z.boolean(), archived: z.boolean(), enabled: z.boolean(), sort: z.coerce.number().int() }),
    canDelete: async (id: string) => (await db.userAchievement.count({ where: { achievementId: id } })) === 0 || "Users have earned this badge — archive it instead (earned badges are never removed)",
  },
  plans: {
    label: "Subscription plans", delegate: () => db.subscriptionPlan, orderBy: { sort: "asc" as const },
    schema: z.object({ key, name: z.string().min(1).max(60), description: z.string().max(200), priceCents: z.coerce.number().int().min(0), currency: z.string().length(3), interval: z.enum(["month", "year"]), trialDays: z.coerce.number().int().min(0).max(90), stripePriceId: z.string().max(100).nullable().optional(), revenuecatEntitlement: z.string().max(60).nullable().optional(), paymongoAmount: z.coerce.number().int().min(2000).max(10000000).nullable().optional(), features: z.array(z.string().max(100)).max(12), enabled: z.boolean(), sort: z.coerce.number().int() }),
    canDelete: async () => "Disable plans instead of deleting them",
  },
  ads: {
    label: "Ad placements", delegate: () => db.adPlacement, orderBy: { key: "asc" as const },
    schema: z.object({ key, name: z.string().min(1).max(60), screen: z.enum(ALLOWED_AD_SCREENS), format: z.enum(["BANNER", "REWARDED", "INTERSTITIAL"]), enabled: z.boolean(), frequencyCapPerDay: z.coerce.number().int().min(0).max(50), rewardCoins: z.coerce.number().int().min(0).max(200), hideForPlus: z.boolean() }),
    canDelete: async () => true as const,
  },
  activities: {
    label: "Activity types", delegate: () => db.activityTypeConfig, orderBy: { sort: "asc" as const }, idField: "key", noCreate: true,
    schema: z.object({ key: z.string(), name: z.string().min(1).max(40), icon: z.string().max(20), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), description: z.string().max(120), enabled: z.boolean(), rewardRate: z.coerce.number().min(0).max(100), met: z.coerce.number().min(1).max(20), sort: z.coerce.number().int() }),
    canDelete: async () => "Activity types can be disabled, not deleted",
  },
  flags: {
    label: "Feature flags", delegate: () => db.featureFlag, orderBy: { key: "asc" as const },
    schema: z.object({ key, description: z.string().max(200), enabled: z.boolean(), rolloutPercent: z.coerce.number().int().min(0).max(100) }),
    canDelete: async () => true as const,
  },
} as const;
export type ResourceKey = keyof typeof RESOURCES;
export const isResource = (k: string): k is ResourceKey => k in RESOURCES;
