import type { ReactNode } from "react";
import { Walkie, type Mood } from "../mascot/Walkie";

export function EmptyState({ title, body, mood = "sit", action }: { title: string; body?: string; mood?: Mood; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <Walkie mood={mood} size={120} />
      <h3 className="mt-2 font-display text-lg font-semibold text-walkie-ink">{title}</h3>
      {body && <p className="mt-1 max-w-xs text-sm text-walkie-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-shimmer rounded-2xl bg-[linear-gradient(90deg,#EEF2F6_25%,#F7F9FB_50%,#EEF2F6_75%)] bg-[length:200%_100%] ${className}`} />;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <Walkie mood="sad" size={110} />
      <p className="mt-2 text-sm font-semibold text-walkie-slate">{message}</p>
      {retry && <button className="btn-soft mt-3" onClick={retry}>Try again</button>}
    </div>
  );
}

export function Loading({ label = "Fetching…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16" role="status">
      <Walkie mood="walk" size={110} />
      <p className="mt-1 text-sm font-semibold text-walkie-muted">{label}</p>
    </div>
  );
}
