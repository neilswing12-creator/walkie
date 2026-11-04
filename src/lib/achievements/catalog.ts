/**
 * The default badge catalogue. Seeded into the Achievement table (admins can edit/extend it there);
 * the UI never hardcodes badges — it reads definitions from the database.
 * `art` drives the procedural badge illustration: Walkie pose + accessory + scene + prop + label.
 */
export type BadgeArt = { pose: string; acc?: string; scene: string; prop?: string; label?: string };
export type BadgeDef = { key: string; title: string; description: string; category: string; rarity: string; kind: string; target: number; rewardCoins: number; rewardXp: number; rewardItemKey?: string; art: BadgeArt; hidden?: boolean; enabled?: boolean; startsAt?: Date; endsAt?: Date };

export const CATEGORIES = ["WALKING", "RUNNING", "CYCLING", "FITNESS", "STREAKS", "RECORDS", "PETS", "SHOP", "SOCIAL", "SEASONAL"] as const;
export const CATEGORY_LABEL: Record<string, string> = { WALKING: "Walking", RUNNING: "Running", CYCLING: "Cycling", FITNESS: "Fitness", STREAKS: "Streaks", RECORDS: "Records", PETS: "Pets", SHOP: "Pet Shop", SOCIAL: "Social", SEASONAL: "Seasonal" };

