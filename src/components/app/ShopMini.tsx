/** Small isometric pet-shop vignette used on cards and the website (pure SVG, no 3D cost). */
export function ShopMini({ className = "", size = 140 }: { className?: string; size?: number }) {
  const tile = (x: number, y: number, c: string) => <path key={`${x}-${y}`} d={`M${x} ${y} l24 -12 l24 12 l-24 12z`} fill={c} />;
  const tiles = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) tiles.push(tile(16 + (i - j) * 24 + 48, 56 + (i + j) * 12, (i + j) % 2 ? "#CFE8C4" : "#C3E0B7"));
  return (
    <svg viewBox="0 0 192 150" width={size} height={size * 150 / 192} className={className} aria-hidden>
      <path d="M16 116 l80 40 l80 -40 v8 l-80 40 l-80 -40z" fill="#B7A08A" transform="translate(0 -26)" />
      {tiles}
      {/* shop */}
      <g transform="translate(78 38)">
        <path d="M0 30 l26 13 v28 l-26 -13z" fill="#8FB0E6" /><path d="M26 43 l30 -15 v28 l-30 15z" fill="#A9C5ED" />
        <path d="M-4 30 l30 -18 l34 16 l-30 17z" fill="#6B8FD6" /><path d="M26 12 l0 -6" stroke="#425A7C" strokeWidth="2" />
        <path d="M34 46 l12 -6 v12 l-12 6z" fill="#FFFFFF" opacity=".9" /><path d="M8 45 l10 5 v14 l-10 -5z" fill="#425A7C" opacity=".8" />
        <path d="M-2 31 l28 14 l32 -16" stroke="#F9D9E5" strokeWidth="4" fill="none" strokeDasharray="6 4" />
      </g>
      {/* trees */}
      <g transform="translate(30 62)"><rect x="9" y="18" width="4" height="10" fill="#A57A4E" /><circle cx="11" cy="14" r="11" fill="#6DBB8A" /><circle cx="7" cy="11" r="4" fill="#8FD0A6" /></g>
      <g transform="translate(140 70)"><rect x="7" y="14" width="4" height="9" fill="#A57A4E" /><path d="M9 -4 l10 18 h-20z" fill="#4FA27A" /></g>
      <g transform="translate(120 104)"><ellipse cx="0" cy="0" rx="8" ry="5" fill="#7CC49A" /><circle cx="-3" cy="-3" r="2" fill="#F2A7C0" /><circle cx="3" cy="-2" r="2" fill="#FBEFC0" /></g>
      {/* tiny husky */}
      <g transform="translate(60 92)"><ellipse cx="6" cy="10" rx="7" ry="2" fill="#425A7C" opacity=".15" /><ellipse cx="6" cy="5" rx="6" ry="5" fill="#8592A6" /><path d="M2 2 l1 -5 l3 3z M10 2 l-1 -5 l-3 3z" fill="#8592A6" /><ellipse cx="6" cy="6.5" rx="4" ry="3" fill="#fff" /></g>
    </svg>
  );
}
