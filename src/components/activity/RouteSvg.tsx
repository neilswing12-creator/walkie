/** Dependency-free route preview (equirectangular projection fitted to bbox). Used live and as map fallback. */
export function RouteSvg({ points, height = 180, className = "", live }: { points: [number, number][]; height?: number; className?: string; live?: boolean }) {
  if (points.length < 2) {
    return <div className={`grid place-items-center rounded-3xl bg-[radial-gradient(circle_at_30%_30%,#EAF2FC,#F4F6F8)] text-[13px] font-semibold text-walkie-muted ${className}`} style={{ height }}>{live ? "Your route will draw here" : "No GPS route recorded"}</div>;
  }
  const lats = points.map((p) => p[0]), lngs = points.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const k = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const w = Math.max((maxLng - minLng) * k, 1e-5), h = Math.max(maxLat - minLat, 1e-5);
  const W = 320, H = 200, pad = 18, s = Math.min((W - pad * 2) / w, (H - pad * 2) / h);
  const ox = (W - w * s) / 2, oy = (H - h * s) / 2;
  const xy = (p: [number, number]) => [ox + (p[1] - minLng) * k * s, H - (oy + (p[0] - minLat) * s)];
  const d = points.map((p, i) => `${i ? "L" : "M"}${xy(p).map((n) => n.toFixed(1)).join(" ")}`).join("");
  const [sx, sy] = xy(points[0]); const [ex, ey] = xy(points[points.length - 1]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full rounded-3xl bg-[linear-gradient(135deg,#EAF2FC,#F4F6F8)] ${className}`} style={{ height }} role="img" aria-label="Route preview">
      <defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#D9E0E8" strokeWidth=".6" /></pattern></defs>
      <rect width={W} height={H} fill="url(#g)" opacity=".7" />
      <path d={d} fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#6B8FD6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={sx} cy={sy} r="7" fill="#5DBE9A" stroke="#fff" strokeWidth="3" />
      <circle cx={ex} cy={ey} r="7" fill={live ? "#6B8FD6" : "#242B35"} stroke="#fff" strokeWidth="3">{live && <animate attributeName="r" values="7;9;7" dur="1.4s" repeatCount="indefinite" />}</circle>
    </svg>
  );
}
