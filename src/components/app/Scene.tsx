"use client";
/**
 * Illustrated backdrop — soft park scene with time-of-day lighting (dawn/day/golden hour/night), drifting clouds,
 * swaying grass and twinkling stars/fireflies at night. Pure SVG + CSS; static under reduced motion.
 */
import { useEffect, useState } from "react";
type Tod = "dawn" | "day" | "dusk" | "night";
const SKY: Record<Tod, [string, string, string]> = { dawn: ["#FFD9C7", "#F6E6F1", "#EAF2FC"], day: ["#BFD9F7", "#DDEBFB", "#F1F7FE"], dusk: ["#F7B98F", "#F3D3C0", "#E6E3F4"], night: ["#2E3B5E", "#46557D", "#6A79A0"] };
const HILL: Record<Tod, [string, string]> = { dawn: ["#BFE0C8", "#A3D3B4"], day: ["#BEE5C9", "#9BD5AE"], dusk: ["#C7D4B2", "#A9C09A"], night: ["#4D6A6E", "#3E5A60"] };
export function todFor(h: number): Tod { return h >= 5 && h < 8 ? "dawn" : h >= 8 && h < 17 ? "day" : h >= 17 && h < 20 ? "dusk" : "night"; }

/** Local time of day (client clock), re-evaluated every 10 minutes. */
export function useTod(forced?: Tod) {
  const [tod, setTod] = useState<Tod>(forced ?? "day");
  useEffect(() => { if (forced) return; const f = () => setTod(todFor(new Date().getHours())); f(); const t = setInterval(f, 600000); return () => clearInterval(t); }, [forced]);
  return tod;
}

export function Scene({ className = "", tod: forced }: { className?: string; tod?: Tod }) {
  const tod = useTod(forced);
  const [a, b, c] = SKY[tod], [h1, h2] = HILL[tod];
  const night = tod === "night";
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" className={`absolute inset-0 h-full w-full ${className}`} aria-hidden data-tod={tod}>
      <defs>
        <linearGradient id={`sky-${tod}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset=".55" stopColor={b} /><stop offset="1" stopColor={c} /></linearGradient>
        <radialGradient id={`sun-${tod}`}><stop offset="0" stopColor={night ? "#F4F1DE" : "#FFF6D6"} /><stop offset=".55" stopColor={night ? "#E9E4C8" : "#FFE7A3"} stopOpacity=".9" /><stop offset="1" stopColor="#FFE7A3" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="400" height="220" fill={`url(#sky-${tod})`} />
      <circle cx={tod === "dusk" ? 300 : tod === "dawn" ? 70 : 320} cy={tod === "day" ? 46 : 70} r="46" fill={`url(#sun-${tod})`} />
      {night && [[40, 30], [90, 60], [150, 22], [210, 48], [260, 20], [350, 40], [380, 80], [120, 90]].map(([x, y], i) => <circle key={i} className="scene-twinkle" style={{ animationDelay: `${i * 0.37}s` }} cx={x} cy={y} r={i % 3 ? 1.2 : 1.8} fill="#fff" />)}
      <g className="scene-cloud" opacity={night ? 0.25 : 0.95}><path d="M40 70 q10-18 30-10 q8-14 26-6 q18 2 14 16 h-70z" fill="#fff" /></g>
      <g className="scene-cloud scene-cloud-2" opacity={night ? 0.2 : 0.8}><path d="M220 44 q8-14 24-8 q6-10 20-4 q14 2 10 12 h-54z" fill="#fff" /></g>
      <path d="M0 150 Q70 112 150 136 T300 128 T400 140 V220 H0Z" fill={h1} />
      <g fill={night ? "#3B5357" : "#7FC49A"}>{[[60, 128], [86, 122], [312, 120], [340, 126]].map(([x, y], i) => <g key={i}><rect x={x - 2} y={y} width="4" height="14" rx="2" fill={night ? "#36484B" : "#A57C58"} /><circle cx={x} cy={y - 6} r={i % 2 ? 11 : 14} /></g>)}</g>
      <path d="M0 176 Q110 146 220 168 T400 160 V220 H0Z" fill={h2} />
      <path d="M150 220 Q190 186 260 172 Q300 166 330 170" stroke={night ? "#5F7579" : "#F3E9D6"} strokeWidth="16" fill="none" strokeLinecap="round" opacity=".8" />
      <g className="scene-grass" fill={night ? "#567277" : "#86CDA0"}>{[24, 70, 118, 182, 236, 288, 352, 384].map((x, i) => <path key={x} style={{ animationDelay: `${i * 0.21}s`, transformOrigin: `${x}px 200px` }} d={`M${x} 200 q-3 -12 0 -16 q3 4 0 16 M${x + 6} 200 q2 -9 5 -11 q0 6 -5 11`} />)}</g>
      {night && [[70, 160], [180, 150], [300, 158], [360, 170]].map(([x, y], i) => <circle key={i} className="scene-firefly" style={{ animationDelay: `${i * 0.6}s` }} cx={x} cy={y} r="2" fill="#FFF3A6" />)}
      {tod === "dusk" && <rect width="400" height="220" fill="#F7A36B" opacity=".08" />}
    </svg>
  );
}
