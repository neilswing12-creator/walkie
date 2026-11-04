/**
 * Seeds the game catalogue (pets, items, missions, achievements, challenges, plans, flags, ad placements).
 * Safe to re-run: everything is upserted by key. Creates NO demo users.
 * An admin is created only when ADMIN_EMAIL and ADMIN_PASSWORD are set.
 */
import { PrismaClient } from "@prisma/client";
import { WARDROBE } from "../src/lib/wardrobe";

const db = new PrismaClient();

const pets = [
  { key: "husky", name: "Siberian Husky", defaultName: "Walkie", rarity: "COMMON", unlockType: "DEFAULT", unlockValue: 0, personality: "Energetic, encouraging, a little mischievous", description: "Your first companion. Walkie lives for morning adventures and steals socks." },
  { key: "corgi", name: "Corgi", defaultName: "Biscuit", rarity: "COMMON", unlockType: "TOTAL_DISTANCE", unlockValue: 3000, personality: "Bouncy and loyal", description: "Short legs, big heart. Biscuit joins after your first 3 km." },
  { key: "cat", name: "Tabby Cat", defaultName: "Miso", rarity: "COMMON", unlockType: "LEVEL", unlockValue: 3, personality: "Calm, curious, judges your pace", description: "Miso pretends not to care, then naps on your running shoes." },
  { key: "duck", name: "Duckling", defaultName: "Puddle", rarity: "COMMON", unlockType: "PURCHASE", unlockValue: 0, priceCoins: 350, personality: "Cheerful and splashy", description: "Puddle waddles behind you on rainy-day walks." },
  { key: "bunny", name: "Lop Bunny", defaultName: "Mochi", rarity: "UNCOMMON", unlockType: "TOTAL_STEPS", unlockValue: 25000, personality: "Gentle and speedy", description: "Mochi hops along once you've taken 25,000 steps." },
  { key: "hamster", name: "Hamster", defaultName: "Peanut", rarity: "UNCOMMON", unlockType: "PURCHASE", unlockValue: 0, priceCoins: 600, personality: "Tiny athlete, huge cheeks", description: "Peanut runs a wheel marathon every night." },
  { key: "shiba", name: "Shiba Inu", defaultName: "Kuri", rarity: "UNCOMMON", unlockType: "TOTAL_DISTANCE", unlockValue: 15000, personality: "Proud, dramatic, secretly sweet", description: "Kuri is impressed only after 15 km together." },
  { key: "golden", name: "Golden Retriever", defaultName: "Sunny", rarity: "RARE", unlockType: "MISSIONS", unlockValue: 15, personality: "Endlessly happy helper", description: "Sunny loves a to-do list. Finish 15 missions to meet them." },
  { key: "penguin", name: "Penguin", defaultName: "Pip", rarity: "RARE", unlockType: "STREAK", unlockValue: 7, personality: "Steady and determined", description: "Pip waddles in after a 7-day streak." },
  { key: "capybara", name: "Capybara", defaultName: "Yuzu", rarity: "RARE", unlockType: "PURCHASE", unlockValue: 0, priceCoins: 1800, personality: "Unbothered, everyone's friend", description: "Yuzu brings calm vibes and a tiny orange." },
  { key: "fox", name: "Fox", defaultName: "Ember", rarity: "EPIC", unlockType: "TOTAL_DISTANCE", unlockValue: 50000, personality: "Clever trail scout", description: "Ember finds the best routes. Walk or run 50 km to earn their trust." },
  { key: "otter", name: "Otter", defaultName: "Ripple", rarity: "EPIC", unlockType: "STREAK", unlockValue: 14, personality: "Playful and social", description: "Ripple holds paws with friends. Keep a 14-day streak." },
  { key: "raccoon", name: "Raccoon", defaultName: "Bandit", rarity: "LEGENDARY", unlockType: "LEVEL", unlockValue: 8, premium: true, personality: "Night-owl collector of shiny things", description: "A Walkie Plus companion who decorates your shop with treasures." },
  { key: "redpanda", name: "Red Panda", defaultName: "Maple", rarity: "MYTHICAL", unlockType: "TOTAL_DISTANCE", unlockValue: 150000, personality: "Rare, graceful, a little shy", description: "Legend says Maple appears to those who travel 150 km." },
];

