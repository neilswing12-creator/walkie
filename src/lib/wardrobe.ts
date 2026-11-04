/**
 * Walkie wardrobe catalogue (shared by seed, server validation and client UI). Art lives in components/mascot/Accessories.tsx,
 * keyed by `art` so colour variants reuse one drawing. Prices/availability in the DB stay admin-editable.
 */
export const SLOTS = ["HEAD", "FACE", "NECK", "BODY", "BACK", "FEET"] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_LABEL: Record<Slot, string> = { HEAD: "Hat", FACE: "Glasses", NECK: "Neck", BODY: "Top", BACK: "Back", FEET: "Shoes" };
/** Non-husky pets have different bodies; they can wear head/face/neck/back items only. */
/** Slots every species can wear — all of them, since every pet now stands on the shared Biped rig. */
export const PET_SLOTS: Slot[] = ["HEAD", "FACE", "NECK", "BODY", "BACK", "FEET"];

export type WardrobeGroup = "HAT" | "CAP" | "GLASSES" | "BANDANA" | "NECK" | "HOODIE" | "SHIRT" | "JACKET" | "COSTUME" | "BACK" | "SHOES";
export type WardrobeDef = { key: string; name: string; description: string; slot: Slot; group: WardrobeGroup; art: string; rarity: string; priceCoins: number; color: string; premium?: boolean; seasonal?: boolean; fitness?: boolean; set?: string };

const W = (key: string, name: string, description: string, slot: Slot, group: WardrobeGroup, art: string, rarity: string, priceCoins: number, color: string, f: Partial<WardrobeDef> = {}): WardrobeDef => ({ key, name, description, slot, group, art, rarity, priceCoins, color, ...f });

