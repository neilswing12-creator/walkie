export const ROLES = ["USER", "SUPPORT", "MODERATOR", "ADMIN", "OWNER"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_RANK: Record<Role, number> = { USER: 0, SUPPORT: 1, MODERATOR: 2, ADMIN: 3, OWNER: 4 };
/** Staff sessions expire sooner than member sessions; sensitive admin actions need a fresh sign-in or the password. */
export const STAFF_SESSION_HOURS = 12;
export const REAUTH_WINDOW_MIN = 15;

export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "BANNED", "DELETED"] as const;

export const ACTIVITY_TYPES = [
  "OUTDOOR_WALK", "CASUAL_WALK", "INDOOR_WALK", "TREADMILL_WALK",
  "OUTDOOR_RUN", "JOG", "TREADMILL_RUN",
  "OUTDOOR_CYCLE", "ROAD_CYCLE", "CASUAL_CYCLE", "INDOOR_CYCLE",
  "FREE_WORKOUT",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type ActivityFamily = "walk" | "run" | "bike" | "other";

export interface ActivityMeta { label: string; short: string; family: ActivityFamily; gps: boolean; met: number; icon: string; color: string; rate: number; description: string; running: boolean }
const m = (label: string, short: string, family: ActivityFamily, gps: boolean, met: number, rate: number, description: string): ActivityMeta => ({
  label, short, family, gps, met, rate, description, running: family === "run",
  icon: family === "walk" ? (gps ? "walk" : "home") : family === "run" ? (gps ? "run" : "treadmill") : family === "bike" ? "bike" : "bolt",
  color: family === "walk" ? "#6B8FD6" : family === "run" ? "#A08BE0" : family === "bike" ? "#5DBE9A" : "#E2B64A",
});
/** Static defaults. Live names, colors, enablement and reward rates come from ActivityTypeConfig (admin-editable). */
export const ACTIVITY_META: Record<ActivityType, ActivityMeta> = {
  OUTDOOR_WALK: m("Outdoor walk", "Walk", "walk", true, 3.5, 10, "GPS route, pace & distance"),
  CASUAL_WALK: m("Casual stroll", "Stroll", "walk", true, 2.8, 10, "Slow & easy — every step counts"),
  INDOOR_WALK: m("Indoor walk", "Indoor walk", "walk", false, 3.0, 8, "Timer — add distance if you know it"),
  TREADMILL_WALK: m("Treadmill walk", "Treadmill walk", "walk", false, 3.5, 8, "Timer — enter the console distance"),
  OUTDOOR_RUN: m("Outdoor run", "Run", "run", true, 9.8, 7, "GPS route, splits & pace"),
  JOG: m("Jog", "Jog", "run", true, 7.0, 7, "Easy-pace running with GPS"),
  TREADMILL_RUN: m("Treadmill run", "Treadmill", "run", false, 9.0, 6, "Timer — enter the console distance"),
  OUTDOOR_CYCLE: m("Outdoor ride", "Bike", "bike", true, 7.5, 4, "GPS route, speed & elevation"),
  ROAD_CYCLE: m("Road cycling", "Road bike", "bike", true, 10.0, 4, "Faster rides — speed & max speed"),
  CASUAL_CYCLE: m("Casual ride", "Cruise", "bike", true, 5.5, 4, "Relaxed rides around town"),
  INDOOR_CYCLE: m("Indoor cycling", "Indoor bike", "bike", false, 7.0, 3, "Stationary bike — timer & optional distance"),
  FREE_WORKOUT: m("Free workout", "Workout", "other", false, 5.0, 5, "Any movement counts"),
};
export const FAMILY_META: Record<ActivityFamily, { label: string; verb: string; color: string; tint: string; icon: string; mood: "walk" | "run" | "bike" | "jump" }> = {
  walk: { label: "Walk", verb: "walk", color: "#6B8FD6", tint: "#EAF2FC", icon: "walk", mood: "walk" },
  run: { label: "Run", verb: "run", color: "#A08BE0", tint: "#F0ECFC", icon: "run", mood: "run" },
  bike: { label: "Bike", verb: "ride", color: "#5DBE9A", tint: "#E5F6EE", icon: "bike", mood: "bike" },
  other: { label: "Workout", verb: "workout", color: "#E2B64A", tint: "#FCF4DC", icon: "bolt", mood: "jump" },
};
export const typesOfFamily = (f: ActivityFamily) => ACTIVITY_TYPES.filter((t) => ACTIVITY_META[t].family === f);

export const RARITIES = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHICAL"] as const;
export type Rarity = (typeof RARITIES)[number];
export const RARITY_META: Record<Rarity, { label: string; color: string; bg: string; ring: string }> = {
  COMMON: { label: "Common", color: "#7C8796", bg: "#F1F3F6", ring: "ring-slate-200" },
  UNCOMMON: { label: "Uncommon", color: "#3E9C78", bg: "#E5F6EE", ring: "ring-emerald-200" },
  RARE: { label: "Rare", color: "#4F74C4", bg: "#EAF2FC", ring: "ring-blue-200" },
  EPIC: { label: "Epic", color: "#7F66CC", bg: "#F0ECFC", ring: "ring-violet-200" },
  LEGENDARY: { label: "Legendary", color: "#B8892A", bg: "#FCF4DC", ring: "ring-amber-200" },
  MYTHICAL: { label: "Mythical", color: "#C85A8C", bg: "#FCEAF2", ring: "ring-pink-200" },
};

export const ITEM_CATEGORIES = ["FOOD", "TOY", "ACCESSORY", "DECORATION", "FURNITURE", "BUILDING", "FLOOR", "WALL", "ENVIRONMENT", "BOOST"] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
export const PLACEABLE_CATEGORIES: ItemCategory[] = ["DECORATION", "FURNITURE", "BUILDING"];

export const MISSION_KINDS = ["STEPS", "WALK_DISTANCE", "WALK_DURATION", "RUN_DISTANCE", "RUN_DURATION", "RUN_SINGLE_DISTANCE", "BIKE_DISTANCE", "BIKE_DURATION", "BIKE_COUNT", "ACTIVE_MINUTES", "ACTIVITY_COUNT", "POINTS", "FEED_PET", "PLAY_PET", "VISIT_SHOP"] as const;
export type MissionKind = (typeof MISSION_KINDS)[number];

export const PET_UNLOCK_TYPES = ["DEFAULT", "LEVEL", "TOTAL_DISTANCE", "TOTAL_STEPS", "STREAK", "PURCHASE", "MISSIONS", "ACHIEVEMENT", "EVENT"] as const;
export const PET_STAGES = ["BABY", "YOUNG", "ADULT", "SPECIAL"] as const;

export const SUB_ACTIVE_STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE"]; // PAST_DUE keeps access during provider grace period

/** Ads may only render on these screens. Activity / GPS tracking screens are deliberately excluded. */
export const ALLOWED_AD_SCREENS = ["shop", "explore", "rewards"] as const;
export const FORBIDDEN_AD_SCREENS = ["activity", "tracking", "map", "history", "insights"] as const;

export const SESSION_COOKIE = "walkie_session";
