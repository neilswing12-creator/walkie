import { RARITY_META, type Rarity } from "@/lib/constants";
export function RarityBadge({ rarity, className = "" }: { rarity: string; className?: string }) {
  const m = RARITY_META[rarity as Rarity] ?? RARITY_META.COMMON;
  return <span className={`chip ${className}`} style={{ color: m.color, background: m.bg }}>{m.label}</span>;
}
export const rarityClass = (r: string) => ({ RARE: "rarity-rare", EPIC: "rarity-epic", LEGENDARY: "rarity-legendary", MYTHICAL: "rarity-mythical" } as Record<string, string>)[r] ?? "";
export const rarityBg = (r: string) => (RARITY_META[r as Rarity] ?? RARITY_META.COMMON).bg;