export const WARDROBE: WardrobeDef[] = [
  // HEAD
  W("acc_cap", "Sport cap", "Keeps the sun out of your eyes on long walks", "HEAD", "CAP", "cap", "COMMON", 140, "#6B8FD6", { fitness: true }),
  W("acc_cap_coral", "Coral cap", "A bright cap for bright mornings", "HEAD", "CAP", "cap", "COMMON", 140, "#E36D5D"),
  W("acc_cap_back", "Backwards cap", "Maximum chill mode", "HEAD", "CAP", "capback", "UNCOMMON", 180, "#425A7C"),
  W("acc_beanie", "Knit beanie", "For chilly morning runs", "HEAD", "HAT", "beanie", "COMMON", 160, "#425A7C"),
  W("acc_beanie_rose", "Rose beanie", "Soft knit with a fluffy pom", "HEAD", "HAT", "beanie", "COMMON", 160, "#E98BB5"),
  W("acc_bow", "Ribbon bow", "Simply adorable", "HEAD", "HAT", "bow", "COMMON", 100, "#F28DAA"),
  W("acc_bucket", "Bucket hat", "Trail-ready and very floppy", "HEAD", "HAT", "bucket", "UNCOMMON", 200, "#C9B48A"),
  W("acc_headband", "Sweatband", "Serious training energy", "HEAD", "HAT", "headband", "COMMON", 90, "#5DBE9A", { fitness: true }),
  W("acc_partyhat", "Party hat", "Every milestone deserves one", "HEAD", "HAT", "partyhat", "COMMON", 120, "#A08BE0"),
  W("acc_flowercrown", "Flower crown", "Picked on a spring walk", "HEAD", "HAT", "flowercrown", "RARE", 320, "#F7C6D6", { seasonal: true }),
  W("acc_santa", "Festive hat", "Cozy holiday walks", "HEAD", "HAT", "santa", "RARE", 280, "#D9534F", { seasonal: true }),
  W("acc_helmet", "Bike helmet", "Badge reward for your first ride", "HEAD", "HAT", "helmet", "UNCOMMON", 0, "#6B8FD6", { fitness: true }),
  W("acc_tiara", "Star tiara", "Twinkles when you hit your goal", "HEAD", "HAT", "tiara", "EPIC", 700, "#C7B8F5"),
  W("acc_spacehelmet", "Space helmet", "One small step for a pup", "HEAD", "COSTUME", "spacehelmet", "EPIC", 900, "#DCE6F2", { set: "astro" }),
  W("acc_laurel", "Champion laurel", "Leaderboard champion reward — earned, never sold", "HEAD", "HAT", "laurel", "LEGENDARY", 0, "#E2B64A"),
  W("acc_crown", "Golden crown", "For the most legendary walker", "HEAD", "HAT", "crown", "LEGENDARY", 1500, "#E2B64A", { premium: true, set: "royal" }),
  // FACE
  W("acc_roundglasses", "Round specs", "Smart and studious", "FACE", "GLASSES", "roundglasses", "COMMON", 150, "#3A3F4A"),
  W("acc_sunglasses", "Sporty shades", "Sunny-day runner", "FACE", "GLASSES", "sunglasses", "RARE", 260, "#242B35", { fitness: true }),
  W("acc_heartglasses", "Heart shades", "Love every step", "FACE", "GLASSES", "heartglasses", "UNCOMMON", 220, "#F28DAA"),
  W("acc_goggles", "Swim goggles", "Ready for the splash zone", "FACE", "GLASSES", "goggles", "UNCOMMON", 200, "#4CB3C9", { fitness: true }),
  // NECK
  W("acc_bandana", "Blue bandana", "Classic adventure look", "NECK", "BANDANA", "bandana", "COMMON", 120, "#6B8FD6"),
  W("acc_bandana_red", "Red bandana", "Trailblazer red", "NECK", "BANDANA", "bandana", "COMMON", 120, "#E36D5D"),
  W("acc_scarf", "Cozy scarf", "Warm and stripy", "NECK", "NECK", "scarf", "UNCOMMON", 180, "#E98BB5"),
  W("acc_bowtie", "Bow tie", "Dapper for every occasion", "NECK", "NECK", "bowtie", "COMMON", 110, "#425A7C"),
  W("acc_whistle", "Coach whistle", "On your marks…", "NECK", "NECK", "whistle", "UNCOMMON", 160, "#E2B64A", { fitness: true }),
  W("acc_pawpendant", "Paw pendant", "A crystal paw that catches the light", "NECK", "NECK", "pawpendant", "RARE", 300, "#A9C5ED"),
  W("acc_medal", "Gold medal", "Badge reward — earned, never sold", "NECK", "NECK", "medal", "EPIC", 0, "#E2B64A", { fitness: true }),
  // BODY
  W("acc_hoodie", "Walkie hoodie", "The blue fitness hoodie — soft fleece, big pocket", "BODY", "HOODIE", "hoodie", "UNCOMMON", 360, "#6B8FD6", { fitness: true }),
  W("acc_hoodie_mint", "Mint hoodie", "Fresh as a morning breeze", "BODY", "HOODIE", "hoodie", "UNCOMMON", 360, "#5DBE9A"),
  W("acc_runtee", "Running tee", "Light, breathy, fast", "BODY", "SHIRT", "runtee", "COMMON", 220, "#5DBE9A", { fitness: true }),
  W("acc_stripetee", "Striped tee", "A sunny-day classic", "BODY", "SHIRT", "stripetee", "COMMON", 200, "#425A7C"),
  W("acc_raincoat", "Raincoat", "Puddles? Bring them on", "BODY", "JACKET", "raincoat", "UNCOMMON", 380, "#F2C94C"),
  W("acc_puffer", "Winter puffer", "Cozy jacket for frosty walks", "BODY", "JACKET", "puffer", "RARE", 520, "#E36D5D", { seasonal: true }),
  W("acc_varsity", "Varsity jacket", "Team Walkie, class of every day", "BODY", "JACKET", "varsity", "RARE", 560, "#425A7C"),
  W("acc_sweater", "Festive sweater", "Knitted with snowflakes", "BODY", "SHIRT", "sweater", "RARE", 420, "#3E8E6A", { seasonal: true }),
  W("acc_astronaut", "Astronaut suit", "Mission control says: go for walkies", "BODY", "COSTUME", "astronaut", "EPIC", 1200, "#F4F6F8", { set: "astro" }),
  W("acc_robe", "Royal robe", "Velvet, gold trim, very regal", "BODY", "COSTUME", "robe", "LEGENDARY", 1800, "#7B5CC9", { premium: true, set: "royal" }),
  // BACK
  W("acc_backpack", "Tiny backpack", "Carries snacks for two", "BACK", "BACK", "backpack", "RARE", 320, "#5DBE9A"),
  W("acc_bottlepack", "Hydration pack", "Sip while you stride", "BACK", "BACK", "bottlepack", "UNCOMMON", 240, "#4CB3C9", { fitness: true }),
  W("acc_cape", "Hero cape", "Every walk is a rescue mission", "BACK", "BACK", "cape", "RARE", 450, "#D9534F"),
  W("acc_wings", "Starlight wings", "Shimmer on night walks", "BACK", "BACK", "wings", "EPIC", 800, "#C7B8F5", { seasonal: true }),
  W("acc_jetpack", "Jetpack", "For extra-speedy zoomies", "BACK", "COSTUME", "jetpack", "EPIC", 950, "#B9C3D1", { set: "astro" }),
  // FEET
  W("acc_shoes", "Trail sneakers", "Grippy soles for every path", "FEET", "SHOES", "sneakers", "COMMON", 200, "#6B8FD6", { fitness: true }),
  W("acc_rainboots", "Rain boots", "Splash-proof and shiny", "FEET", "SHOES", "rainboots", "UNCOMMON", 220, "#F2C94C"),
  W("acc_snowboots", "Snow boots", "Fluffy cuffs, warm toes", "FEET", "SHOES", "snowboots", "UNCOMMON", 260, "#8C6A4F", { seasonal: true }),
  W("acc_racers", "Racing flats", "Built for personal bests", "FEET", "SHOES", "racers", "RARE", 380, "#E36D5D", { fitness: true }),
  W("acc_moonboots", "Moon boots", "Bouncy, chunky, out of this world", "FEET", "SHOES", "moonboots", "EPIC", 600, "#DCE6F2", { set: "astro" }),
];
export const WARDROBE_BY_KEY = Object.fromEntries(WARDROBE.map((w) => [w.key, w])) as Record<string, WardrobeDef>;
export const artOf = (key: string) => WARDROBE_BY_KEY[key]?.art ?? key.replace(/^acc_/, "");
export const slotOf = (key: string): Slot | undefined => WARDROBE_BY_KEY[key]?.slot;

