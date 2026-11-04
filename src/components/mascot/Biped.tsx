/**
 * Shared standing body for Walkie and every pet species — two legs with feet planted on the ground and two arms that
 * work as hands. One rig means one set of wardrobe anchors and one set of animations for all characters:
 *  · legs  (`.wk-paw-l/-r`, x 80 / 105, feet on the ground at y≈188) carry shoes — the FEET slot
 *  · arms  (`.wk-arm-l/-r`, hung from the shoulders) carry sleeves — the BODY slot's arm art
 *  · torso is drawn in the wardrobe's original 200×200 torso space and squeezed (SQUEEZE) into the slimmer standing
 *    body, so every top, bib, backpack and necklace keeps fitting without redrawing it.
 * Each species keeps its own head and tail; only the colours of this body differ.
 */
import type { ReactNode } from "react";
import { TORSO, WearLayer, type AccessoryProp } from "./Accessories";

export const SQUEEZE = "translate(100 117) scale(.8 .78) translate(-100 -118)";
const BODY = "M60 182 C52 150 68 118 100 116 C132 118 148 150 140 182 Z";
const EDGE = "rgba(27,37,56,.2)";
/**
 * Proportions: the head is scaled to ~84% around the neck and sits just above the shoulders, so the figure reads
 * head ≈ 55% · torso ≈ 28% · legs ≈ 17% of its height (a balanced chibi rather than a big head on a stub).
 * Hats and glasses live inside the head group, so they scale with it.
 */
export const HEAD_LIFT = "translate(0 -5) translate(100 134) scale(.84) translate(-100 -134)";
/** Whole-figure scale about the ground point, so the slimmer character still fills the 200×200 frame. */
export const FIGURE = "translate(100 188) scale(1.07) translate(-100 -188)";
const BELLY = "M78 182 C76 156 87 134 100 134 C113 134 124 156 122 182 Z";

/** Arm placement: drawn in the old front-leg space (x, y 146–176) and hung from the shoulder. */
const ARM = {
  l: { x: 80, cx: 87.5, place: "translate(70 131) rotate(13) translate(-87.5 -142)" },
  r: { x: 105, cx: 112.5, place: "translate(130 131) rotate(-13) translate(-112.5 -142)" },
} as const;

export type BipedPaint = {
  fur: string; belly?: string | null; leg?: string; foot?: string; arm?: string; hand?: string;
  furLight?: string; texture?: boolean; chest?: ReactNode; toes?: string;
};

export function Biped({ p, items = [] }: { p: BipedPaint; items?: AccessoryProp[] }) {
  const leg = p.leg ?? p.fur, foot = p.foot ?? leg, arm = p.arm ?? leg, hand = p.hand ?? arm, toes = p.toes ?? "rgba(27,37,56,.16)";
  const Leg = ({ side }: { side: "l" | "r" }) => {
    const x = side === "l" ? 80 : 105, cx = x + 7.5;
    return (
      <g className={side === "l" ? "wk-paw-l" : "wk-paw-r"}>
        <rect x={x} y="150" width="15" height="34" rx="7.5" fill={leg} stroke={EDGE} strokeWidth="1.2" />
        <rect x={x} y="150" width="15" height="34" rx="7.5" fill="url(#wkg-shade)" />
        <ellipse cx={cx} cy="182" rx="10.5" ry="6.4" fill={foot} stroke={EDGE} strokeWidth="1.2" />
        <ellipse cx={cx} cy="182" rx="10.5" ry="6.4" fill="url(#wkg-shade)" />
        <path d={`M${cx - 4} 184.5 v-3 M${cx} 185 v-3.4 M${cx + 4} 184.5 v-3`} stroke={toes} strokeWidth="1.5" strokeLinecap="round" />
        <WearLayer items={items} layer="frontPaw" x={x} only="FEET" />
      </g>
    );
  };
  const Arm = ({ side }: { side: "l" | "r" }) => {
    const a = ARM[side];
    return (
      <g transform={a.place}>
        <g className={side === "l" ? "wk-arm-l" : "wk-arm-r"} style={{ transformOrigin: `${a.cx}px 142px` }}>
          <rect x={a.x + 2} y="143" width="15" height="34" rx="7.5" fill="#1b2538" opacity=".14" />
          <rect x={a.x} y="140" width="15" height="34" rx="7.5" fill={arm} stroke={EDGE} strokeWidth="1.3" />
          <rect x={a.x} y="140" width="15" height="34" rx="7.5" fill="url(#wkg-shade)" />
          <path d={`M${a.x + 4} 146 v18`} stroke="#fff" strokeOpacity=".28" strokeWidth="2.6" strokeLinecap="round" />
          <ellipse cx={a.cx} cy="171" rx="8.8" ry="8.2" fill={hand} stroke={EDGE} strokeWidth="1.3" />
          <path d={`M${a.cx - 3.4} 175.5 v-2.6 M${a.cx + 3.4} 175.5 v-2.6`} stroke={toes} strokeWidth="1.4" strokeLinecap="round" />
          <WearLayer items={items} layer="frontPaw" x={a.x} only="BODY" />
        </g>
      </g>
    );
  };
  return (
    <g className="wk-body">
      <Leg side="l" /><Leg side="r" />
      <g transform={SQUEEZE}>
        <path d={BODY} fill={p.fur} />
        {p.texture && <path d={BODY} fill="url(#wkg-fur)" />}
        <path d={BODY} fill="url(#wkg-shade)" />
        {p.furLight && <path d="M64 150 C70 132 82 122 96 119" stroke={p.furLight} strokeWidth="6" strokeLinecap="round" fill="none" opacity=".6" />}
        {p.belly && <path d={BELLY} fill={p.belly} />}
        {p.chest}
        <WearLayer items={items} layer="torso" />
      </g>
      <Arm side="l" /><Arm side="r" />
    </g>
  );
}

/** Layers worn over the squeezed torso (necklaces, bibs, backpacks) — same transform as the body. */
export function TorsoWear({ items, layer }: { items: AccessoryProp[]; layer: "neck" | "front" }) {
  return <g transform={SQUEEZE}><WearLayer items={items} layer={layer} /></g>;
}
export { TORSO };
