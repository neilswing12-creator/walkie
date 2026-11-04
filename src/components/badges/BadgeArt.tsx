/**
 * Procedural collectible badge: rarity frame + scene + Walkie pose/accessory + prop + ribbon label.
 * Pure SVG (crisp at any size, tiny, themeable). `imageUrl` from admin overrides the illustration.
 */
import { useId, type ReactNode } from "react";
import { Walkie, type Mood } from "../mascot/Walkie";
import type { BadgeArt as Art } from "@/lib/achievements/catalog";

const FRAME: Record<string, { a: string; b: string; rim: string; ribbon: string; glow: string }> = {
  COMMON: { a: "#FFFFFF", b: "#D9E0E8", rim: "#B7C1CE", ribbon: "#9AA5B4", glow: "rgba(154,165,180,.0)" },
  UNCOMMON: { a: "#E9F8F0", b: "#9DDBBE", rim: "#5DBE9A", ribbon: "#4FAF8A", glow: "rgba(93,190,154,.35)" },
  RARE: { a: "#EAF2FC", b: "#A9C5ED", rim: "#6B8FD6", ribbon: "#5479C6", glow: "rgba(107,143,214,.45)" },
  EPIC: { a: "#F3EFFE", b: "#C7B8F5", rim: "#8E74DA", ribbon: "#7F66CC", glow: "rgba(160,139,224,.5)" },
  LEGENDARY: { a: "#FFF7DB", b: "#F2C94C", rim: "#C9962A", ribbon: "#B8892A", glow: "rgba(226,182,74,.55)" },
  MYTHICAL: { a: "#E7F0FF", b: "#B9A8F7", rim: "#6B8FD6", ribbon: "#8E74DA", glow: "rgba(150,140,240,.6)" },
};

