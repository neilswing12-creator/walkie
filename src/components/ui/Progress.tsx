import type { ReactNode } from "react";

export function Ring({ value, size = 120, stroke = 12, color = "#6B8FD6", track = "#EAF2FC", children, label }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle className="ring-bar" cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Bar({ value, color = "#6B8FD6", className = "", height = 8 }: { value: number; color?: string; className?: string; height?: number }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className={`w-full overflow-hidden rounded-full bg-walkie-pale ${className}`} style={{ height }} role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${v * 100}%`, background: color }} />
    </div>
  );
}