type ItemSeed = { key: string; name: string; description: string; category: string; rarity?: string; priceCoins: number; premium?: boolean; seasonal?: boolean; model?: string; color?: string; footprintW?: number; footprintD?: number; slot?: string; effect?: object };
const items: ItemSeed[] = [
  // food & toys
  { key: "food_kibble", name: "Kibble bowl", description: "A hearty bowl. +15 energy", category: "FOOD", priceCoins: 15, effect: { energy: 15, happiness: 5, xp: 10 } },
  { key: "food_carrot", name: "Crunchy carrot", description: "Fresh and sweet. +10 energy", category: "FOOD", priceCoins: 10, effect: { energy: 10, happiness: 6, xp: 8 } },
  { key: "food_salmon", name: "Salmon treat", description: "A special treat. +30 energy", category: "FOOD", rarity: "UNCOMMON", priceCoins: 40, effect: { energy: 30, happiness: 12, xp: 25 } },
  { key: "food_cake", name: "Pup-cake", description: "Celebration snack. +20 energy, +20 happiness", category: "FOOD", rarity: "RARE", priceCoins: 80, effect: { energy: 20, happiness: 20, xp: 40 } },
  { key: "toy_ball", name: "Squeaky ball", description: "Makes playtime extra fun (+XP)", category: "TOY", priceCoins: 60, effect: { xp: 10 } },
  { key: "toy_frisbee", name: "Frisbee", description: "For zoomies. More playtime XP", category: "TOY", rarity: "UNCOMMON", priceCoins: 140, effect: { xp: 18 } },
  { key: "toy_rope", name: "Rope toy", description: "Tug-of-war champion", category: "TOY", priceCoins: 90, effect: { xp: 14 } },
  // accessories — the Walkie wardrobe (src/lib/wardrobe.ts)
  ...WARDROBE.map((w) => ({ key: w.key, name: w.name, description: w.description, category: "ACCESSORY", rarity: w.rarity, priceCoins: w.priceCoins, slot: w.slot, color: w.color, premium: !!w.premium, seasonal: !!w.seasonal })),
  // decorations (placeable)
  { key: "deco_bush", name: "Round bush", description: "Soft and leafy", category: "DECORATION", priceCoins: 30, model: "bush", color: "#7CC49A" },
  { key: "deco_tree", name: "Puffy tree", description: "Shade for napping pets", category: "DECORATION", priceCoins: 80, model: "tree_round", color: "#6DBB8A" },
  { key: "deco_pine", name: "Pine tree", description: "Smells like a forest trail", category: "DECORATION", priceCoins: 90, model: "tree_pine", color: "#4FA27A" },
  { key: "deco_flowerpot", name: "Flower pot", description: "A pop of color", category: "DECORATION", priceCoins: 45, model: "flowerpot", color: "#F2A7C0" },
  { key: "deco_lamp", name: "Street lamp", description: "Glows at night", category: "DECORATION", rarity: "UNCOMMON", priceCoins: 120, model: "lamp", color: "#FBEFC0" },
  { key: "deco_fountain", name: "Fountain", description: "Pets love a splash", category: "DECORATION", rarity: "RARE", priceCoins: 600, model: "fountain", color: "#A9C5ED", footprintW: 2, footprintD: 2 },
  { key: "deco_pond", name: "Lily pond", description: "Duck approved", category: "DECORATION", rarity: "UNCOMMON", priceCoins: 380, model: "pond", color: "#8DB8EA", footprintW: 2, footprintD: 2 },
  { key: "deco_sign", name: "Shop sign", description: "Tell the world your shop's name", category: "DECORATION", priceCoins: 70, model: "sign", color: "#D7B48A" },
  { key: "deco_snowman", name: "Snow pup", description: "Seasonal winter friend", category: "DECORATION", rarity: "RARE", priceCoins: 220, seasonal: true, model: "snowman", color: "#FFFFFF" },
  { key: "deco_crystal", name: "Aurora crystal", description: "Shimmers softly — Plus exclusive", category: "DECORATION", rarity: "EPIC", priceCoins: 900, premium: true, model: "crystal", color: "#C7B8F5" },
  // furniture
  { key: "furn_bench", name: "Park bench", description: "Rest stop for walkers", category: "FURNITURE", priceCoins: 60, model: "bench", color: "#C99A6B" },
  { key: "furn_picnic", name: "Picnic table", description: "Snack time!", category: "FURNITURE", priceCoins: 150, model: "picnic", color: "#D9A877", footprintW: 2 },
  { key: "furn_umbrella", name: "Sun umbrella", description: "Beachy shade", category: "FURNITURE", rarity: "UNCOMMON", priceCoins: 140, model: "umbrella", color: "#F7C66B" },
  { key: "furn_bed", name: "Pet bed", description: "The comfiest nap spot", category: "FURNITURE", priceCoins: 110, model: "petbed", color: "#A9C5ED" },
  { key: "furn_tunnel", name: "Play tunnel", description: "Zoom zoom", category: "FURNITURE", rarity: "UNCOMMON", priceCoins: 200, model: "tunnel", color: "#DCD3F7", footprintW: 2 },
  // buildings
  { key: "bld_doghouse", name: "Dog house", description: "A cozy home for Walkie", category: "BUILDING", priceCoins: 250, model: "doghouse", color: "#6B8FD6", footprintW: 2, footprintD: 2 },
  { key: "bld_shop", name: "Pet shop", description: "The heart of your pet shop", category: "BUILDING", priceCoins: 700, model: "shop", color: "#A9C5ED", footprintW: 3, footprintD: 3 },
  { key: "bld_cafe", name: "Treat café", description: "Pets visit for pup-cakes", category: "BUILDING", rarity: "RARE", priceCoins: 1400, model: "cafe", color: "#F9D9E5", footprintW: 3, footprintD: 2 },
  { key: "bld_greenhouse", name: "Greenhouse", description: "Grows fresh pet snacks", category: "BUILDING", rarity: "UNCOMMON", priceCoins: 900, model: "greenhouse", color: "#BFEBD8", footprintW: 2, footprintD: 2 },
  { key: "bld_cattower", name: "Cat tower", description: "Miso's favorite lookout", category: "BUILDING", priceCoins: 320, model: "cattower", color: "#D9C2A7" },
  // floors & walls
  { key: "floor_grass", name: "Meadow grass", description: "Fresh green ground", category: "FLOOR", priceCoins: 0, color: "#CFE8C4" },
  { key: "floor_wood", name: "Wood deck", description: "Warm boardwalk", category: "FLOOR", priceCoins: 400, color: "#E6CBA8" },
  { key: "floor_stone", name: "Cobblestone", description: "Old-town charm", category: "FLOOR", priceCoins: 450, color: "#D9E0E8" },
  { key: "floor_sand", name: "Beach sand", description: "Toes in the sand", category: "FLOOR", rarity: "UNCOMMON", priceCoins: 500, color: "#F4E4BE" },
  { key: "floor_snow", name: "Fresh snow", description: "Winter village vibes", category: "FLOOR", rarity: "RARE", priceCoins: 650, seasonal: true, color: "#F3F7FC" },
  { key: "wall_picket", name: "Picket fence", description: "Classic white fence", category: "WALL", priceCoins: 0, color: "#FFFFFF" },
  { key: "wall_hedge", name: "Hedge wall", description: "Leafy borders", category: "WALL", priceCoins: 300, color: "#8CCB9E" },
  { key: "wall_brick", name: "Brick wall", description: "Sturdy and stylish", category: "WALL", priceCoins: 380, color: "#E3A58C" },
  // environments
  { key: "env_garden", name: "Garden shop", description: "Flowers everywhere", category: "ENVIRONMENT", rarity: "UNCOMMON", priceCoins: 1200, color: "#CFE8C4" },
  { key: "env_beach", name: "Beachside shop", description: "Sea breeze and sunshine", category: "ENVIRONMENT", rarity: "RARE", priceCoins: 2400, color: "#F4E4BE" },
  { key: "env_winter", name: "Winter village", description: "Snowy and cozy — Plus", category: "ENVIRONMENT", rarity: "EPIC", priceCoins: 2400, premium: true, color: "#F3F7FC" },
  // boosts
  { key: "boost_freeze", name: "Streak freeze", description: "Protects your streak for one missed day", category: "BOOST", priceCoins: 250, rarity: "UNCOMMON" },
];