const SCENES: Record<string, (id: string) => ReactNode> = {
  meadow: () => <><rect width="200" height="200" fill="#E6F4FB" /><path d="M0 130 Q60 110 120 128 T200 122 V200 H0Z" fill="#BFE3B0" /><circle cx="50" cy="140" r="3" fill="#fff" /><circle cx="150" cy="135" r="3" fill="#F9D9E5" /></>,
  path: () => <><rect width="200" height="200" fill="#E9F3FC" /><path d="M0 125 Q100 105 200 125 V200 H0Z" fill="#CFE8C4" /><path d="M85 200 Q95 150 110 122 L118 122 Q108 150 125 200Z" fill="#E6D3B8" /></>,
  town: () => <><rect width="200" height="200" fill="#EAF2FC" />{[[30, 70, "#A9C5ED"], [70, 55, "#F9D9E5"], [130, 62, "#DCD3F7"], [165, 75, "#BFEBD8"]].map(([x, h, c], i) => <rect key={i} x={x as number - 16} y={130 - (h as number)} width="32" height={h as number} rx="4" fill={c as string} />)}<rect y="128" width="200" height="72" fill="#D9E0E8" /></>,
  park: () => <><rect width="200" height="200" fill="#E9F5FC" /><path d="M0 128 H200 V200 H0Z" fill="#CFE8C4" /><circle cx="36" cy="100" r="22" fill="#8FD0A6" /><rect x="34" y="110" width="4" height="22" fill="#A57A4E" /><circle cx="168" cy="104" r="18" fill="#7CC49A" /><rect x="166" y="112" width="4" height="18" fill="#A57A4E" /></>,
  forest: () => <><rect width="200" height="200" fill="#E3F2EC" />{[20, 55, 145, 180].map((x, i) => <path key={i} d={`M${x} ${60 + (i % 2) * 14} l22 64 h-44z`} fill={i % 2 ? "#4FA27A" : "#6DBB8A"} />)}<path d="M0 132 H200 V200 H0Z" fill="#9FD3B0" /></>,
  hills: () => <><rect width="200" height="200" fill="#E6F1FC" /><path d="M0 120 Q50 70 100 118 Q150 72 200 116 V200 H0Z" fill="#BFE3B0" /><path d="M0 145 Q100 115 200 145 V200 H0Z" fill="#A8D69A" /></>,
  mountain: () => <><rect width="200" height="200" fill="#E1ECFA" /><path d="M10 140 L80 50 L120 100 L150 70 L200 140Z" fill="#A9B9D0" /><path d="M80 50 L95 70 L86 72 L78 64 L70 72Z" fill="#fff" /><path d="M0 138 H200 V200 H0Z" fill="#CFE8C4" /></>,
  summit: () => <><rect width="200" height="200" fill="#DDE7FA" /><path d="M20 150 L100 34 L180 150Z" fill="#9FB0CC" /><path d="M100 34 L118 60 L100 56 L84 62Z" fill="#fff" /><path d="M100 34 v-18 l16 6 -16 6" fill="#F28DAA" stroke="#425A7C" strokeWidth="2" /><path d="M0 146 H200 V200 H0Z" fill="#BFE3B0" /></>,
  globe: () => <><rect width="200" height="200" fill="#DCE9FA" /><circle cx="100" cy="150" r="90" fill="#8DB8EA" /><path d="M40 120 q20 -20 40 0 t30 10 q14 -16 40 -4 v40 h-110z" fill="#9FD3B0" /></>,
  aurora: (id) => <><defs><linearGradient id={`au${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2E3B66" /><stop offset="1" stopColor="#4A3F7A" /></linearGradient></defs><rect width="200" height="200" fill={`url(#au${id})`} /><path d="M0 70 Q50 30 100 70 T200 60" stroke="#8FF0C8" strokeWidth="14" fill="none" opacity=".55" /><path d="M0 90 Q60 50 120 90 T200 80" stroke="#C7B8F5" strokeWidth="10" fill="none" opacity=".5" />{[[30, 30], [160, 24], [120, 40], [60, 50]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" fill="#fff" />)}<path d="M0 140 H200 V200 H0Z" fill="#CFDDF0" /></>,
  track: () => <><rect width="200" height="200" fill="#EAF2FC" /><path d="M0 122 H200 V200 H0Z" fill="#E9A58C" />{[136, 152, 168, 184].map((y) => <path key={y} d={`M0 ${y} H200`} stroke="#fff" strokeWidth="2" opacity=".8" />)}</>,
  finish: () => <><rect width="200" height="200" fill="#EAF2FC" /><path d="M0 126 H200 V200 H0Z" fill="#D9E0E8" /><rect x="20" y="52" width="6" height="76" fill="#425A7C" /><rect x="174" y="52" width="6" height="76" fill="#425A7C" /><rect x="26" y="52" width="148" height="18" fill="#fff" />{Array.from({ length: 18 }, (_, i) => <rect key={i} x={26 + (i % 9) * 16.4 + (i >= 9 ? 8.2 : 0)} y={i >= 9 ? 61 : 52} width="8.2" height="9" fill="#242B35" />)}</>,
  road: () => <><rect width="200" height="200" fill="#E6F1FC" /><path d="M0 120 Q100 100 200 120 V200 H0Z" fill="#CFE8C4" /><path d="M70 200 L95 118 L105 118 L130 200Z" fill="#8592A6" /><path d="M100 124 v10 M100 146 v14 M100 172 v20" stroke="#fff" strokeWidth="3" /></>,
  sunrise: () => <><rect width="200" height="200" fill="#FDEFD9" /><circle cx="100" cy="128" r="40" fill="#F7C66B" /><path d="M0 126 Q100 110 200 126 V200 H0Z" fill="#BFE3B0" /></>,
  countryside: () => <><rect width="200" height="200" fill="#E8F3FC" /><path d="M0 118 Q60 92 120 112 T200 108 V200 H0Z" fill="#BFE3B0" /><path d="M0 150 Q100 128 200 150 V200 H0Z" fill="#E6D3B8" /><path d="M150 88 l14 -10 l14 10 v16 h-28z" fill="#F9D9E5" /><path d="M146 90 l18 -14 l18 14" fill="#E3A58C" /></>,
  night: () => <><rect width="200" height="200" fill="#2F3D5C" /><circle cx="150" cy="48" r="16" fill="#FBEFC0" /><circle cx="157" cy="43" r="14" fill="#2F3D5C" />{[[30, 40], [70, 26], [110, 50], [44, 76]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" fill="#fff" />)}<path d="M0 132 H200 V200 H0Z" fill="#46597E" /></>,
  snow: () => <><rect width="200" height="200" fill="#E7EFFA" />{[[30, 30], [80, 50], [150, 26], [170, 70], [50, 80]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#fff" />)}<path d="M0 124 Q100 108 200 124 V200 H0Z" fill="#FFFFFF" /><path d="M150 124 l14 -40 l14 40z" fill="#6DBB8A" /></>,
  hearts: () => <><rect width="200" height="200" fill="#FCEFF4" />{[[34, 50], [160, 40], [150, 96], [44, 104]].map(([x, y], i) => <path key={i} d={`M${x} ${y} c-5 -7 -14 -2 -9 6 l9 8 l9 -8 c5 -8 -4 -13 -9 -6z`} fill="#F7B6C8" />)}<path d="M0 130 H200 V200 H0Z" fill="#F9D9E5" /></>,
  shop: () => <><rect width="200" height="200" fill="#EAF2FC" /><path d="M0 130 H200 V200 H0Z" fill="#CFE8C4" /><rect x="132" y="70" width="52" height="60" rx="4" fill="#A9C5ED" /><path d="M126 74 l32 -22 l32 22z" fill="#6B8FD6" /><rect x="150" y="100" width="16" height="30" fill="#425A7C" /><path d="M132 82 h52" stroke="#F9D9E5" strokeWidth="6" strokeDasharray="7 5" /></>,
  beach: () => <><rect width="200" height="200" fill="#DFF1FB" /><circle cx="160" cy="44" r="14" fill="#F7C66B" /><path d="M0 110 H200 V140 H0Z" fill="#8DB8EA" /><path d="M0 132 Q100 120 200 132 V200 H0Z" fill="#F4E4BE" /></>,
};

function Prop({ kind, x = 152, y = 52 }: { kind?: string; x?: number; y?: number }) {
  if (!kind) return null;
  const inner: Record<string, ReactNode> = {
    steps: <g fill="#425A7C"><ellipse cx="-5" cy="2" rx="4" ry="6" /><ellipse cx="5" cy="-3" rx="4" ry="6" /></g>,
    flag: <g><path d="M-6 9 V-9" stroke="#425A7C" strokeWidth="2.5" /><path d="M-6 -9 h12 l-3 4 l3 4 h-12z" fill="#F28DAA" /></g>,
    finish: <g>{[0, 1, 2, 3].map((i) => <rect key={i} x={-8 + (i % 2) * 8} y={-8 + Math.floor(i / 2) * 8} width="8" height="8" fill={i % 3 === 0 ? "#242B35" : "#fff"} />)}</g>,
    medal: <g><path d="M-5 -10 l5 8 l5 -8" stroke="#6B8FD6" strokeWidth="3" fill="none" /><circle cy="3" r="7" fill="#F2C94C" stroke="#C9962A" strokeWidth="1.5" /></g>,
    clock: <g><circle r="9" fill="#fff" stroke="#425A7C" strokeWidth="2.5" /><path d="M0 -5 V0 l4 3" stroke="#425A7C" strokeWidth="2" fill="none" strokeLinecap="round" /></g>,
    flame: <path d="M0 10 c6 0 9 -4 9 -9 c0 -6 -5 -9 -6 -14 c-4 2 -5 6 -4 9 c-2 -1 -3 -3 -3 -5 c-4 3 -5 7 -5 10 c0 5 3 9 9 9z" fill="#F7A84A" />,
    calendar: <g><rect x="-9" y="-8" width="18" height="17" rx="3" fill="#fff" stroke="#425A7C" strokeWidth="2" /><rect x="-9" y="-8" width="18" height="5" rx="2" fill="#F28DAA" /></g>,
    sun: <g><circle r="6" fill="#F7C66B" />{[0, 45, 90, 135, 180, 225, 270, 315].map((r) => <path key={r} d="M0 -9 v-3" stroke="#F7C66B" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${r})`} />)}</g>,
    moon: <g><circle r="8" fill="#FBEFC0" /><circle cx="4" cy="-3" r="7" fill="#fff" /></g>,
    compass: <g><circle r="9" fill="#fff" stroke="#425A7C" strokeWidth="2" /><path d="M0 -7 l3 7 l-3 7 l-3 -7z" fill="#F28DAA" /></g>,
    star: <path d="M0 -10 l3 6.5 7 1 -5 5 1.2 7 -6.2 -3.3 -6.2 3.3 1.2 -7 -5 -5 7 -1z" fill="#F2C94C" />,
    trophy: <g fill="#F2C94C"><path d="M-7 -9 h14 v5 a7 7 0 0 1 -14 0z" /><rect x="-2" y="2" width="4" height="5" /><rect x="-6" y="7" width="12" height="3" rx="1.5" /></g>,
    bolt: <path d="M2 -10 L-6 2 H0 L-2 10 L6 -2 H0z" fill="#F2C94C" />,
    mountain: <path d="M-10 8 L-2 -6 L2 0 L5 -4 L10 8z" fill="#8592A6" />,
    paw: <g fill="#6B8FD6"><ellipse cy="3" rx="5" ry="4" /><circle cx="-6" cy="-3" r="2.3" /><circle cx="-2" cy="-7" r="2.3" /><circle cx="2" cy="-7" r="2.3" /><circle cx="6" cy="-3" r="2.3" /></g>,
    album: <g><rect x="-8" y="-9" width="16" height="18" rx="2" fill="#A08BE0" /><path d="M-3 -2 l3 -3 l3 3 l-3 3z" fill="#fff" /></g>,
    sparkle: <path d="M0 -10 l2.5 7.5 7.5 2.5 -7.5 2.5 -2.5 7.5 -2.5 -7.5 -7.5 -2.5 7.5 -2.5z" fill="#C7B8F5" />,
    crown: <path d="M-9 6 L-8 -6 L-3 -1 L0 -8 L3 -1 L8 -6 L9 6z" fill="#F2C94C" />,
    house: <g><path d="M-9 0 L0 -8 L9 0 V9 H-9z" fill="#A9C5ED" /><path d="M-10 0 L0 -9 L10 0" stroke="#6B8FD6" strokeWidth="3" fill="none" /></g>,
    plant: <g><path d="M-5 3 h10 l-2 7 h-6z" fill="#D7A07E" /><circle cy="-3" r="6" fill="#7CC49A" /></g>,
    share: <g fill="#6B8FD6"><circle cx="6" cy="-6" r="3" /><circle cx="-6" cy="0" r="3" /><circle cx="6" cy="6" r="3" /><path d="M-6 0 L6 -6 M-6 0 L6 6" stroke="#6B8FD6" strokeWidth="2" /></g>,
    gift: <g><rect x="-8" y="-4" width="16" height="13" rx="2" fill="#F28DAA" /><rect x="-9" y="-8" width="18" height="5" rx="2" fill="#F9D9E5" /><rect x="-1.5" y="-8" width="3" height="17" fill="#fff" /></g>,
    heart: <path d="M0 8 c-10 -7 -9 -16 -3 -16 c2 0 3 1 3 3 c0 -2 1 -3 3 -3 c6 0 7 9 -3 16z" fill="#F28DAA" />,
    egg: <ellipse rx="7" ry="9" fill="#BFEBD8" stroke="#A08BE0" strokeWidth="2" strokeDasharray="3 2" />,
    pumpkin: <g><ellipse rx="10" ry="8" fill="#F29D52" /><path d="M0 -8 v-4" stroke="#5DBE9A" strokeWidth="3" /><path d="M-4 -1 l2 -2 l2 2 M3 -1 l1 -2 l2 2 M-4 3 h8" stroke="#7A3E14" strokeWidth="1.5" fill="none" /></g>,
    cake: <g><rect x="-9" y="-2" width="18" height="10" rx="2" fill="#F9D9E5" /><path d="M-9 -2 h18" stroke="#fff" strokeWidth="3" /><path d="M0 -2 v-6" stroke="#6B8FD6" strokeWidth="2" /><circle cy="-9" r="2" fill="#F7C66B" /></g>,
  };
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="17" fill="#fff" stroke="#EAF2FC" strokeWidth="3" />
      {inner[kind] ?? inner.star}
    </g>
  );
}

function scallop(n: number, r1: number, r2: number) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) { const a = (Math.PI * i) / n - Math.PI / 2; const r = i % 2 ? r2 : r1; pts.push(`${(100 + r * Math.cos(a)).toFixed(2)},${(100 + r * Math.sin(a)).toFixed(2)}`); }
  return pts.join(" ");
}

export function BadgeArt({ rarity, art, imageUrl, size = 120, locked = false, hidden = false, still = false, title }: { rarity: string; art: Art | null | undefined; imageUrl?: string | null; size?: number; locked?: boolean; hidden?: boolean; still?: boolean; title?: string }) {
  const id = useId().replace(/:/g, "");
  const f = FRAME[rarity] ?? FRAME.COMMON;
  const a = art ?? { pose: "idle", scene: "meadow" };
  const gid = `g${id}`, cid = `c${id}`;
  const frame = (() => {
    switch (rarity) {
      case "UNCOMMON": return <polygon points={scallop(14, 92, 84)} fill={`url(#${gid})`} stroke={f.rim} strokeWidth="4" strokeLinejoin="round" />;
      case "RARE": return <path d="M100 6 L180 52 V148 L100 194 L20 148 V52Z" fill={`url(#${gid})`} stroke={f.rim} strokeWidth="5" strokeLinejoin="round" />;
      case "EPIC": return <polygon points={scallop(8, 96, 80)} fill={`url(#${gid})`} stroke={f.rim} strokeWidth="5" strokeLinejoin="round" />;
      case "LEGENDARY": return <g><polygon points={scallop(16, 98, 84)} fill="#F7D96E" opacity=".9" /><circle cx="100" cy="100" r="86" fill={`url(#${gid})`} stroke={f.rim} strokeWidth="5" /></g>;
      case "MYTHICAL": return <g><path d="M100 2 L196 100 L100 198 L4 100Z" fill={`url(#${gid})`} stroke="#fff" strokeWidth="4" strokeLinejoin="round" /><path d="M100 2 L196 100 L100 198 L4 100Z" fill="none" stroke={f.rim} strokeWidth="2" opacity=".6" /></g>;
      default: return <circle cx="100" cy="100" r="88" fill={`url(#${gid})`} stroke={f.rim} strokeWidth="4" />;
    }
  })();
  return (
    <svg viewBox="0 0 200 228" width={size} height={size * 1.14} role="img" aria-label={title ?? "Badge"} className={`select-none ${still ? "badge-still" : ""} ${rarity === "MYTHICAL" && !locked ? "badge-mythical" : ""}`} style={locked ? { filter: "grayscale(1)", opacity: 0.55 } : rarity !== "COMMON" ? { filter: `drop-shadow(0 6px 14px ${f.glow})` } : undefined}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          {rarity === "MYTHICAL" ? <><stop offset="0" stopColor="#A9C5ED" /><stop offset=".35" stopColor="#C7B8F5" /><stop offset=".65" stopColor="#F9C6E0" /><stop offset="1" stopColor="#8FD9F0" /></> : <><stop offset="0" stopColor={f.a} /><stop offset="1" stopColor={f.b} /></>}
        </linearGradient>
        <clipPath id={cid}><circle cx="100" cy="100" r="66" /></clipPath>
      </defs>
      {/* ribbon tails */}
      <path d="M70 160 L56 222 L74 212 L84 226 L94 170Z" fill={f.ribbon} /><path d="M130 160 L144 222 L126 212 L116 226 L106 170Z" fill={f.ribbon} opacity=".9" />
      {frame}
      {rarity === "LEGENDARY" && !hidden && <path d="M78 22 L82 2 L92 14 L100 -2 L108 14 L118 2 L122 22Z" fill="#F2C94C" stroke="#C9962A" strokeWidth="2" strokeLinejoin="round" transform="translate(0 4)" />}
      <circle cx="100" cy="100" r="70" fill="#fff" />
      {hidden ? (
        <g><circle cx="100" cy="100" r="66" fill="#EEF1F5" /><text x="100" y="122" textAnchor="middle" fontSize="64" fontWeight="700" fill="#B7C1CE" fontFamily="var(--font-display)">?</text></g>
      ) : imageUrl ? (
        <image href={imageUrl} x="34" y="34" width="132" height="132" clipPath={`url(#${cid})`} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <g clipPath={`url(#${cid})`}>
          <g transform="translate(34 34) scale(.66)">{(SCENES[a.scene] ?? SCENES.meadow)(id)}</g>
          <g transform="translate(44 58)"><Walkie mood={a.pose as Mood} size={112} accessories={a.acc ? [{ key: a.acc, color: a.acc === "acc_crown" || a.acc === "acc_medal" ? "#E2B64A" : a.acc === "acc_scarf" ? "#E98BB5" : a.acc === "acc_sunglasses" ? "#242B35" : a.acc === "acc_hardhat" ? "#F7C66B" : a.acc === "acc_bib" ? "#6B8FD6" : "#6B8FD6" }] : []} title="" /></g>
        </g>
      )}
      {/* enamel highlight */}
      <path d="M44 74 A64 64 0 0 1 132 40" stroke="#fff" strokeWidth="7" fill="none" opacity=".55" strokeLinecap="round" />
      <circle cx="100" cy="100" r="70" fill="none" stroke={f.rim} strokeWidth="3" opacity=".7" />
      {!hidden && <Prop kind={a.prop} />}
      {!hidden && a.label && (
        <g transform="translate(100 172)">
          <path d="M-46 -12 H46 L40 0 L46 12 H-46 L-40 0Z" fill={f.ribbon} />
          <text y="5.5" textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff" fontFamily="var(--font-display)" letterSpacing=".5">{a.label}</text>
        </g>
      )}
      {rarity === "MYTHICAL" && !locked && [[22, 60], [178, 70], [100, 214]].map(([x, y], i) => <path key={i} className="badge-twinkle" style={{ animationDelay: `${i * 0.5}s`, transformOrigin: `${x}px ${y}px` }} d={`M${x} ${y - 7} l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z`} fill="#fff" />)}
    </svg>
  );
}
