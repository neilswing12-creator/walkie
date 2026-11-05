/**
 * Renders the campaign's character & icon artwork straight from the app's own components (source of truth),
 * so the pubmats always match the product. Run: npx tsx --tsconfig scratch/tsconfig.json marketing/pubmats/build-parts.tsx
 */
import { renderToStaticMarkup } from "react-dom/server";
import { createElement as h } from "react";
import { writeFileSync } from "fs";
import { Walkie } from "@/components/mascot/Walkie";
import { WalkieDefs } from "@/components/mascot/WalkieDefs";
import { PetArt } from "@/components/mascot/PetArt";
import { AppIcon } from "@/components/ui/AppIcon";
import { ItemIcon } from "@/components/wardrobe/ItemIcon";
import type { Slot } from "@/lib/wardrobe";

const A = (key: string, color: string) => ({ key, color });
const W = (o: Record<string, unknown>) => renderToStaticMarkup(h(Walkie, { size: 400, ...o } as never));
const parts: Record<string, string> = {
  defs: renderToStaticMarkup(h(WalkieDefs)),
  // 1 — hero
  heroWalkie: W({ mood: "greet", accessories: [A("acc_bandana", "#6B8FD6")] }),
  // 2 — wardrobe
  styleWalkie: W({ mood: "wag", expr: "smile", look: "sporty", accessories: [A("acc_cap", "#4F74C9"), A("acc_hoodie", "#6B8FD6"), A("acc_bandana_red", "#F2B84B"), A("acc_shoes", "#FAFAF7")] }),
  lookCozy: W({ mood: "idle", accessories: [A("acc_beanie_rose", "#F28DAA"), A("acc_scarf", "#F2B84B"), A("acc_puffer", "#E36D5D"), A("acc_snowboots", "#8C6A4F")] }),
  lookHero: W({ mood: "idle", fur: "silver", accessories: [A("acc_crown", "#E2B64A"), A("acc_cape", "#E36D5D"), A("acc_roundglasses", "#425A7C")] }),
  // 3 — podium (three different users' huskies)
  p1: W({ mood: "celebrate", accessories: [A("acc_laurel", "#E2B64A"), A("acc_varsity", "#425A7C"), A("acc_medal", "#E2B64A"), A("acc_racers", "#E36D5D")] }),
  p2: W({ mood: "wag", expr: "smile", fur: "midnight", accessories: [A("acc_headband", "#5DBE9A"), A("acc_runtee", "#5DBE9A"), A("acc_sunglasses", "#26303C"), A("acc_shoes", "#6B8FD6")] }),
  p3: W({ mood: "wag", expr: "smile", fur: "copper", look: "sunny", accessories: [A("acc_bow", "#F28DAA"), A("acc_stripetee", "#F28DAA"), A("acc_shoes", "#F28DAA")] }),
  // 4 — fitness
  runWalkie: W({ mood: "run", accessories: [A("acc_headband", "#6B8FD6"), A("acc_runtee", "#6B8FD6"), A("acc_racers", "#E36D5D")] }),
};
for (const s of ["corgi", "shiba", "cat", "bunny", "duck", "fox", "penguin", "hamster"]) parts[`pet_${s}`] = renderToStaticMarkup(h(PetArt as never, { species: s, size: 240, mood: "happy" } as never));
for (const n of ["walk", "run", "bike", "steps", "calories", "distance", "reward", "coins", "leaderboard", "friends", "wardrobe", "clothing", "accessory", "pets", "shop", "furniture", "achievement", "streak", "goal", "podium", "history"] as const)
  parts[`icon_${n}`] = renderToStaticMarkup(h(AppIcon, { name: n, size: 96 }));
const items: [string, string, Slot][] = [["acc_cap", "#4F74C9", "HEAD"], ["acc_sunglasses", "#26303C", "FACE"], ["acc_bandana", "#6B8FD6", "NECK"], ["acc_hoodie", "#6B8FD6", "BODY"], ["acc_backpack", "#F2B84B", "BACK"], ["acc_shoes", "#E36D5D", "FEET"], ["acc_crown", "#E2B64A", "HEAD"], ["acc_bow", "#F28DAA", "HEAD"]];
for (const [k, c, s] of items) parts[`item_${k}`] = renderToStaticMarkup(h(ItemIcon, { itemKey: k, color: c, slot: s, size: 120 }));
writeFileSync("marketing/pubmats/parts/parts.json", JSON.stringify(parts));
console.log(Object.keys(parts).length, "parts");