const missions = [
  { key: "daily_steps_3k", title: "Walk 3,000 steps", description: "Steps from Health or your tracked walks", kind: "STEPS", target: 3000, period: "DAILY", difficulty: "EASY", rewardCoins: 25, rewardXp: 15, sort: 1 },
  { key: "daily_walk_1km", title: "Walk 1 kilometer", description: "Any outdoor or indoor walk", kind: "WALK_DISTANCE", target: 1000, period: "DAILY", difficulty: "EASY", rewardCoins: 25, rewardXp: 15, sort: 2 },
  { key: "daily_run_10min", title: "Run for 10 minutes", description: "Outdoor or treadmill", kind: "RUN_DURATION", target: 10, period: "DAILY", difficulty: "MEDIUM", rewardCoins: 40, rewardXp: 25, sort: 3 },
  { key: "daily_activity", title: "Complete an activity", description: "Any walk, run or workout", kind: "ACTIVITY_COUNT", target: 1, period: "DAILY", difficulty: "EASY", rewardCoins: 20, rewardXp: 10, sort: 4 },
  { key: "daily_feed", title: "Feed Walkie", description: "Give any pet a snack", kind: "FEED_PET", target: 1, period: "DAILY", difficulty: "EASY", rewardCoins: 10, rewardXp: 5, sort: 5 },
  { key: "daily_play", title: "Playtime", description: "Play with a pet", kind: "PLAY_PET", target: 1, period: "DAILY", difficulty: "EASY", rewardCoins: 10, rewardXp: 5, sort: 6 },
  { key: "daily_visit_shop", title: "Visit your pet shop", description: "Say hi to your pets", kind: "VISIT_SHOP", target: 1, period: "DAILY", difficulty: "EASY", rewardCoins: 10, rewardXp: 5, sort: 7 },
  { key: "daily_walk_20min", title: "Walk for 20 minutes", description: "Any walk counts — moving time only", kind: "WALK_DURATION", target: 20, period: "DAILY", difficulty: "EASY", rewardCoins: 25, rewardXp: 15, sort: 8 },
  { key: "daily_walk_2km", title: "Walk 2 kilometers", description: "Outdoor, indoor or treadmill", kind: "WALK_DISTANCE", target: 2000, period: "DAILY", difficulty: "MEDIUM", rewardCoins: 35, rewardXp: 20, sort: 9 },
  { key: "daily_run_3km", title: "Run 3 kilometers", description: "Runs and jogs both count", kind: "RUN_DISTANCE", target: 3000, period: "DAILY", difficulty: "HARD", rewardCoins: 50, rewardXp: 30, sort: 10 },
  { key: "daily_bike_30min", title: "Cycle for 30 minutes", description: "Outdoor or indoor bike", kind: "BIKE_DURATION", target: 30, period: "DAILY", difficulty: "MEDIUM", rewardCoins: 35, rewardXp: 20, sort: 11 },
  { key: "daily_bike_5km", title: "Bike 5 kilometers", description: "A little loop around town", kind: "BIKE_DISTANCE", target: 5000, period: "DAILY", difficulty: "EASY", rewardCoins: 25, rewardXp: 15, sort: 12 },
  { key: "daily_points_500", title: "Earn 500 fitness points", description: "Points come from moving minutes", kind: "POINTS", target: 500, period: "DAILY", difficulty: "MEDIUM", rewardCoins: 40, rewardXp: 25, sort: 13 },
  { key: "daily_active_30", title: "Be active for 30 minutes", description: "Walk, run or ride — it all adds up", kind: "ACTIVE_MINUTES", target: 30, period: "DAILY", difficulty: "MEDIUM", rewardCoins: 30, rewardXp: 20, sort: 14 },
  { key: "once_first_5k", title: "Complete your first 5K", description: "5 km in a single run", kind: "RUN_SINGLE_DISTANCE", target: 5000, period: "ONE_OFF", difficulty: "HARD", rewardCoins: 200, rewardXp: 120, sort: 30 },
  { key: "weekly_bike_streak", title: "Cycling streak: ride 3 times", description: "Three rides this week", kind: "BIKE_COUNT", target: 3, period: "WEEKLY", difficulty: "MEDIUM", rewardCoins: 120, rewardXp: 80, sort: 14 },
  { key: "weekly_walk_10km", title: "Walk 10 km this week", description: "Little walks add up", kind: "WALK_DISTANCE", target: 10000, period: "WEEKLY", difficulty: "MEDIUM", rewardCoins: 120, rewardXp: 80, sort: 10 },
  { key: "weekly_run_5km", title: "Run 5 km this week", description: "One run or a few short ones", kind: "RUN_DISTANCE", target: 5000, period: "WEEKLY", difficulty: "MEDIUM", rewardCoins: 140, rewardXp: 90, sort: 11 },
  { key: "weekly_active_150", title: "150 active minutes", description: "The WHO weekly recommendation", kind: "ACTIVE_MINUTES", target: 150, period: "WEEKLY", difficulty: "HARD", rewardCoins: 200, rewardXp: 120, sort: 12 },
  { key: "weekly_plus_run_15km", title: "Plus: run 15 km", description: "A bigger weekly goal for Plus members", kind: "RUN_DISTANCE", target: 15000, period: "WEEKLY", difficulty: "HARD", rewardCoins: 300, rewardXp: 200, premium: true, sort: 13 },
];