const R = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHICAL"] as const;
/** Reward scales with rarity — tuned so badges feel generous without dominating the activity economy. */
const REWARD: Record<string, [number, number]> = { COMMON: [20, 10], UNCOMMON: [50, 25], RARE: [120, 60], EPIC: [300, 150], LEGENDARY: [800, 400], MYTHICAL: [2000, 1000] };
const def = (key: string, title: string, description: string, category: string, rarity: (typeof R)[number], kind: string, target: number, art: BadgeArt, extra: Partial<BadgeDef> = {}): BadgeDef => ({ key, title, description, category, rarity, kind, target, rewardCoins: REWARD[rarity][0], rewardXp: REWARD[rarity][1], art, ...extra });
const k = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000}M` : n >= 1000 ? `${n / 1000}K` : String(n));

const walking: BadgeDef[] = [
  [100, "First Pawprints", "Take your first 100 steps", "COMMON", "meadow", "sit"],
  [500, "Little Explorer", "Take 500 steps", "COMMON", "meadow", "walk"],
  [1000, "First 1,000 Steps", "Every journey starts here", "COMMON", "path", "walk"],
  [2500, "Neighborhood Stroller", "Walk 2,500 steps in total", "COMMON", "town", "walk"],
  [5000, "Park Wanderer", "Walk 5,000 steps in total", "UNCOMMON", "park", "walk"],
  [10000, "10K Steps Explorer", "Reach 10,000 lifetime steps", "UNCOMMON", "forest", "walk"],
  [15000, "Trail Sniffer", "Reach 15,000 lifetime steps", "UNCOMMON", "forest", "happy"],
  [20000, "Hill Hopper", "Reach 20,000 lifetime steps", "UNCOMMON", "hills", "walk"],
  [25000, "Quarter-Marathon Paws", "Reach 25,000 lifetime steps", "RARE", "hills", "jump"],
  [50000, "Forest Ranger", "Reach 50,000 lifetime steps", "RARE", "forest", "walk"],
  [100000, "Hundred-K Hiker", "Reach 100,000 lifetime steps", "RARE", "mountain", "celebrate"],
  [500000, "Mountain Climber", "Reach 500,000 lifetime steps", "EPIC", "mountain", "walk"],
  [1000000, "Million-Step Legend", "Reach 1,000,000 lifetime steps", "LEGENDARY", "summit", "celebrate"],
  [5000000, "Continental Walker", "Reach 5,000,000 lifetime steps", "LEGENDARY", "globe", "walk"],
  [10000000, "Walkie Immortal", "Reach 10,000,000 lifetime steps", "MYTHICAL", "aurora", "celebrate"],
].map(([n, t, d, r, scene, pose], i) => def(`walk_steps_${n}`, t as string, d as string, "WALKING", r as (typeof R)[number], "TOTAL_STEPS", n as number, { pose: pose as string, scene: scene as string, acc: i >= 5 ? "acc_shoes" : undefined, prop: "steps", label: k(n as number) }, i >= 12 ? { rewardItemKey: "acc_crown" } : {}));

const km = (n: number) => n * 1000;
const running: BadgeDef[] = [
  def("run_first", "First Run", "Complete your first run or jog", "RUNNING", "COMMON", "RUN_COUNT", 1, { pose: "run", scene: "track", acc: "acc_shoes", prop: "flag" }),
  ...[[1, "First 1K", "COMMON"], [3, "First 3K", "COMMON"], [5, "First 5K", "UNCOMMON"], [10, "First 10K", "RARE"], [15, "First 15K", "RARE"], [21.1, "Half-Marathon Hero", "EPIC"], [42.2, "Marathon Legend", "LEGENDARY"]].map(([n, t, r]) =>
    def(`run_single_${String(n).replace(".", "_")}k`, t as string, `Run ${n} km in a single activity`, "RUNNING", r as (typeof R)[number], "RUN_SINGLE_DISTANCE", km(n as number), { pose: (n as number) >= 21 ? "celebrate" : "run", scene: (n as number) >= 21 ? "finish" : "track", acc: (n as number) >= 21 ? "acc_bib" : "acc_shoes", prop: "finish", label: `${n}K` }, (n as number) >= 42 ? { rewardItemKey: "acc_medal" } : {})),
  ...[[10, "UNCOMMON"], [50, "RARE"], [100, "EPIC"], [500, "LEGENDARY"], [1000, "MYTHICAL"]].map(([n, r]) =>
    def(`run_total_${n}`, `${n} km Runner`, `Run ${n} km in total`, "RUNNING", r as (typeof R)[number], "RUN_TOTAL_DISTANCE", km(n as number), { pose: "run", scene: (n as number) >= 500 ? "sunrise" : "road", acc: "acc_medal", prop: "medal", label: `${n}` })),
];

const cycling: BadgeDef[] = [
  def("bike_first", "First Ride", "Go on your first bike ride", "CYCLING", "COMMON", "RIDE_COUNT", 1, { pose: "bike", scene: "countryside", prop: "flag" }, { rewardItemKey: "acc_helmet" }),
  ...[[1, "COMMON"], [5, "COMMON"], [10, "UNCOMMON"], [25, "RARE"], [50, "EPIC"], [100, "LEGENDARY"]].map(([n, r]) =>
    def(`bike_single_${n}`, n === 100 ? "Century Rider" : `First ${n} km Ride`, `Ride ${n} km in a single activity`, "CYCLING", r as (typeof R)[number], "RIDE_SINGLE_DISTANCE", km(n as number), { pose: "bike", scene: (n as number) >= 50 ? "finish" : "countryside", prop: "finish", label: `${n}K` })),
  ...[[100, "RARE"], [500, "EPIC"], [1000, "LEGENDARY"], [5000, "MYTHICAL"]].map(([n, r]) =>
    def(`bike_total_${n}`, `${n.toLocaleString()} km Cyclist`, `Ride ${n.toLocaleString()} km in total`, "CYCLING", r as (typeof R)[number], "RIDE_TOTAL_DISTANCE", km(n as number), { pose: "bike", scene: (n as number) >= 1000 ? "aurora" : "road", prop: "medal", label: k(n as number) })),
];

const fitness: BadgeDef[] = [
  ...[[5, "COMMON"], [10, "COMMON"], [30, "UNCOMMON"], [60, "RARE"], [90, "RARE"], [120, "EPIC"]].map(([n, r]) =>
    def(`dur_single_${n}`, `${(n as number) >= 60 ? `${(n as number) / 60}-hour` : `${n}-minute`} Adventure`, `Complete a single ${n}-minute activity`, "FITNESS", r as (typeof R)[number], "ACTIVITY_SINGLE_DURATION", n as number, { pose: (n as number) >= 60 ? "celebrate" : "walk", scene: "park", prop: "clock", label: (n as number) >= 60 ? `${(n as number) / 60}h` : `${n}m` })),
  ...[[5, "UNCOMMON"], [10, "RARE"], [50, "EPIC"], [100, "LEGENDARY"], [500, "MYTHICAL"]].map(([n, r]) =>
    def(`dur_total_${n}h`, `${n} Active Hours`, `Be active for ${n} hours in total`, "FITNESS", r as (typeof R)[number], "TOTAL_ACTIVE_MINUTES", (n as number) * 60, { pose: "jump", scene: "sunrise", prop: "clock", label: `${n}h` })),
  def("walk_dur_30", "Walk for 30", "Walk for 30 minutes in one go", "FITNESS", "COMMON", "WALK_SINGLE_DURATION", 30, { pose: "walk", scene: "path", prop: "clock", label: "30" }),
  def("run_dur_30", "Run for 30", "Run for 30 minutes in one go", "FITNESS", "UNCOMMON", "RUN_SINGLE_DURATION", 30, { pose: "run", scene: "track", prop: "clock", label: "30" }),
  def("bike_dur_60", "Ride for an Hour", "Ride for 60 minutes in one go", "FITNESS", "RARE", "RIDE_SINGLE_DURATION", 60, { pose: "bike", scene: "road", prop: "clock", label: "60" }),
];

const streaks: BadgeDef[] = [
  def("streak_1", "First Active Day", "Be active for the first time", "STREAKS", "COMMON", "ACTIVE_DAYS", 1, { pose: "greet", scene: "sunrise", prop: "calendar", label: "1" }),
  ...[[3, "COMMON"], [7, "UNCOMMON"], [14, "RARE"], [30, "RARE"], [60, "EPIC"], [100, "EPIC"], [180, "LEGENDARY"], [365, "MYTHICAL"]].map(([n, r]) =>
    def(`streak_${n}`, `${n}-Day Streak`, `Stay active ${n} days in a row (streak freezes count)`, "STREAKS", r as (typeof R)[number], "STREAK", n as number, { pose: (n as number) >= 100 ? "celebrate" : "sleep", scene: "night", prop: "flame", label: `${n}` })),
  def("weekend_warrior", "Weekend Warrior", "Be active on both Saturday and Sunday of the same weekend", "STREAKS", "UNCOMMON", "WEEKEND_WARRIOR", 1, { pose: "jump", scene: "park", prop: "calendar", label: "S+S" }),
  def("early_bird", "Early Bird", "Start 5 activities before 7 AM", "STREAKS", "RARE", "EARLY_BIRD", 5, { pose: "greet", scene: "sunrise", prop: "sun" }),
  def("night_owl", "Night Owl", "Start 5 activities after 9 PM", "STREAKS", "RARE", "NIGHT_OWL", 5, { pose: "walk", scene: "night", prop: "moon" }),
  def("seven_day_explorer", "Seven-Day Explorer", "Be active on 7 different days", "STREAKS", "UNCOMMON", "ACTIVE_DAYS", 7, { pose: "walk", scene: "forest", prop: "compass", label: "7" }),
  def("monthly_mover", "Monthly Mover", "Be active on 15 days in one calendar month", "STREAKS", "RARE", "MONTH_ACTIVE_DAYS_MAX", 15, { pose: "run", scene: "town", prop: "calendar", label: "15" }),
  def("perfect_week", "Perfect Week", "Hit your daily goal every day Monday–Sunday", "STREAKS", "EPIC", "PERFECT_WEEKS", 1, { pose: "celebrate", scene: "sunrise", prop: "star", label: "7/7" }),
  def("perfect_month", "Perfect Month", "Hit your daily goal every day of a calendar month", "STREAKS", "LEGENDARY", "PERFECT_MONTHS", 1, { pose: "celebrate", acc: "acc_crown", scene: "aurora", prop: "star", label: "★" }),
];

const records: BadgeDef[] = [
  def("pr_first", "First Personal Record", "Beat one of your own records", "RECORDS", "UNCOMMON", "RECORDS_SET", 1, { pose: "jump", scene: "track", prop: "trophy", label: "PR" }),
  def("pr_1k", "Fastest 1 km", "Set a new fastest 1 km pace", "RECORDS", "RARE", "RECORD:FASTEST_1K", 1, { pose: "run", scene: "track", prop: "bolt", label: "1K" }),
  def("pr_5k", "Fastest 5 km", "Set a new fastest 5 km pace", "RECORDS", "EPIC", "RECORD:FASTEST_5K", 1, { pose: "run", scene: "finish", prop: "bolt", label: "5K" }),
  def("pr_walk", "Longest Walk", "Beat your longest walk", "RECORDS", "UNCOMMON", "RECORD:LONGEST_WALK", 1, { pose: "walk", scene: "path", prop: "trophy" }),
  def("pr_run", "Longest Run", "Beat your longest run", "RECORDS", "RARE", "RECORD:LONGEST_RUN", 1, { pose: "run", scene: "road", prop: "trophy" }),
  def("pr_ride", "Longest Ride", "Beat your longest bike ride", "RECORDS", "RARE", "RECORD:LONGEST_RIDE", 1, { pose: "bike", scene: "countryside", prop: "trophy" }),
  def("pr_elev", "Highest Climb", "Set a new elevation-gain record", "RECORDS", "EPIC", "RECORD:MOST_ELEVATION", 1, { pose: "walk", scene: "mountain", prop: "mountain" }),
  def("big_step_day", "Big Step Day", "Take 12,000 steps in a single day", "RECORDS", "RARE", "DAILY_STEPS_MAX", 12000, { pose: "celebrate", scene: "town", prop: "steps", label: "12K" }),
  def("big_active_day", "Big Active Day", "Be active for 90 minutes in a single day", "RECORDS", "RARE", "DAILY_ACTIVE_MAX", 90, { pose: "jump", scene: "park", prop: "clock", label: "90" }),
];

const pets: BadgeDef[] = [
  def("pets_first", "First Friend", "Collect your first pet besides Walkie", "PETS", "COMMON", "PET_COUNT", 2, { pose: "happy", scene: "hearts", prop: "paw" }),
  def("pet_levelup", "Growing Up", "Level up any pet", "PETS", "COMMON", "PET_MAX_LEVEL", 2, { pose: "happy", scene: "hearts", prop: "star", label: "Lv2" }),
  def("pet_evolve", "First Evolution", "Grow a pet into its next stage", "PETS", "RARE", "PET_EVOLVED", 1, { pose: "celebrate", scene: "aurora", prop: "sparkle" }),
  def("pets_5", "Puppy Party", "Collect 5 pets", "PETS", "UNCOMMON", "PET_COUNT", 5, { pose: "happy", scene: "hearts", prop: "album", label: "5" }),
  def("pets_10", "Pet Whisperer", "Collect 10 pets", "PETS", "RARE", "PET_COUNT", 10, { pose: "happy", scene: "hearts", prop: "album", label: "10" }),
  def("pets_all", "Gotta Pet 'Em All", "Collect every pet in the current collection", "PETS", "LEGENDARY", "PET_ALL", 1, { pose: "celebrate", acc: "acc_crown", scene: "aurora", prop: "album" }),
  ...[[25, "EPIC"], [50, "LEGENDARY"], [100, "MYTHICAL"]].map(([n, r]) => def(`pets_${n}`, `${n} Pet Collector`, `Collect ${n} pets`, "PETS", r as (typeof R)[number], "PET_COUNT", n as number, { pose: "celebrate", scene: "hearts", prop: "album", label: `${n}` }, { enabled: false })), // enable when the catalogue has this many pets
  def("pets_common_all", "Common Crew", "Collect all Common pets", "PETS", "UNCOMMON", "PET_RARITY_ALL:COMMON", 1, { pose: "happy", scene: "meadow", prop: "album" }),
  def("pets_rare_all", "Rare Finds", "Collect all Rare pets", "PETS", "EPIC", "PET_RARITY_ALL:RARE", 1, { pose: "discover", scene: "forest", prop: "album" }),
  def("pets_legendary_all", "Legend Keeper", "Collect all Legendary pets", "PETS", "LEGENDARY", "PET_RARITY_ALL:LEGENDARY", 1, { pose: "discover", acc: "acc_crown", scene: "aurora", prop: "crown" }),
  def("pets_dog_set", "Good Dogs Club", "Collect the dog set: Husky, Corgi, Shiba and Golden", "PETS", "RARE", "PET_SET:husky,corgi,shiba,golden", 1, { pose: "greet", scene: "park", prop: "paw" }),
];

const shop: BadgeDef[] = [
  def("shop_build_first", "Grand Opening", "Place your first building in your pet shop", "SHOP", "COMMON", "SHOP_BUILDINGS", 1, { pose: "greet", acc: "acc_hardhat", scene: "shop", prop: "house" }),
  def("shop_first", "First Decoration", "Place your first item in your shop", "SHOP", "COMMON", "SHOP_PLACEMENTS", 1, { pose: "happy", scene: "shop", prop: "plant" }),
  def("shop_three_buildings", "Main Street", "Place 3 buildings in your shop", "SHOP", "UNCOMMON", "SHOP_BUILDINGS", 3, { pose: "walk", acc: "acc_hardhat", scene: "shop", prop: "house", label: "3" }),
  def("shop_expand", "Room to Grow", "Expand your pet shop", "SHOP", "UNCOMMON", "SHOP_EXPANSION", 1, { pose: "jump", acc: "acc_hardhat", scene: "shop", prop: "house" }),
  def("shop_env", "New Horizons", "Unlock your first environment", "SHOP", "RARE", "ENV_OWNED", 1, { pose: "discover", scene: "beach", prop: "compass" }),
  ...[[5, "UNCOMMON"], [10, "RARE"], [25, "EPIC"], [50, "LEGENDARY"]].map(([n, r]) => def(`shop_level_${n}`, `Shop Level ${n}`, `Reach pet shop level ${n}`, "SHOP", r as (typeof R)[number], "SHOP_LEVEL", n as number, { pose: "celebrate", scene: "shop", prop: "house", label: `Lv${n}` })),
  def("shop_decor_100", "Decorator Supreme", "Place 100 items in your shop", "SHOP", "EPIC", "SHOP_PLACEMENTS", 100, { pose: "happy", scene: "shop", prop: "plant", label: "100" }),
  def("shop_full", "Picture Perfect", "Fill 70% of your fully expanded shop", "SHOP", "LEGENDARY", "SHOP_FULL", 70, { pose: "celebrate", acc: "acc_crown", scene: "shop", prop: "house" }),
];

const social: BadgeDef[] = [
  def("friend_first", "Best Buds", "Add your first friend", "SOCIAL", "COMMON", "FRIEND_COUNT", 1, { pose: "greet", scene: "hearts", prop: "paw" }),
  def("visit_first", "Knock Knock", "Visit a friend's pet shop", "SOCIAL", "COMMON", "SHOP_VISITS_MADE", 1, { pose: "walk", scene: "town", prop: "house" }),
  def("visitor_first", "First Guest", "Get your first shop visitor", "SOCIAL", "UNCOMMON", "SHOP_VISITORS", 1, { pose: "greet", scene: "shop", prop: "house" }),
  def("share_first", "Show-Off Pup", "Share an activity for the first time", "SOCIAL", "COMMON", "SHARED_ACTIVITIES", 1, { pose: "happy", scene: "sunrise", prop: "share" }),
  def("challenge_first", "Challenger", "Complete your first challenge", "SOCIAL", "UNCOMMON", "CHALLENGES_COMPLETED", 1, { pose: "celebrate", scene: "finish", prop: "trophy" }),
  def("challenge_group", "Pack Spirit", "Complete a community challenge", "SOCIAL", "RARE", "COMMUNITY_CHALLENGES", 1, { pose: "celebrate", scene: "town", prop: "flag" }),
  def("invite_5", "Pack Leader", "Invite 5 friends who become active walkers", "SOCIAL", "EPIC", "QUALIFIED_INVITES", 5, { pose: "greet", scene: "hearts", prop: "share", label: "5" }),
  def("lb_first", "On the Board", "Finish a week on the leaderboard", "SOCIAL", "COMMON", "LEADERBOARD_WEEKS", 1, { pose: "walk", scene: "town", prop: "flag" }),
  def("lb_gold", "Golden Pace", "Reach Gold tier in a weekly competition", "SOCIAL", "RARE", "LEADERBOARD_TIER_GOLD", 1, { pose: "run", scene: "track", prop: "medal" }),
  def("lb_podium", "Podium Pup", "Finish in the top 3 of a public leaderboard", "SOCIAL", "EPIC", "LEADERBOARD_PODIUM", 1, { pose: "jump", scene: "track", prop: "trophy", label: "TOP 3" }),
  def("lb_champion", "Champion of the Pack", "Finish #1 on a public leaderboard", "SOCIAL", "LEGENDARY", "LEADERBOARD_CHAMPION", 1, { pose: "celebrate", acc: "acc_crown", scene: "track", prop: "trophy", label: "#1" }),
  def("duel_win", "Friendly Rival", "Win a friendly challenge", "SOCIAL", "UNCOMMON", "DUEL_WINS", 1, { pose: "jump", scene: "park", prop: "flag" }),
  def("cheer_10", "Cheerleader", "Cheer on friends 10 times", "SOCIAL", "UNCOMMON", "CHEERS_SENT", 10, { pose: "greet", scene: "hearts", prop: "heart", label: "10" }),
  def("invite_10", "Ambassador", "Invite 10 friends who become active walkers", "SOCIAL", "LEGENDARY", "QUALIFIED_INVITES", 10, { pose: "celebrate", acc: "acc_crown", scene: "hearts", prop: "share", label: "10" }),
  def("community_10", "Community Champion", "Complete 10 community challenges", "SOCIAL", "LEGENDARY", "COMMUNITY_CHALLENGES", 10, { pose: "celebrate", scene: "aurora", prop: "trophy", label: "10" }),
];

const d = (s: string) => new Date(s);
const seasonal: BadgeDef[] = [
  def("season_christmas_2026", "Snowy Holiday 2026", "Be active 3 times during the holidays (Dec 18–26, 2026)", "SEASONAL", "RARE", "SEASONAL_ACTIVITY", 3, { pose: "happy", acc: "acc_scarf", scene: "snow", prop: "gift", label: "2026" }, { startsAt: d("2026-12-18T00:00:00Z"), endsAt: d("2026-12-26T23:59:59Z") }),
  def("season_newyear_2027", "New Year Pawsome Start", "Be active during New Year week (Jan 1–7, 2027)", "SEASONAL", "UNCOMMON", "SEASONAL_ACTIVITY", 1, { pose: "celebrate", scene: "night", prop: "sparkle", label: "2027" }, { startsAt: d("2027-01-01T00:00:00Z"), endsAt: d("2027-01-07T23:59:59Z") }),
  def("season_valentine_2027", "Puppy Love", "Walk with someone you love (Feb 10–16, 2027)", "SEASONAL", "UNCOMMON", "SEASONAL_ACTIVITY", 1, { pose: "interact", scene: "hearts", prop: "heart" }, { startsAt: d("2027-02-10T00:00:00Z"), endsAt: d("2027-02-16T23:59:59Z") }),
  def("season_easter_2027", "Egg Hunt Explorer", "Be active 2 times during spring egg week (Mar 25–31, 2027)", "SEASONAL", "UNCOMMON", "SEASONAL_ACTIVITY", 2, { pose: "discover", scene: "meadow", prop: "egg" }, { startsAt: d("2027-03-25T00:00:00Z"), endsAt: d("2027-03-31T23:59:59Z") }),
  def("season_summer_2027", "Summer Sunshine", "Be active 20 times this summer (Jun 21–Aug 31, 2027)", "SEASONAL", "RARE", "SEASONAL_ACTIVITY", 20, { pose: "run", acc: "acc_sunglasses", scene: "beach", prop: "sun" }, { startsAt: d("2027-06-21T00:00:00Z"), endsAt: d("2027-08-31T23:59:59Z") }),
  def("season_halloween_2027", "Spooky Stroll", "Go for a walk during Halloween week (Oct 25–31, 2027)", "SEASONAL", "RARE", "SEASONAL_ACTIVITY", 1, { pose: "walk", scene: "night", prop: "pumpkin" }, { startsAt: d("2027-10-25T00:00:00Z"), endsAt: d("2027-10-31T23:59:59Z") }),
  def("season_anniversary_2027", "Walkie's First Birthday", "Be active during Walkie's anniversary week (Nov 4–10, 2027)", "SEASONAL", "EPIC", "SEASONAL_ACTIVITY", 1, { pose: "celebrate", acc: "acc_crown", scene: "aurora", prop: "cake", label: "1" }, { startsAt: d("2027-11-04T00:00:00Z"), endsAt: d("2027-11-10T23:59:59Z") }),
];

/** Legacy keys from the first release keep their unlocks; they're folded into categories here. */
const legacy: BadgeDef[] = [
  def("steps_1k", "First 1,000 Steps (Classic)", "Every journey starts here", "WALKING", "COMMON", "TOTAL_STEPS", 1000, { pose: "walk", scene: "path", prop: "steps", label: "1K" }, { enabled: false }),
  def("dist_1km", "First Kilometer", "Walk, run or ride your first kilometer", "FITNESS", "COMMON", "TOTAL_DISTANCE", 1000, { pose: "walk", scene: "path", prop: "flag", label: "1km" }),
  def("single_5km", "First 5K (any sport)", "5 km in a single activity", "FITNESS", "UNCOMMON", "SINGLE_DISTANCE", 5000, { pose: "run", scene: "track", prop: "finish", label: "5K" }),
  def("first_run", "First Run (Classic)", "Complete a running session", "RUNNING", "COMMON", "RUN_COUNT", 1, { pose: "run", scene: "track", prop: "flag" }, { enabled: false }),
  def("streak_10", "10-Day Streak", "Ten active days in a row", "STREAKS", "RARE", "STREAK", 10, { pose: "sleep", scene: "night", prop: "flame", label: "10" }),
  def("dist_100km", "100 km Club", "Walk, run or ride 100 km in total", "FITNESS", "EPIC", "TOTAL_DISTANCE", 100000, { pose: "celebrate", scene: "globe", prop: "medal", label: "100" }),
  def("missions_50", "Mission Master", "Complete 50 missions", "FITNESS", "EPIC", "MISSION_COUNT", 50, { pose: "celebrate", scene: "sunrise", prop: "star", label: "50" }),
  def("activities_25", "Regular", "Complete 25 activities", "FITNESS", "RARE", "ACTIVITY_COUNT", 25, { pose: "walk", scene: "town", prop: "calendar", label: "25" }),
];

export const BADGES: BadgeDef[] = [...walking, ...running, ...cycling, ...fitness, ...streaks, ...records, ...pets, ...shop, ...social, ...seasonal, ...legacy];
