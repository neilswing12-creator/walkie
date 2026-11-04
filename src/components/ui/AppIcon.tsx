/**
 * Walkie premium icon set — one family: a soft gradient tile (per-icon accent from the Walkie palette), top gloss,
 * bottom shade, a drop shadow and a white glyph with its own soft shadow. Readable down to 20 px; `bare` drops the tile.
 * Gradients live in WalkieDefs (ids `aic-<name>`), so each icon costs a few paths.
 */
import type { ReactNode } from "react";

export const ICON_PALETTE = {
  walk: ["#86A8EA", "#4E72C6"], run: ["#FF9F80", "#E1604B"], bike: ["#63D3C4", "#2C9A8F"], steps: ["#95A2F2", "#5A66D0"],
  calories: ["#FFB861", "#EE7A2B"], distance: ["#84D7A0", "#3E9F69"], history: ["#97AAC7", "#58709A"], goal: ["#FF93B4", "#DF5587"],
  reward: ["#FFD772", "#E3A02B"], pets: ["#BCA8F3", "#8265D9"], customize: ["#F8ACD2", "#D7649E"], clothing: ["#91CBF6", "#4B8ED7"],
  accessory: ["#93E2CA", "#3BAD90"], shop: ["#FFC6A0", "#EC8858"], furniture: ["#E2B88E", "#AE784C"], achievement: ["#FFCB70", "#E1982C"],
  mission: ["#A0B4FF", "#6374E7"], vip: ["#FFE39A", "#C8942A"], settings: ["#B8C3D1", "#7A889E"], bell: ["#FFDB73", "#EDAC2B"],
  share: ["#84D9F1", "#39A4CE"], streak: ["#FFA862", "#EF5739"], leaderboard: ["#A593F1", "#6853D5"], friends: ["#84CCEA", "#4890C8"],
  coins: ["#FFE08A", "#E0A325"], wardrobe: ["#9DB8F2", "#5A78CF"], invite: ["#9FE3B9", "#43AE73"], podium: ["#FFD772", "#E3A02B"],
} as const;
export type AppIconName = keyof typeof ICON_PALETTE;

const R = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
const gear = (() => { const pts: string[] = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 9 : 12.2; pts.push(`${(24 + Math.cos(a) * r).toFixed(1)} ${(24 + Math.sin(a) * r).toFixed(1)}`); } return `M${pts.join(" L")} Z`; })();