const _legacyAchievements = [
  { key: "steps_1k", title: "First 1,000 steps", description: "Every journey starts here", kind: "TOTAL_STEPS", target: 1000, icon: "paw", rewardCoins: 30 },
  { key: "dist_1km", title: "First kilometer", description: "Walk or run your first km", kind: "TOTAL_DISTANCE", target: 1000, icon: "flag", rewardCoins: 40 },
  { key: "single_5km", title: "First 5K", description: "5 km in a single activity", kind: "SINGLE_DISTANCE", target: 5000, icon: "medal", rewardCoins: 120 },
  { key: "first_run", title: "First run", description: "Complete a running session", kind: "RUN_COUNT", target: 1, icon: "bolt", rewardCoins: 40 },
  { key: "streak_10", title: "10-day streak", description: "Ten active days in a row", kind: "STREAK", target: 10, icon: "flame", rewardCoins: 150 },
  { key: "dist_100km", title: "100 km club", description: "Walk or run 100 km in total", kind: "TOTAL_DISTANCE", target: 100000, icon: "globe", rewardCoins: 500, rewardXp: 200 },
  { key: "pets_10", title: "Pet whisperer", description: "Collect 10 pets", kind: "PET_COUNT", target: 10, icon: "heart", rewardCoins: 400 },
  { key: "shop_first", title: "Grand opening", description: "Place your first item in your shop", kind: "SHOP_PLACEMENTS", target: 1, icon: "home", rewardCoins: 30 },
  { key: "missions_50", title: "Mission master", description: "Complete 50 missions", kind: "MISSION_COUNT", target: 50, icon: "star", rewardCoins: 300 },
  { key: "activities_25", title: "Regular", description: "Complete 25 activities", kind: "ACTIVITY_COUNT", target: 25, icon: "calendar", rewardCoins: 200 },
];

