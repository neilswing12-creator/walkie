/**
 * Walkie wardrobe art — every wearable, drawn in the shared 200×200 character space and split into render layers so
 * clothes sit *on* Walkie (sleeves move with the legs, hats tilt with the head, capes hang behind the body).
 * Landmarks: head ellipse c(100,90) r(54,46) · eyes (79,92)/(121,92) · neck ≈ y126–136 · torso y119–176 · front legs x80/105 y146–184.
 * Shading uses the shared, colour-independent gradients in WalkieDefs (fabric sheen, gloss, gold, glass).
 */
import type { ReactNode } from "react";
import { artOf } from "@/lib/wardrobe";

export type AccessoryProp = { key: string; color?: string | null };
export type Layer = "behind" | "torso" | "backPaw" | "frontPaw" | "neck" | "front" | "face" | "head";

/* ── colour helpers ─────────────────────────────────────────────── */
function mix(hex: string, to: string, t: number) {
  const p = (h: string) => { const n = h.replace("#", ""); const f = n.length === 3 ? n.split("").map((c) => c + c).join("") : n.slice(0, 6); return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)); };
  try { const a = p(hex), b = p(to); return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("")}`; } catch { return hex; }
}
const dk = (c: string, t = 0.18) => mix(c, "#1b2333", t);
const lt = (c: string, t = 0.35) => mix(c, "#ffffff", t);
const Sheen = ({ d }: { d: string }) => <path d={d} fill="url(#wkg-cloth)" pointerEvents="none" />;
const Gloss = ({ d }: { d: string }) => <path d={d} fill="url(#wkg-gloss)" pointerEvents="none" />;
const Stitch = ({ d, o = 0.55, c = "#fff" }: { d: string; o?: number; c?: string }) => <path d={d} fill="none" stroke={c} strokeOpacity={o} strokeWidth="1.3" strokeDasharray="2.4 2.4" strokeLinecap="round" />;
const GOLD = "url(#wkg-gold) #E2B64A";

export const TORSO = "M58 176 C52 148 66 122 100 119 C134 122 148 148 142 176 Q100 186 58 176 Z";
const sleeve = (x: number, c: string, top = 139, h = 22, cuff?: string) => (
  <g>
    <rect x={x - 2.5} y={top} width="20" height={h} rx="8.5" fill={c} />
    <Sheen d={`M${x - 2.5} ${top + 8} a8.5 8.5 0 0 1 8.5 -8.5 h3 a8.5 8.5 0 0 1 8.5 8.5 v${h - 17} a8.5 8.5 0 0 1 -8.5 8.5 h-3 a8.5 8.5 0 0 1 -8.5 -8.5z`} />
    {cuff && <rect x={x - 2.5} y={top + h - 5} width="20" height="5.5" rx="2.75" fill={cuff} />}
  </g>
);

type Art = Partial<Record<Exclude<Layer, "frontPaw" | "backPaw">, (c: string) => ReactNode>> & { frontPaw?: (x: number, c: string) => ReactNode; backPaw?: (cx: number, c: string) => ReactNode };

/* ── shoes ──────────────────────────────────────────────────────── */
const lowShoe = (x: number, c: string, sole: string, extra?: ReactNode) => (
  <g>
    <path d={`M${x - 3.5} 175 Q${x - 3.5} 168 ${x + 3} 168 L${x + 12} 168 Q${x + 19.5} 168 ${x + 19.5} 177 L${x + 19.5} 183 L${x - 3.5} 183 Z`} fill={c} />
    <Sheen d={`M${x - 3.5} 175 Q${x - 3.5} 168 ${x + 3} 168 L${x + 12} 168 Q${x + 19.5} 168 ${x + 19.5} 177 L${x + 19.5} 183 L${x - 3.5} 183 Z`} />
    <rect x={x - 4.5} y="182" width="25" height="5.5" rx="2.75" fill={sole} />
    {extra}
  </g>
);
const backShoe = (cx: number, c: string, sole: string) => (
  <g>
    <rect x={cx - 19} y="171" width="38" height="13" rx="6.5" fill={c} />
    <Sheen d={`M${cx - 19} 177 a6.5 6.5 0 0 1 6.5 -6.5 h25 a6.5 6.5 0 0 1 6.5 6.5 v1 a6.5 6.5 0 0 1 -6.5 6.5 h-25 a6.5 6.5 0 0 1 -6.5 -6.5z`} />
    <rect x={cx - 20} y="182" width="40" height="6" rx="3" fill={sole} />
  </g>
);
const boot = (x: number, c: string, top: number, sole: string, wide = 0) => {
  const l = x - 2 - wide, r = x + 17 + wide, d = `M${l} ${top + 4} Q${l} ${top} ${l + 4} ${top} L${r - 4} ${top} Q${r} ${top} ${r} ${top + 4} L${r} 174 Q${r + 3} 176 ${r + 3} 180 L${r + 3} 184 L${l - 1} 184 L${l - 1} 180 Q${l - 1} 176 ${l} 174 Z`;
  return (
    <g>
      <path d={d} fill={c} /><Gloss d={d} />
      <path d={`M${l + 3} ${top + 4} V172`} stroke="#fff" strokeOpacity=".45" strokeWidth="2.4" strokeLinecap="round" />
      <rect x={l - 2} y="182" width={r - l + 7} height="6" rx="3" fill={sole} />
    </g>
  );
};

/* ── catalogue ──────────────────────────────────────────────────── */
const ART: Record<string, Art> = {
  /* hats */
  cap: { head: (c) => (<g>
    <path d="M62 66 Q63 23 100 21 Q137 23 138 66 Z" fill={c} /><Sheen d="M62 66 Q63 23 100 21 Q137 23 138 66 Z" />
    <path d="M100 22 Q86 34 82 65 M100 22 Q114 34 118 65" stroke={dk(c, 0.22)} strokeWidth="1.6" fill="none" />
    <circle cx="100" cy="22" r="3.6" fill={dk(c, 0.25)} />
    <path d="M92 44 c-1.6-2.4 1.4-4 2.4-1.6 c.6-2.8 4-2.8 4.4 0 c1-2.4 4-0.8 2.4 1.6 c2 1 1.2 4.6-1.6 4.2 h-6 c-2.8.4-3.6-3.2-1.6-4.2z" fill="#fff" opacity=".9" />
    <path d="M52 68 Q100 52 148 68 Q152 76 144 80 Q100 65 56 80 Q48 76 52 68 Z" fill={dk(c, 0.14)} />
    <Stitch d="M57 72 Q100 59 143 72" o={0.45} />
    <path d="M60 82 Q100 70 140 82 Q100 76 60 82Z" fill="#1b2333" opacity=".12" />
  </g>) },
  capback: { head: (c) => (<g>
    <path d="M78 32 Q100 12 122 32 Q100 24 78 32Z" fill={dk(c, 0.2)} />
    <path d="M62 66 Q63 23 100 21 Q137 23 138 66 Z" fill={c} /><Sheen d="M62 66 Q63 23 100 21 Q137 23 138 66 Z" />
    <path d="M86 66 Q86 50 100 49 Q114 50 114 66 Z" fill="#1b2333" opacity=".28" />
    <rect x="86" y="58" width="28" height="5" rx="2.5" fill={lt(c, 0.25)} /><circle cx="100" cy="60.5" r="1.8" fill="#fff" opacity=".7" />
    <Stitch d="M64 62 Q100 50 136 62" o={0.4} />
  </g>) },
  beanie: { head: (c) => (<g>
    <path d="M58 66 Q100 2 142 66 Z" fill={c} /><Sheen d="M58 66 Q100 2 142 66 Z" />
    {[74, 87, 100, 113, 126].map((x) => <path key={x} d={`M${x} 60 Q${100 + (x - 100) * 0.8} 46 ${100 + (x - 100) * 0.55} ${40 + Math.abs(x - 100) * 0.35}`} stroke={lt(c, 0.3)} strokeOpacity=".35" strokeWidth="2" fill="none" />)}
    <path d="M53 58 Q100 44 147 58 L147 74 Q100 60 53 74 Z" fill={dk(c, 0.1)} />
    {Array.from({ length: 12 }, (_, i) => 57 + i * 8).map((x) => <path key={x} d={`M${x} ${56 - Math.sin(((x - 53) / 94) * Math.PI) * 8} v14`} stroke={dk(c, 0.25)} strokeOpacity=".35" strokeWidth="2.2" />)}
    <g><circle cx="100" cy="16" r="10.5" fill={lt(c, 0.55)} />{[[94, 12], [104, 11], [99, 20], [107, 18], [92, 19]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.6" fill={lt(c, 0.75)} opacity=".8" />)}</g>
  </g>) },
  bow: { head: (c) => (<g>
    <path d="M126 50 Q110 34 108 44 Q106 54 112 62 Q118 60 126 50Z M126 50 Q142 34 144 44 Q146 54 140 62 Q134 60 126 50Z" fill={c} />
    <Sheen d="M126 50 Q110 34 108 44 Q106 54 112 62 Q118 60 126 50Z M126 50 Q142 34 144 44 Q146 54 140 62 Q134 60 126 50Z" />
    <path d="M112 46 Q116 48 120 50 M140 46 Q136 48 132 50" stroke={dk(c, 0.25)} strokeWidth="1.4" fill="none" opacity=".6" />
    <path d="M124 54 l-4 14 l5 -3 M128 54 l4 14 l-5 -3" fill={dk(c, 0.1)} />
    <rect x="121" y="45" width="10" height="11" rx="4" fill={dk(c, 0.15)} />
  </g>) },
  bucket: { head: (c) => (<g>
    <path d="M64 66 Q66 26 100 26 Q134 26 136 66 Z" fill={c} /><Sheen d="M64 66 Q66 26 100 26 Q134 26 136 66 Z" />
    <path d="M62 57 Q100 49 138 57 L138 66 Q100 58 62 66 Z" fill={dk(c, 0.3)} />
    <path d="M44 72 Q100 54 156 72 Q160 82 150 84 Q100 68 50 84 Q40 82 44 72Z" fill={dk(c, 0.06)} /><Sheen d="M44 72 Q100 54 156 72 Q160 82 150 84 Q100 68 50 84 Q40 82 44 72Z" />
    <Stitch d="M49 76 Q100 60 151 76" o={0.5} /><Stitch d="M48 80 Q100 64 152 80" o={0.35} />
  </g>) },
  headband: { head: (c) => (<g>
    <path d="M48 73 Q100 48 152 73 L150 85 Q100 62 50 85 Z" fill={c} /><Sheen d="M48 73 Q100 48 152 73 L150 85 Q100 62 50 85 Z" />
    <path d="M49 79 Q100 55 151 79" stroke="#fff" strokeWidth="3" opacity=".85" fill="none" />
    <path d="M96 60 l3 -5 l2 4 l3 -5" stroke={dk(c, 0.3)} strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </g>) },
  partyhat: { head: (c) => (<g transform="rotate(8 100 60)">
    <path d="M78 64 L100 2 L122 64 Q100 72 78 64 Z" fill={c} /><Sheen d="M78 64 L100 2 L122 64 Q100 72 78 64 Z" />
    <path d="M86 44 L114 44 M82 56 L118 56 M92 26 L108 26" stroke="#fff" strokeOpacity=".55" strokeWidth="3" />
    {[[92, 36, "#F2C94C"], [108, 50, "#5DBE9A"], [96, 60, "#F28DAA"]].map(([x, y, f], i) => <circle key={i} cx={x as number} cy={y as number} r="2.6" fill={f as string} />)}
    <circle cx="100" cy="2" r="7" fill="#FBEFC0" /><circle cx="98" cy="0" r="2.5" fill="#fff" />
  </g>) },
  flowercrown: { head: () => (<g>
    <path d="M56 64 Q100 38 144 64" stroke="#5FAE7E" strokeWidth="4" fill="none" strokeLinecap="round" />
    {[[60, 60, -40], [140, 60, 40], [83, 48, -20], [117, 48, 20]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx="7" ry="3.4" fill="#7CC49A" transform={`rotate(${r} ${x} ${y})`} />)}
    {[[64, 58, "#F7C6D6"], [76, 50, "#FBEFC0"], [89, 45, "#C7B8F5"], [102, 44, "#F28DAA"], [115, 46, "#FBEFC0"], [127, 51, "#F7C6D6"], [138, 58, "#C7B8F5"]].map(([x, y, f], i) => (
      <g key={i}>{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={(x as number) + Math.cos((a * Math.PI) / 180) * 4.2} cy={(y as number) + Math.sin((a * Math.PI) / 180) * 4.2} r="3.6" fill={f as string} />)}<circle cx={x as number} cy={y as number} r="2.4" fill="#F2C94C" /></g>
    ))}
  </g>) },
  santa: { head: (c) => (<g>
    <path d="M60 66 Q74 12 124 16 Q150 20 162 46 L150 50 Q140 34 128 36 Q140 50 140 64 Z" fill={c} /><Sheen d="M60 66 Q74 12 124 16 Q150 20 162 46 L150 50 Q140 34 128 36 Q140 50 140 64 Z" />
    <path d="M52 62 Q100 46 148 62 L148 76 Q100 60 52 76Z" fill="#FAFAF7" />
    {[58, 70, 82, 94, 106, 118, 130, 142].map((x, i) => <circle key={x} cx={x} cy={66 - Math.sin(((x - 52) / 96) * Math.PI) * 6 + (i % 2) * 2} r="4" fill="#fff" />)}
    <circle cx="158" cy="52" r="9.5" fill="#fff" /><circle cx="155" cy="49" r="3.5" fill="#EAF2FC" />
  </g>) },
  laurel: { head: () => (<g>
    {[-1, 1].map((s) => <g key={s} transform={s === 1 ? "translate(200 0) scale(-1 1)" : undefined}>
      <path d="M100 30 Q66 30 58 64" stroke="#B8892A" strokeWidth="2.2" fill="none" />
      {[[94, 30, -70], [84, 32, -55], [75, 37, -42], [67, 44, -28], [62, 53, -14], [59, 62, 0]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx="6.5" ry="3.2" fill={GOLD} stroke="#B8892A" strokeWidth=".8" transform={`rotate(${r} ${x} ${y})`} />)}
    </g>)}
    <circle cx="100" cy="30" r="3.4" fill="#E98BB5" stroke="#fff" strokeWidth="1" />
  </g>) },
  helmet: { head: (c) => (<g>
    <path d="M56 66 Q100 4 144 66 Q100 54 56 66Z" fill={c} /><Gloss d="M56 66 Q100 4 144 66 Q100 54 56 66Z" />
    <path d="M78 34 l7 22 M100 26 v28 M122 34 l-7 22" stroke="#1b2333" strokeOpacity=".35" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M54 64 Q100 52 146 64" stroke={dk(c, 0.3)} strokeWidth="4.5" fill="none" strokeLinecap="round" />
  </g>) },
  tiara: { head: (c) => (<g>
    <path d="M64 60 Q100 42 136 60" stroke={GOLD} strokeWidth="3.4" fill="none" strokeLinecap="round" />
    <path d="M100 24 l4.4 9 9.8 1.4 -7.1 6.9 1.7 9.8 -8.8 -4.6 -8.8 4.6 1.7 -9.8 -7.1 -6.9 9.8 -1.4z" fill={c} stroke="#B8892A" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M97 33 l3 -5 l2 4" stroke="#fff" strokeWidth="1.6" fill="none" opacity=".8" />
    <circle cx="82" cy="50" r="3" fill="#A9C5ED" stroke="#B8892A" strokeWidth="1" /><circle cx="118" cy="50" r="3" fill="#F28DAA" stroke="#B8892A" strokeWidth="1" />
  </g>) },
  crown: { head: (c) => (<g>
    <path d="M70 58 L74 28 L88 44 L100 20 L112 44 L126 28 L130 58 Z" fill={GOLD} stroke="#B8892A" strokeWidth="2" strokeLinejoin="round" />
    <path d="M70 52 L130 52 L130 58 L70 58Z" fill="#B8892A" opacity=".35" />
    <circle cx="100" cy="46" r="4" fill="#E98BB5" stroke="#fff" strokeWidth="1" /><circle cx="84" cy="50" r="2.8" fill="#A9C5ED" /><circle cx="116" cy="50" r="2.8" fill="#A9C5ED" />
    {[[74, 28], [100, 20], [126, 28]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3" fill="#FFF3C4" />)}
    <path d="M80 40 l4 6" stroke="#fff" strokeWidth="2" opacity=".7" strokeLinecap="round" />
    <path d="M70 58 L74 28 L88 44 L100 20 L112 44 L126 28 L130 58 Z" fill={c === "#E2B64A" ? "none" : c} opacity=".25" />
  </g>) },
  spacehelmet: { head: () => (<g>
    <circle cx="100" cy="86" r="70" fill="url(#wkg-bubble)" stroke="#DCE6F2" strokeWidth="4" />
    <path d="M50 60 Q66 30 104 22" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".75" />
    <path d="M140 132 Q150 118 152 104" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity=".45" />
  </g>) },
  hardhat: { head: (c) => (<g><path d="M62 60 Q100 12 138 60Z" fill={c} /><Gloss d="M62 60 Q100 12 138 60Z" /><rect x="54" y="56" width="92" height="10" rx="5" fill={dk(c, 0.1)} /><rect x="94" y="26" width="12" height="32" rx="4" fill="#fff" opacity=".45" /></g>) },

  /* face */
  sunglasses: { face: (c) => (<g>
    <path d="M64 89 L52 86 M136 89 L148 86" stroke={c} strokeWidth="3" strokeLinecap="round" />
    <rect x="63" y="82" width="32" height="20" rx="9.5" fill={c} /><rect x="105" y="82" width="32" height="20" rx="9.5" fill={c} />
    <rect x="63" y="82" width="32" height="20" rx="9.5" fill="url(#wkg-lens)" /><rect x="105" y="82" width="32" height="20" rx="9.5" fill="url(#wkg-lens)" />
    <path d="M95 88 Q100 85 105 88" stroke={c} strokeWidth="3.5" fill="none" />
    <path d="M69 87 l9 0 M111 87 l9 0" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".7" />
  </g>) },
  roundglasses: { face: (c) => (<g>
    <path d="M66 89 L52 86 M134 89 L148 86" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
    {[79, 121].map((x) => <g key={x}><circle cx={x} cy="92" r="13" fill="#EAF2FC" fillOpacity=".22" stroke={c} strokeWidth="3.2" /><path d={`M${x - 8} 86 Q${x - 5} 82 ${x} 81`} stroke="#fff" strokeWidth="2" fill="none" opacity=".8" strokeLinecap="round" /></g>)}
    <path d="M92 90 Q100 85 108 90" stroke={c} strokeWidth="3" fill="none" />
  </g>) },
  heartglasses: { face: (c) => (<g>
    <path d="M64 89 L52 86 M136 89 L148 86" stroke={dk(c, 0.3)} strokeWidth="2.6" strokeLinecap="round" />
    {[79, 121].map((x) => { const d = `M${x} 104 C${x - 18} 94 ${x - 16} 79 ${x - 7} 80 C${x - 3} 81 ${x} 85 ${x} 87 C${x} 85 ${x + 3} 81 ${x + 7} 80 C${x + 16} 79 ${x + 18} 94 ${x} 104 Z`;
      return <g key={x}><path d={d} fill={c} fillOpacity=".9" stroke={dk(c, 0.25)} strokeWidth="2.2" /><path d={d} fill="url(#wkg-lens)" /><path d={`M${x - 10} 87 q2 -4 6 -4`} stroke="#fff" strokeWidth="2" fill="none" opacity=".85" strokeLinecap="round" /></g>; })}
    <path d="M93 89 Q100 85 107 89" stroke={dk(c, 0.3)} strokeWidth="3" fill="none" />
  </g>) },
  goggles: { face: (c) => (<g>
    <path d="M46 92 Q100 80 154 92" stroke={dk(c, 0.35)} strokeWidth="6" fill="none" />
    {[79, 121].map((x) => <g key={x}><ellipse cx={x} cy="92" rx="13" ry="10.5" fill="#BFEFFF" fillOpacity=".5" stroke={c} strokeWidth="4.2" /><path d={`M${x - 7} 88 q3 -3 8 -3`} stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" /></g>)}
    <rect x="92" y="89" width="16" height="5" rx="2.5" fill={c} />
  </g>) },

  /* neck */
  bandana: { neck: (c) => (<g>
    <path d="M68 128 Q100 142 132 128 L100 164 Z" fill={c} /><Sheen d="M68 128 Q100 142 132 128 L100 164 Z" />
    <path d="M64 124 Q100 140 136 124 L136 132 Q100 148 64 132Z" fill={dk(c, 0.12)} />
    {[[92, 141], [106, 147], [100, 136], [100, 154], [86, 135], [114, 135]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.9" fill="#fff" opacity=".85" />)}
    <Stitch d="M73 132 Q100 145 127 132" o={0.4} />
  </g>) },
  scarf: { neck: (c) => (<g>
    <path d="M62 124 Q100 144 138 124 L140 136 Q100 156 60 136 Z" fill={c} /><Sheen d="M62 124 Q100 144 138 124 L140 136 Q100 156 60 136 Z" />
    {[74, 92, 110, 128].map((x) => <path key={x} d={`M${x} ${128 + Math.abs(100 - x) * -0.12 + 6} v10`} stroke={lt(c, 0.45)} strokeWidth="5" opacity=".7" />)}
    <rect x="114" y="134" width="14" height="34" rx="5" fill={c} /><Sheen d="M114 139 a5 5 0 0 1 5 -5 h4 a5 5 0 0 1 5 5 v24 a5 5 0 0 1 -5 5 h-4 a5 5 0 0 1 -5 -5z" />
    <path d="M116 146 h10 M116 156 h10" stroke={lt(c, 0.45)} strokeWidth="3.5" opacity=".8" />
    <path d="M116 168 v5 M120 168 v6 M124 168 v5" stroke={c} strokeWidth="2" strokeLinecap="round" />
  </g>) },
  bowtie: { neck: (c) => (<g>
    <path d="M98 133 L80 123 Q75 133 80 143 Z M102 133 L120 123 Q125 133 120 143 Z" fill={c} />
    <Sheen d="M98 133 L80 123 Q75 133 80 143 Z M102 133 L120 123 Q125 133 120 143 Z" />
    {[[86, 129], [86, 137], [114, 129], [114, 137]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#fff" opacity=".7" />)}
    <rect x="95" y="127.5" width="10" height="11" rx="3.5" fill={dk(c, 0.18)} />
  </g>) },
  whistle: { neck: (c) => (<g>
    <path d="M76 126 Q100 156 124 126" stroke="#E36D5D" strokeWidth="2.6" fill="none" />
    <rect x="91" y="146" width="20" height="12" rx="6" fill={c === "#E2B64A" ? GOLD : c} stroke="#B8892A" strokeWidth="1.2" />
    <rect x="108" y="148" width="8" height="5" rx="1.5" fill="#B8892A" /><circle cx="98" cy="152" r="2.6" fill="#7a5a1c" opacity=".55" />
    <path d="M94 149 h8" stroke="#fff" strokeWidth="1.6" opacity=".75" strokeLinecap="round" />
  </g>) },
  pawpendant: { neck: () => (<g>
    <path d="M78 126 Q100 152 122 126" stroke="#C6CED9" strokeWidth="1.8" fill="none" />
    <circle cx="100" cy="153" r="10" fill="url(#wkg-crystal) #A9C5ED" stroke="#fff" strokeWidth="1.6" />
    <path d="M96 151 c-1.4-2.2 1.2-3.6 2.2-1.4 c.6-2.6 3.6-2.6 4 0 c1-2.2 3.6-.8 2.2 1.4 c1.8 .9 1 4.2-1.4 3.8 h-5.6 c-2.6.4-3.2-2.9-1.4-3.8z" fill="#fff" opacity=".92" />
    <path className="wk-twinkle" d="M110 143 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z" fill="#fff" />
  </g>) },
  medal: { neck: () => (<g>
    <path d="M86 124 l14 24 l14 -24" fill="none" stroke="#6B8FD6" strokeWidth="6" /><path d="M86 124 l14 24" stroke="#A9C5ED" strokeWidth="2" />
    <circle cx="100" cy="156" r="13" fill={GOLD} stroke="#B8892A" strokeWidth="2.5" />
    <path d="M100 149 l2.2 4.6 5 .7 -3.6 3.5 .9 5 -4.5 -2.4 -4.5 2.4 .9 -5 -3.6 -3.5 5 -.7z" fill="#FFF7DB" />
  </g>) },
  bib: { front: (c) => (<g><rect x="82" y="140" width="36" height="26" rx="4" fill="#fff" stroke="#D9E0E8" strokeWidth="2" /><text x="100" y="159" textAnchor="middle" fontSize="13" fontWeight="800" fill={c} fontFamily="var(--font-display)">42</text></g>) },

  /* tops */
  hoodie: {
    torso: (c) => (<g>
      <path d="M58 132 Q100 104 142 132 Q134 142 100 138 Q66 142 58 132Z" fill={dk(c, 0.14)} />
      <path d={TORSO} fill={c} /><Sheen d={TORSO} />
      <path d="M78 154 Q100 149 122 154 L126 172 Q100 177 74 172 Z" fill={dk(c, 0.1)} /><Stitch d="M79 157 Q100 152 121 157" o={0.5} />
      <path d="M93 134 L91 150 M107 134 L109 150" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><circle cx="91" cy="151" r="2" fill="#fff" /><circle cx="109" cy="151" r="2" fill="#fff" />
      <path d="M58 176 Q100 186 142 176 L141 170 Q100 180 59 170Z" fill={dk(c, 0.16)} />
    </g>),
    frontPaw: (x, c) => sleeve(x, c, 139, 19, dk(c, 0.16)),
  },
  runtee: {
    torso: (c) => (<g>
      <path d={TORSO} fill={c} /><Sheen d={TORSO} />
      <path d="M62 146 Q72 150 80 176 L70 176 Q64 160 58 156Z M138 146 Q128 150 120 176 L130 176 Q136 160 142 156Z" fill={lt(c, 0.45)} opacity=".75" />
      <path d="M88 122 L100 136 L112 122" stroke={dk(c, 0.2)} strokeWidth="3" fill="none" strokeLinejoin="round" />
      <path d="M94 150 l6 -8 l-1 6 l6 -1 l-6 8 l1 -6z" fill="#fff" opacity=".9" />
      <path d="M68 166 Q100 174 132 166" stroke="#fff" strokeOpacity=".7" strokeWidth="2" strokeDasharray="5 4" fill="none" />
    </g>),
    frontPaw: (x, c) => sleeve(x, c, 139, 15, lt(c, 0.45)),
  },
  stripetee: {
    torso: (c) => (<g>
      <path d={TORSO} fill="#FAFAF7" />
      <g clipPath="url(#wkc-torso)">{[130, 141, 152, 163, 174].map((y) => <rect key={y} x="40" y={y} width="120" height="5" fill={c} />)}</g>
      <Sheen d={TORSO} />
      <path d="M84 123 Q100 134 116 123" stroke={c} strokeWidth="3" fill="none" />
    </g>),
    frontPaw: (x, c) => (<g>{sleeve(x, "#FAFAF7", 139, 15)}<rect x={x - 2.5} y="146" width="20" height="4" fill={c} /></g>),
  },
  raincoat: {
    torso: (c) => (<g>
      <path d={TORSO} fill={c} /><Gloss d={TORSO} />
      <path d="M78 122 L92 136 L100 124 L108 136 L122 122 Q100 116 78 122Z" fill={dk(c, 0.12)} />
      <path d="M100 124 V180" stroke={dk(c, 0.22)} strokeWidth="1.6" />
      {[140, 153, 166].map((y) => <g key={y}><rect x="94" y={y - 2} width="12" height="4" rx="2" fill={dk(c, 0.35)} /></g>)}
      <path d="M66 160 h12 M122 160 h12" stroke={dk(c, 0.22)} strokeWidth="2" strokeLinecap="round" />
    </g>),
    frontPaw: (x, c) => (<g><rect x={x - 3} y="139" width="21" height="24" rx="8.5" fill={c} /><Gloss d={`M${x - 3} 147 a8.5 8.5 0 0 1 8.5 -8.5 h4 a8.5 8.5 0 0 1 8.5 8.5 v16 h-21z`} /></g>),
  },
  puffer: {
    torso: (c) => (<g>
      <path d={TORSO} fill={c} /><Sheen d={TORSO} />
      {[136, 150, 164].map((y) => <g key={y}><path d={`M56 ${y} Q100 ${y + 9} 144 ${y}`} stroke={dk(c, 0.2)} strokeWidth="2.4" fill="none" /><path d={`M60 ${y - 6} Q100 ${y + 2} 140 ${y - 6}`} stroke="#fff" strokeOpacity=".25" strokeWidth="3" fill="none" /></g>)}
      <path d="M100 126 V180" stroke={dk(c, 0.3)} strokeWidth="2" /><rect x="98" y="128" width="4" height="7" rx="1" fill="#D9E0E8" />
      <path d="M70 122 Q100 136 130 122 L131 131 Q100 146 69 131Z" fill={lt(c, 0.18)} /><Sheen d="M70 122 Q100 136 130 122 L131 131 Q100 146 69 131Z" />
    </g>),
    frontPaw: (x, c) => (<g>{sleeve(x, c, 138, 25, dk(c, 0.15))}<path d={`M${x - 2} 150 h19`} stroke={dk(c, 0.2)} strokeWidth="2" /></g>),
  },
  sweater: {
    torso: (c) => (<g>
      <path d={TORSO} fill={c} />
      <g clipPath="url(#wkc-torso)">
        <rect x="40" y="145" width="120" height="13" fill="#FAFAF7" />
        <path d="M40 152 l6 -5 l6 5 l6 -5 l6 5 l6 -5 l6 5 l6 -5 l6 5 l6 -5 l6 5 l6 -5 l6 5 l6 -5 l6 5 l6 -5 l6 5 l6 -5 l6 5 l6 -5 l6 5" stroke="#D9534F" strokeWidth="2.4" fill="none" />
        {[[72, 134], [100, 130], [128, 134], [80, 168], [120, 168], [100, 172]].map(([x, y], i) => <path key={i} d={`M${x} ${y - 4} v8 M${x - 4} ${y} h8 M${x - 3} ${y - 3} l6 6 M${x + 3} ${y - 3} l-6 6`} stroke="#fff" strokeWidth="1.4" opacity=".85" />)}
        {Array.from({ length: 16 }, (_, i) => 44 + i * 7).map((x) => <path key={x} d={`M${x} 170 v12`} stroke={dk(c, 0.25)} strokeWidth="2" opacity=".5" />)}
      </g>
      <Sheen d={TORSO} />
      <path d="M80 122 Q100 136 120 122" stroke={dk(c, 0.2)} strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>),
    frontPaw: (x, c) => (<g>{sleeve(x, c, 139, 23, dk(c, 0.2))}<rect x={x - 2.5} y="149" width="20" height="4" fill="#FAFAF7" opacity=".9" /></g>),
  },
  varsity: {
    torso: (c) => (<g>
      <path d={TORSO} fill={c} /><Sheen d={TORSO} />
      <path d="M74 122 Q100 135 126 122 L124 131 Q100 143 76 131Z" fill="#F3EBD8" /><path d="M76 126 Q100 139 124 126" stroke={c} strokeWidth="1.8" fill="none" />
      <path d="M100 133 V180" stroke="#F3EBD8" strokeWidth="1.8" />{[145, 158, 171].map((y) => <circle key={y} cx="100" cy={y} r="1.8" fill="#F3EBD8" />)}
      <circle cx="84" cy="150" r="8" fill="#F3EBD8" /><text x="84" y="154.5" textAnchor="middle" fontSize="11" fontWeight="800" fill={c} fontFamily="var(--font-display)">W</text>
      <path d="M58 176 Q100 186 142 176 L141 170 Q100 180 59 170Z" fill="#F3EBD8" /><path d="M60 173 Q100 183 140 173" stroke={c} strokeWidth="1.6" fill="none" />
    </g>),
    frontPaw: (x, c) => (<g>{sleeve(x, "#F3EBD8", 139, 24)}<rect x={x - 2.5} y="156" width="20" height="2.5" fill={c} /><rect x={x - 2.5} y="159.5" width="20" height="2.5" fill={c} /></g>),
  },
  astronaut: {
    torso: () => (<g>
      <path d={TORSO} fill="#F4F6F8" /><Sheen d={TORSO} />
      <path d="M64 126 Q100 144 136 126" stroke="#B9C3D1" strokeWidth="7" fill="none" strokeLinecap="round" />
      <rect x="86" y="140" width="28" height="19" rx="4" fill="#DCE3EC" stroke="#B9C3D1" strokeWidth="1.4" />
      <rect x="89" y="143" width="10" height="6" rx="1.5" fill="#6B8FD6" /><circle cx="105" cy="146" r="2.2" fill="#E36D5D" /><circle cx="110" cy="146" r="2.2" fill="#F2C94C" /><circle cx="94" cy="154" r="2.2" fill="#5DBE9A" /><rect x="100" y="152" width="10" height="3" rx="1.5" fill="#B9C3D1" />
      <circle cx="74" cy="146" r="5.5" fill="#425A7C" /><path d="M74 142.5 l1 2.3 2.4.3 -1.8 1.6 .5 2.4 -2.1 -1.2 -2.1 1.2 .5 -2.4 -1.8 -1.6 2.4 -.3z" fill="#fff" />
      <rect x="60" y="165" width="80" height="7" rx="3.5" fill="#B9C3D1" /><rect x="95" y="164" width="10" height="9" rx="2" fill="#8D9AAD" />
    </g>),
    frontPaw: (x) => (<g>{sleeve(x, "#F4F6F8", 139, 26)}<rect x={x - 2.5} y="152" width="20" height="3.5" fill="#6B8FD6" /></g>),
  },
  robe: {
    torso: (c) => (<g>
      <path d={TORSO} fill={c} /><Sheen d={TORSO} />
      <path d="M96 136 L92 182 M104 136 L108 182" stroke={GOLD} strokeWidth="2.4" />
      <path d="M56 132 Q100 152 144 132 L146 143 Q100 164 54 143 Z" fill="#FAFAF7" />
      {[[64, 140], [80, 147], [100, 150], [120, 147], [136, 140]].map(([x, y], i) => <path key={i} d={`M${x} ${y - 2.5} l1.6 3.5 -1.6 1.5 -1.6 -1.5z`} fill="#3A3F4A" />)}
      <circle cx="100" cy="151" r="5" fill={GOLD} stroke="#B8892A" strokeWidth="1.2" /><circle cx="100" cy="151" r="2" fill="#E98BB5" />
    </g>),
    frontPaw: (x, c) => (<g>{sleeve(x, c, 139, 24)}<rect x={x - 2.5} y="157" width="20" height="6" rx="3" fill="#FAFAF7" /></g>),
  },

  /* back */
  backpack: {
    front: (c) => (<g>
      <path d="M128 138 Q112 140 108 126" stroke={dk(c, 0.2)} strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <rect x="127" y="130" width="30" height="38" rx="10" fill={c} /><Sheen d="M127 140 a10 10 0 0 1 10 -10 h10 a10 10 0 0 1 10 10 v18 a10 10 0 0 1 -10 10 h-10 a10 10 0 0 1 -10 -10z" />
      <rect x="131" y="148" width="22" height="14" rx="5" fill={lt(c, 0.25)} /><Stitch d="M133 151 h18" o={0.6} />
      <rect x="139" y="144" width="6" height="7" rx="1.5" fill="#F2C94C" />
    </g>),
  },
  bottlepack: {
    front: (c) => (<g>
      <path d="M134 132 Q138 116 116 124" stroke="#DCE6F2" strokeWidth="3" fill="none" strokeLinecap="round" /><circle cx="115" cy="124.5" r="2.4" fill="#425A7C" />
      <rect x="128" y="134" width="26" height="32" rx="9" fill={c} /><Sheen d="M128 143 a9 9 0 0 1 9 -9 h8 a9 9 0 0 1 9 9 v14 a9 9 0 0 1 -9 9 h-8 a9 9 0 0 1 -9 -9z" />
      <rect x="135" y="140" width="12" height="20" rx="5" fill="#EAF7FF" opacity=".85" /><rect x="135" y="150" width="12" height="10" rx="4" fill="#8FD3E8" opacity=".9" />
    </g>),
  },
  cape: {
    behind: (c) => (<g>
      <path d="M64 124 Q28 176 40 191 Q100 198 160 191 Q172 176 136 124 Z" fill={c} />
      <path d="M64 124 Q28 176 40 191 Q100 198 160 191 Q172 176 136 124 Z" fill="url(#wkg-shade)" />
      <path d="M70 130 Q44 170 52 186 M130 130 Q156 170 148 186" stroke={lt(c, 0.3)} strokeWidth="3" fill="none" opacity=".6" />
    </g>),
    neck: () => (<g><circle cx="68" cy="130" r="5" fill={GOLD} stroke="#B8892A" strokeWidth="1.2" /><circle cx="132" cy="130" r="5" fill={GOLD} stroke="#B8892A" strokeWidth="1.2" /><path d="M72 131 Q100 142 128 131" stroke="#B8892A" strokeWidth="1.6" fill="none" /></g>),
  },
  wings: {
    behind: (c) => (<g className="wk-wings">
      {[1, -1].map((s) => (
        <g key={s} transform={s === -1 ? "translate(200 0) scale(-1 1)" : undefined}>
          <path d="M70 130 C38 92 10 104 18 130 C4 144 22 166 50 152 C58 148 66 142 70 138 Z" fill={c} />
          <path d="M70 130 C38 92 10 104 18 130 C4 144 22 166 50 152 C58 148 66 142 70 138 Z" fill="url(#wkg-hl)" />
          <path d="M66 134 Q40 116 24 122 M64 136 Q38 140 22 148" stroke="#fff" strokeWidth="1.6" fill="none" opacity=".7" />
          <path className="wk-twinkle" d="M30 112 l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4z" fill="#fff" />
        </g>
      ))}
    </g>),
  },
  jetpack: {
    behind: (c) => (<g>
      {[38, 142].map((x) => (
        <g key={x}>
          <rect x={x} y="110" width="20" height="50" rx="9" fill={c} /><Sheen d={`M${x} 119 a9 9 0 0 1 9 -9 h2 a9 9 0 0 1 9 9 v32 a9 9 0 0 1 -9 9 h-2 a9 9 0 0 1 -9 -9z`} />
          <rect x={x} y="110" width="20" height="8" rx="4" fill={dk(c, 0.3)} /><path d={`M${x + 4} 160 h12 l-2 6 h-8z`} fill="#6F7C90" />
          <path className="wk-flame" style={{ transformOrigin: `${x + 10}px 166px` }} d={`M${x + 4} 166 Q${x + 10} 190 ${x + 16} 166 Z`} fill="#F7A541" /><path className="wk-flame" style={{ transformOrigin: `${x + 10}px 166px` }} d={`M${x + 7} 166 Q${x + 10} 180 ${x + 13} 166 Z`} fill="#FFE08A" />
        </g>
      ))}
    </g>),
  },

  /* shoes */
  sneakers: {
    frontPaw: (x, c) => lowShoe(x, c, "#FAFAF7", <path d={`M${x + 1} 172 h11 M${x + 2} 175.5 h10`} stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />),
    backPaw: (cx, c) => backShoe(cx, c, "#FAFAF7"),
  },
  racers: {
    frontPaw: (x, c) => lowShoe(x, c, "#242B35", <path d={`M${x - 1} 179 l5 -5 l4 4 l5 -5 l4 4`} stroke="#fff" strokeWidth="2" fill="none" strokeLinejoin="round" />),
    backPaw: (cx, c) => backShoe(cx, c, "#242B35"),
  },
  rainboots: {
    frontPaw: (x, c) => (<g>{boot(x, c, 158, dk(c, 0.45))}<rect x={x - 2} y="158" width="19" height="3.5" rx="1.75" fill={lt(c, 0.3)} /></g>),
    backPaw: (cx, c) => backShoe(cx, c, dk(c, 0.45)),
  },
  snowboots: {
    frontPaw: (x, c) => (<g>{boot(x, c, 162, "#3A3F4A")}{[x + 1, x + 7.5, x + 14].map((cx) => <circle key={cx} cx={cx} cy="163" r="4.6" fill="#FAFAF7" />)}</g>),
    backPaw: (cx, c) => backShoe(cx, c, "#3A3F4A"),
  },
  moonboots: {
    frontPaw: (x, c) => (<g>{boot(x, c, 158, "#8D9AAD", 2.5)}{[166, 172, 178].map((y) => <path key={y} d={`M${x - 5} ${y} h25`} stroke={dk(c, 0.15)} strokeWidth="1.6" />)}</g>),
    backPaw: (cx, c) => backShoe(cx, c, "#8D9AAD"),
  },
};

const resolve = (items: AccessoryProp[]) => items.map((i) => ({ art: ART[artOf(i.key)], c: i.color ?? "#6B8FD6", key: i.key })).filter((x) => x.art);

/** Renders one layer of every worn item. `x` = front-leg x (frontPaw) or back-paw centre (backPaw). */
export function WearLayer({ items, layer, x = 0 }: { items: AccessoryProp[]; layer: Layer; x?: number }) {
  const out = resolve(items).map(({ art, c, key }) => {
    if (layer === "frontPaw") return art.frontPaw ? <g key={key}>{art.frontPaw(x, c)}</g> : null;
    if (layer === "backPaw") return art.backPaw ? <g key={key}>{art.backPaw(x, c)}</g> : null;
    const f = art[layer]; return f ? <g key={key}>{f(c)}</g> : null;
  });
  return out.some(Boolean) ? <>{out}</> : null;
}

/** Legacy single-group renderer used by other pet species (head/face/neck/back items only). */
export function Accessories({ items }: { items: AccessoryProp[] }) {
  if (!items.length) return null;
  return <g><WearLayer items={items} layer="behind" /><WearLayer items={items} layer="neck" /><WearLayer items={items} layer="front" /><WearLayer items={items} layer="face" /><WearLayer items={items} layer="head" /></g>;
}

/** Bounding boxes used to crop item art into wardrobe/shop icons. */
export const ICON_VIEWBOX: Record<string, string> = { HEAD: "34 -6 132 100", FACE: "44 70 112 42", NECK: "52 112 96 66", BODY: "40 104 120 86", BACK: "8 96 184 100", FEET: "70 150 60 42" };