/** Glyphs on a 48×48 grid. `c` = glyph colour, `a` = accent (tile deep colour) for inner details. */
const G: Record<AppIconName, (c: string, a: string) => ReactNode> = {
  walk: (c, a) => <><path d="M11 29.5c0-3.6 2.9-6.5 6.5-6.5h3.6l3.6-5.4c1.1-1.6 3.4-1.6 4.4.1l2.6 4.4c1 1.7 2.7 2.8 4.7 3 2 .2 3.6 2 3.6 4v2.4H11z" fill={c} /><rect x="10" y="31.5" width="30" height="5" rx="2.5" fill={c} opacity=".75" /><path d="M23 26.5h4M24.5 23.5h4" stroke={a} strokeWidth="1.8" {...R} /></>,
  run: (c) => <><circle cx="30" cy="11.5" r="4" fill={c} /><path d="M27 18.5l-5.5 8 6.5 4.5-3 8.5M21.5 26.5l-7.5 5M23 20.5l-7 1.5M27.5 19.5l6 5 4.5-1.5" stroke={c} strokeWidth="4.4" {...R} /></>,
  bike: (c) => <><circle cx="14.5" cy="30.5" r="7" stroke={c} strokeWidth="3.6" fill="none" /><circle cx="33.5" cy="30.5" r="7" stroke={c} strokeWidth="3.6" fill="none" /><path d="M14.5 30.5L21 19.5h9.5l3 11M21 19.5l5 11 4.5-11M18 15.5h6" stroke={c} strokeWidth="3.2" {...R} /></>,
  steps: (c) => <><path d="M15.5 13c3.3 0 5 3.5 5 8s-1.6 8-4.6 8-5.4-2.6-5.4-7.6c0-5 1.8-8.4 5-8.4z" fill={c} /><rect x="11.5" y="30.5" width="8.5" height="5.5" rx="2.75" fill={c} /><path d="M32.5 17.5c3.3 0 5 3.5 5 8s-1.6 8-4.6 8-5.4-2.6-5.4-7.6c0-5 1.8-8.4 5-8.4z" fill={c} /><rect x="28.5" y="35" width="8.5" height="5.5" rx="2.75" fill={c} /></>,
  calories: (c, a) => <><path d="M27.5 7.5L14 27h9.5L20 40.5 34 20.5h-9.5z" fill={c} /><path d="M25 12.5l-6.5 10" stroke={a} strokeWidth="1.6" opacity=".35" {...R} /></>,
  distance: (c, a) => <><path d="M9.5 37.5q7-10 15-4.5t13-3" stroke={c} strokeWidth="3" strokeDasharray="1 5" {...R} /><path d="M31 8.5a7.5 7.5 0 0 1 7.5 7.5c0 5.4-7.5 12.5-7.5 12.5s-7.5-7.1-7.5-12.5A7.5 7.5 0 0 1 31 8.5z" fill={c} /><circle cx="31" cy="16" r="3" fill={a} /></>,
  history: (c, a) => <><circle cx="25" cy="25" r="12.5" fill={c} /><path d="M25 17.5V25l5 3" stroke={a} strokeWidth="3" {...R} /><path d="M9.5 19.5l3 5.5 5-3.5" stroke={c} strokeWidth="3" {...R} /></>,
  goal: (c, a) => <><circle cx="23" cy="25" r="13" fill={c} /><circle cx="23" cy="25" r="8.5" fill={a} /><circle cx="23" cy="25" r="4.5" fill={c} /><path d="M23 25L37 11M33 10.5h4.5V15" stroke={c} strokeWidth="3" {...R} /></>,
  reward: (c, a) => <><rect x="10" y="20" width="28" height="18" rx="3.5" fill={c} /><rect x="8.5" y="14.5" width="31" height="8" rx="3" fill={c} /><rect x="21.5" y="14.5" width="5" height="23.5" fill={a} /><path d="M24 14.5c-2-5-8.5-6-8.5-2.2 0 2.8 4.5 2.2 8.5 2.2zm0 0c2-5 8.5-6 8.5-2.2 0 2.8-4.5 2.2-8.5 2.2z" fill={c} /></>,
  pets: (c) => <><ellipse cx="24" cy="31" rx="9" ry="7.5" fill={c} /><ellipse cx="13.5" cy="21.5" rx="3.6" ry="4.6" fill={c} /><ellipse cx="20" cy="14.5" rx="3.6" ry="4.6" fill={c} /><ellipse cx="28" cy="14.5" rx="3.6" ry="4.6" fill={c} /><ellipse cx="34.5" cy="21.5" rx="3.6" ry="4.6" fill={c} /></>,
  customize: (c, a) => <><path d="M12 36.5l17-17 3 3-17 17c-.8.8-2.2.8-3 0s-.8-2.2 0-3z" fill={c} /><path d="M29 19.5l3-3 3 3-3 3z" fill={c} opacity=".8" /><path d="M34 8l1.4 3.2 3.2 1.4-3.2 1.4L34 17.2l-1.4-3.2-3.2-1.4 3.2-1.4zM17 10l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1zM38 26l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill={c} /><path d="M15 33.5l3 3" stroke={a} strokeWidth="1.6" {...R} /></>,
  clothing: (c, a) => <><path d="M18 9.5l-9 5 3.5 7.5 4-2V39h15V20l4 2 3.5-7.5-9-5c-.8 2.8-3.3 4.6-6 4.6s-5.2-1.8-6-4.6z" fill={c} /><path d="M20 27h8" stroke={a} strokeWidth="2" opacity=".5" {...R} /></>,
  accessory: (c, a) => <><path d="M24 24L10.5 16c-1.6 5-1.6 11 0 16zM24 24l13.5-8c1.6 5 1.6 11 0 16z" fill={c} /><rect x="20" y="19.5" width="8" height="9" rx="3" fill={c} /><rect x="21.5" y="21" width="5" height="6" rx="2" fill={a} opacity=".35" /></>,
  shop: (c, a) => <><rect x="11" y="22" width="26" height="16" rx="2.5" fill={c} /><path d="M9 21.5l3-10h24l3 10c0 2.4-2 4-4.4 4s-4.4-1.6-4.4-4c0 2.4-2 4-4.6 4s-4.6-1.6-4.6-4c0 2.4-2 4-4.4 4S9 23.9 9 21.5z" fill={c} /><path d="M18 11.5l-1.5 10M24 11.5v10M30 11.5l1.5 10" stroke={a} strokeWidth="1.8" opacity=".4" /><rect x="20" y="29" width="8" height="9" rx="1.5" fill={a} /></>,
  furniture: (c, a) => <><rect x="13" y="13" width="22" height="15" rx="5" fill={c} /><rect x="8.5" y="21" width="8" height="13" rx="3.5" fill={c} /><rect x="31.5" y="21" width="8" height="13" rx="3.5" fill={c} /><rect x="14" y="26" width="20" height="8" rx="2.5" fill={c} /><path d="M12 34v4M36 34v4" stroke={c} strokeWidth="3" {...R} /><path d="M16.5 29.5h15" stroke={a} strokeWidth="1.6" opacity=".35" {...R} /></>,
  achievement: (c, a) => <><path d="M16 8.5h6l3 9-6 2zM32 8.5h-6l-3 9 6 2z" fill={c} opacity=".8" /><circle cx="24" cy="28" r="11" fill={c} /><path d="M24 21.5l2 4.2 4.6.6-3.4 3.2.9 4.6-4.1-2.3-4.1 2.3.9-4.6-3.4-3.2 4.6-.6z" fill={a} /></>,
  mission: (c, a) => <><rect x="12" y="11" width="24" height="29" rx="4" fill={c} /><rect x="18" y="8" width="12" height="6" rx="2.5" fill={c} /><rect x="18" y="8" width="12" height="6" rx="2.5" fill={a} opacity=".35" /><path d="M17.5 23.5l3 3 5.5-6M17.5 32.5h13" stroke={a} strokeWidth="2.6" {...R} /></>,
  vip: (c, a) => <><path d="M9.5 34L8 15.5l9 7.5 7-12 7 12 9-7.5L38.5 34z" fill={c} /><rect x="9.5" y="34" width="29" height="5" rx="2" fill={c} /><circle cx="24" cy="27" r="3" fill={a} /><circle cx="16" cy="29" r="2" fill={a} opacity=".7" /><circle cx="32" cy="29" r="2" fill={a} opacity=".7" /></>,
  settings: (c, a) => <><path d={gear} fill={c} stroke={c} strokeWidth="3" strokeLinejoin="round" /><circle cx="24" cy="24" r="4.6" fill={a} /></>,
  bell: (c, a) => <><path d="M24 9c-6.4 0-10 4.8-10 11v6.5l-3.5 5h27l-3.5-5V20c0-6.2-3.6-11-10-11z" fill={c} /><path d="M20 35.5a4 4 0 0 0 8 0z" fill={c} /><path d="M18.5 17.5c.8-2.6 2.6-4 5.5-4" stroke={a} strokeWidth="2" opacity=".4" {...R} /></>,
  share: (c) => <><path d="M24 8.5v19M16.5 15.5L24 8.5l7.5 7" stroke={c} strokeWidth="4" {...R} /><path d="M13.5 23H12a2.5 2.5 0 0 0-2.5 2.5V36a2.5 2.5 0 0 0 2.5 2.5h24a2.5 2.5 0 0 0 2.5-2.5V25.5A2.5 2.5 0 0 0 36 23h-1.5" stroke={c} strokeWidth="3.6" {...R} /></>,
  streak: (c, a) => <><path d="M24 7.5c2.2 6.4 10 9.4 10 18.4a10 10 0 0 1-20 0c0-5.4 3.2-7.6 4.4-11 1 3 3.2 4.2 4.2 4.2-1-4.4 0-8.6 1.4-11.6z" fill={c} /><path d="M24 23.5c1.2 3 5 4.4 5 8.6a5 5 0 0 1-10 0c0-2.6 1.6-3.6 2.2-5.2.6 1.4 1.6 2 2.2 2-.4-2 .2-4 .6-5.4z" fill={a} /></>,
  leaderboard: (c, a) => <><rect x="18" y="14" width="12" height="25" rx="2.5" fill={c} /><rect x="7" y="22" width="11" height="17" rx="2.5" fill={c} opacity=".85" /><rect x="30" y="26" width="11" height="13" rx="2.5" fill={c} opacity=".7" /><path d="M24 17.5v6" stroke={a} strokeWidth="2.6" {...R} /><path d="M24 6.5l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5z" fill={c} /></>,
  podium: (c, a) => <><rect x="18" y="16" width="12" height="23" rx="2.5" fill={c} /><rect x="7" y="23" width="11" height="16" rx="2.5" fill={c} opacity=".85" /><rect x="30" y="27" width="11" height="12" rx="2.5" fill={c} opacity=".7" /><text x="24" y="31" textAnchor="middle" fontSize="10" fontWeight="800" fill={a} fontFamily="var(--font-display)">1</text></>,
  friends: (c) => <><circle cx="18" cy="17" r="6" fill={c} /><path d="M6.5 37c0-6.6 5.2-11 11.5-11s11.5 4.4 11.5 11z" fill={c} /><circle cx="32" cy="18.5" r="5" fill={c} opacity=".8" /><path d="M31.5 37c0-4.4-1.6-7.6-4.2-9.6 1.4-.8 3-1.2 4.7-1.2 5.4 0 9.5 3.9 9.5 10.8z" fill={c} opacity=".8" /></>,
  coins: (c, a) => <><circle cx="24" cy="24" r="14" fill={c} /><circle cx="24" cy="24" r="10" fill="none" stroke={a} strokeWidth="2" opacity=".45" /><path d="M24 17.5v13M20.5 20.5h5.2a2.5 2.5 0 0 1 0 5h-3.4a2.5 2.5 0 0 0 0 5h5.2" stroke={a} strokeWidth="2.4" {...R} /></>,
  wardrobe: (c, a) => <><path d="M24 12.5a3.2 3.2 0 1 1 3.2 3.2c-1.8 0-3.2 1.4-3.2 3.2v.8" stroke={c} strokeWidth="2.8" {...R} /><path d="M24 19.5L8.5 31c-1.6 1.2-.8 3.6 1.2 3.6h28.6c2 0 2.8-2.4 1.2-3.6z" fill={c} /><path d="M14 31.5h20" stroke={a} strokeWidth="1.8" opacity=".4" {...R} /></>,
  invite: (c, a) => <><rect x="8.5" y="14" width="31" height="22" rx="4" fill={c} /><path d="M10 16.5l14 10 14-10" stroke={a} strokeWidth="2.4" {...R} /><circle cx="36" cy="13" r="6.5" fill={c} /><path d="M36 10v6M33 13h6" stroke={a} strokeWidth="2.4" {...R} /></>,
};