async function main() {
  for (const [i, p] of pets.entries()) {
    await db.petSpecies.upsert({ where: { key: p.key }, create: { ...p, sort: i }, update: { ...p, sort: i } });
  }
  for (const [i, it] of items.entries()) {
    await db.item.upsert({ where: { key: it.key }, create: { ...it, sort: i }, update: { ...it, sort: i } });
  }
  for (const m of missions) await db.mission.upsert({ where: { key: m.key }, create: m, update: m });
  // Badge catalogue (src/lib/achievements/catalog.ts). Existing rows keep admin edits; legacy rows (no art yet) are upgraded.
  const { BADGES } = await import("../src/lib/achievements/catalog");
  for (const [i, b] of BADGES.entries()) {
    const { art, ...rest } = b;
    const existing = await db.achievement.findUnique({ where: { key: b.key } });
    if (!existing) await db.achievement.create({ data: { ...rest, art, icon: art.prop ?? "trophy", sort: i } });
    else if (!existing.art) await db.achievement.update({ where: { key: b.key }, data: { ...rest, art, icon: art.prop ?? "trophy", sort: i } });
  }

  const { defaultConfigs } = await import("../src/lib/game/activity-types");
  for (const c of defaultConfigs()) {
    const { key, ...rest } = c;
    await db.activityTypeConfig.upsert({ where: { key }, create: { key, ...rest }, update: {} }); // keep admin edits
  }

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1);
  const now0 = new Date(); const dow = (now0.getUTCDay() + 6) % 7;
  const weekStart = new Date(Date.UTC(now0.getUTCFullYear(), now0.getUTCMonth(), now0.getUTCDate() - dow)); const weekEnd = new Date(weekStart.getTime() + 7 * 86400000 - 1000);
  const weekStartIso = weekStart.toISOString().slice(0, 10);
  const challenges = [
    { key: `community-${monthStart.toISOString().slice(0, 7)}`, title: "Community: walk 50 km this month", description: "Join walkers everywhere for a cozy month of steps.", kind: "WALK_DISTANCE", target: 50000, period: "MONTHLY", community: true, startsAt: monthStart, endsAt: monthEnd, rewardCoins: 400, rewardXp: 250 },
    { key: `run-month-${monthStart.toISOString().slice(0, 7)}`, title: "Run 20 km this month", description: "Lace up a few times a week.", kind: "RUN_DISTANCE", target: 20000, period: "MONTHLY", startsAt: monthStart, endsAt: monthEnd, rewardCoins: 300, rewardXp: 200 },
    { key: `active-month-${monthStart.toISOString().slice(0, 7)}`, title: "20 activities this month", description: "Consistency beats intensity.", kind: "ACTIVITY_COUNT", target: 20, period: "MONTHLY", startsAt: monthStart, endsAt: monthEnd, rewardCoins: 250, rewardXp: 150 },
    { key: `steps-week-${weekStartIso}`, title: "Walk 50,000 steps this week", description: "About 7,000 a day — you've got this.", kind: "STEPS", target: 50000, period: "WEEKLY", startsAt: weekStart, endsAt: weekEnd, rewardCoins: 200, rewardXp: 120 },
    { key: `walk10-week-${weekStartIso}`, title: "Walk 10 km this week", description: "A few cozy loops around the block.", kind: "WALK_DISTANCE", target: 10000, period: "WEEKLY", startsAt: weekStart, endsAt: weekEnd, rewardCoins: 150, rewardXp: 100 },
    { key: `bike-week-${weekStartIso}`, title: "Ride 30 km this week", description: "Wheels up for the cycling crew.", kind: "BIKE_DISTANCE", target: 30000, period: "WEEKLY", startsAt: weekStart, endsAt: weekEnd, rewardCoins: 150, rewardXp: 100 },
    { key: `team-month-${monthStart.toISOString().slice(0, 7)}`, title: "Pups vs Wolves: team walk-off", description: "You'll be placed on a team — every km you walk counts for your side.", kind: "WALK_DISTANCE", target: 30000, period: "MONTHLY", community: true, teamMode: true, startsAt: monthStart, endsAt: monthEnd, rewardCoins: 300, rewardXp: 200 },
  ];
  for (const c of challenges) await db.challenge.upsert({ where: { key: c.key }, create: c, update: {} });

  const plans = [
    { key: "plus_monthly", name: "Walkie Plus · Monthly", description: "Exclusive pets, premium decor and advanced stats", priceCents: 499, paymongoAmount: 24900, interval: "month", trialDays: 7, stripePriceId: process.env.STRIPE_PRICE_PLUS_MONTHLY ?? null, sort: 1 },
    { key: "plus_yearly", name: "Walkie Plus · Yearly", description: "Two months free", priceCents: 3999, paymongoAmount: 199000, interval: "year", trialDays: 7, stripePriceId: process.env.STRIPE_PRICE_PLUS_YEARLY ?? null, sort: 2 },
  ];
  const features = ["Advanced statistics & monthly reports", "Exclusive pets (Bandit the Raccoon)", "Premium decorations & Winter village", "Plus-only weekly missions", "No ads"];
  for (const p of plans) await db.subscriptionPlan.upsert({ where: { key: p.key }, create: { ...p, features }, update: { stripePriceId: p.stripePriceId ?? undefined } });
  // PayMongo prices: only filled in for plans that don't have one yet (admin edits are kept)
  for (const p of plans) await db.subscriptionPlan.updateMany({ where: { key: p.key, paymongoAmount: null }, data: { paymongoAmount: p.paymongoAmount } });

  const flags = [
    { key: "leaderboards", description: "Friends & weekly leaderboards", enabled: true },
    { key: "challenges", description: "Daily/weekly/monthly challenges", enabled: true },
    { key: "shop_visits", description: "Visit friends' pet shops", enabled: true },
    { key: "rewarded_ads", description: "Optional rewarded ads in the shop", enabled: false },
    { key: "pet_adoption", description: "Pet adoption & visitors (future)", enabled: false },
  ];
  for (const f of flags) await db.featureFlag.upsert({ where: { key: f.key }, create: f, update: {} });

  const ads = [
    { key: "shop_rewarded", name: "Shop: watch for coins", screen: "shop", format: "REWARDED", rewardCoins: 25, frequencyCapPerDay: 3 },
    { key: "explore_banner", name: "Explore: banner", screen: "explore", format: "BANNER", frequencyCapPerDay: 10 },
  ];
  for (const a of ads) await db.adPlacement.upsert({ where: { key: a.key }, create: a, update: {} });

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL.toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (!existing) {
      console.log("No account for ADMIN_EMAIL yet — run `npm run admin:create` to create it.");
    } else if (existing.role !== "ADMIN") {
      await db.user.update({ where: { email }, data: { role: "ADMIN" } });
      console.log(`Promoted ${email} to ADMIN`);
    }
  }
  console.log(`Seeded ${pets.length} pets, ${items.length} items, ${missions.length} missions, ${(await db.achievement.count())} achievements.`);
}

main().finally(() => db.$disconnect());
