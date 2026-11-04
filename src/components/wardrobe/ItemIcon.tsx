import { ICON_VIEWBOX, WearLayer } from "../mascot/Accessories";
import { artOf, type Slot } from "@/lib/wardrobe";
const ART_VIEWBOX: Record<string, string> = { backpack: "104 110 60 62", bottlepack: "102 108 60 62", cape: "24 112 152 88", wings: "4 92 192 82", jetpack: "28 100 144 96", bow: "98 26 56 50", partyhat: "66 -10 72 84", tiara: "56 18 88 50", spacehelmet: "24 10 152 154", whistle: "70 120 60 46", pawpendant: "70 120 60 46", medal: "74 118 52 54" };
/** An item drawn on its own, cropped from Walkie's coordinate space — so icons always match what Walkie wears. */
export function ItemIcon({ itemKey, color, slot, size = 56, className = "" }: { itemKey: string; color?: string | null; slot: Slot; size?: number; className?: string }) {
  const items = [{ key: itemKey, color }];
  return (
    <svg viewBox={ART_VIEWBOX[artOf(itemKey)] ?? ICON_VIEWBOX[slot]} width={size} height={size} className={`overflow-visible ${className}`} aria-hidden preserveAspectRatio="xMidYMid meet">
      {(slot === "BODY" || slot === "FEET") && <g fill="#E4E9F0">{slot === "BODY" && <path d="M60 182 C52 150 68 118 100 116 C132 118 148 150 140 182 Z" />}<rect x="80" y="146" width="15" height="38" rx="7.5" /><rect x="105" y="146" width="15" height="38" rx="7.5" /></g>}
      {slot === "BACK" && <WearLayer items={items} layer="behind" />}
      {slot === "BODY" && <WearLayer items={items} layer="torso" />}
      {(slot === "BODY" || slot === "FEET") && <><WearLayer items={items} layer="frontPaw" x={80} /><WearLayer items={items} layer="frontPaw" x={105} /></>}
      {slot === "BACK" && <WearLayer items={items} layer="front" />}
      {(slot === "NECK" || slot === "BACK") && <WearLayer items={items} layer="neck" />}
      {slot === "FACE" && <WearLayer items={items} layer="face" />}
      {slot === "HEAD" && <WearLayer items={items} layer="head" />}
    </svg>
  );
}