export function AppIcon({ name, size = 40, bare = false, className = "", title }: { name: AppIconName; size?: number; bare?: boolean; className?: string; title?: string }) {
  const [from, to] = ICON_PALETTE[name] ?? ICON_PALETTE.walk;
  const glyph = G[name] ?? G.walk;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={`shrink-0 ${className}`} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {bare ? (
        <><g transform="translate(0 1.4)" opacity=".2">{glyph("#0f1726", "#0f1726")}</g>{glyph(`url(#aic-${name}) ${to}`, "#fff")}</>
      ) : (
        <>
          <rect x="2.5" y="4" width="43" height="42" rx="14" fill={to} opacity=".28" />
          <rect x="2.5" y="1.5" width="43" height="42" rx="14" fill={`url(#aic-${name}) ${from}`} />
          <rect x="2.5" y="1.5" width="43" height="22" rx="14" fill="url(#aig-top)" />
          <rect x="2.5" y="1.5" width="43" height="42" rx="14" fill="url(#aig-bot)" />
          <rect x="3.25" y="2.25" width="41.5" height="40.5" rx="13.25" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1" />
          <g transform="translate(0 1.6)" opacity=".22">{glyph("#0f1726", "#0f1726")}</g>
          {glyph("#fff", to)}
        </>
      )}
    </svg>
  );
}

/** Gradient defs for every icon — rendered inside WalkieDefs. */
export function AppIconDefs() {
  return <>{(Object.keys(ICON_PALETTE) as AppIconName[]).map((k) => <linearGradient key={k} id={`aic-${k}`} x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stopColor={ICON_PALETTE[k][0]} /><stop offset="1" stopColor={ICON_PALETTE[k][1]} /></linearGradient>)}</>;
}