/** Character presentation — the same Walkie; differences are subtle styling + a starter outfit. Never tied to the user's gender. */
export const LOOKS = {
  classic: { label: "Classic", sub: "The original Walkie", preset: ["acc_bandana"] },
  sporty: { label: "Boy-style", sub: "A touch bolder · sporty starter kit", preset: ["acc_cap", "acc_runtee", "acc_shoes"] },
  sunny: { label: "Girl-style", sub: "Lashes & a bow · sunny starter kit", preset: ["acc_bow", "acc_stripetee", "acc_shoes"] },
} as const;
export type LookKey = keyof typeof LOOKS;
export const FURS = {
  classic: { label: "Classic gray", fur: "#8592A6", light: "#A3AEBE", dark: "#6B778B" },
  midnight: { label: "Midnight", fur: "#4E5666", light: "#697283", dark: "#383E4B" },
  silver: { label: "Silver", fur: "#AEB8C6", light: "#C6CED9", dark: "#919CAC" },
  copper: { label: "Copper", fur: "#C48A62", light: "#DAA67F", dark: "#A26E4B" },
  sable: { label: "Sable", fur: "#8B7F75", light: "#A69A90", dark: "#6E645B" },
} as const;
export type FurKey = keyof typeof FURS;
/** Free starter wardrobe so every look's preset is wearable from day one. */
export const STARTER_WARDROBE = ["acc_bandana", "acc_cap", "acc_runtee", "acc_shoes", "acc_bow", "acc_stripetee"];

export const WARDROBE_TABS = [
  { key: "HATS", label: "Hats", test: (d: WardrobeDef) => d.slot === "HEAD" && d.group !== "COSTUME" },
  { key: "GLASSES", label: "Glasses", test: (d: WardrobeDef) => d.slot === "FACE" },
  { key: "NECK", label: "Neck", test: (d: WardrobeDef) => d.slot === "NECK" },
  { key: "TOPS", label: "Tops", test: (d: WardrobeDef) => d.slot === "BODY" && d.group !== "COSTUME" },
  { key: "BACK", label: "Back", test: (d: WardrobeDef) => d.slot === "BACK" && d.group !== "COSTUME" },
  { key: "SHOES", label: "Shoes", test: (d: WardrobeDef) => d.slot === "FEET" },
  { key: "COSTUMES", label: "Costumes", test: (d: WardrobeDef) => d.group === "COSTUME" || !!d.set },
  { key: "FITNESS", label: "Fitness", test: (d: WardrobeDef) => !!d.fitness },
  { key: "SEASONAL", label: "Seasonal", test: (d: WardrobeDef) => !!d.seasonal },
  { key: "PREMIUM", label: "Premium", test: (d: WardrobeDef) => !!d.premium || d.rarity === "LEGENDARY" || d.rarity === "EPIC" },
] as const;
