"use client";
import { useRouter } from "next/navigation";
import { MyWalkie } from "../mascot/MyWalkie";
import { Sheet } from "../ui/Sheet";
import { Icon } from "../ui/Icon";
import { Walkie } from "../mascot/Walkie";
import { FAMILY_META } from "@/lib/constants";

const CARDS = [
  { f: "walk", title: "Walk", sub: "Strolls, walks & treadmill", line: "Most points per minute 🐾" },
  { f: "run", title: "Run", sub: "Runs, jogs & treadmill", line: "Pace, splits & records" },
  { f: "bike", title: "Bike", sub: "Outdoor, road & indoor rides", line: "Speed & elevation" },
] as const;

/** "What's your adventure today?" — family choice; sub-type, goal & GPS are set on the next screen. */
export function ActivityPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const go = (f: string) => { onClose(); router.push(`/app/activity/track?family=${f}`); };
  return (
    <Sheet open={open} onClose={onClose} title="What's your adventure today?">
      <div className="grid gap-2.5">
        {CARDS.map((c, i) => (
          <button key={c.f} onClick={() => go(c.f)} style={{ animationDelay: `${i * 60}ms`, background: FAMILY_META[c.f].tint }} className="focus-ring group flex animate-fade-up items-center gap-3 overflow-hidden rounded-3xl p-3 pr-4 text-left transition active:scale-[.98]">
            <span className="-my-3 -ml-1 shrink-0"><MyWalkie mood={FAMILY_META[c.f].mood} size={96} /></span>
            <span className="flex-1">
              <span className="block font-display text-[22px] font-semibold" style={{ color: FAMILY_META[c.f].color }}>{c.title}</span>
              <span className="block text-[13px] font-semibold text-walkie-slate">{c.sub}</span>
              <span className="mt-0.5 block text-[12px] text-walkie-muted">{c.line}</span>
            </span>
            <Icon name="chevron" size={18} className="opacity-40 transition group-hover:translate-x-0.5" />
          </button>
        ))}
        <button onClick={() => go("other")} className="flex items-center gap-3 rounded-3xl bg-white p-4 text-left shadow-card"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-butter text-amber-700"><Icon name="bolt" /></span><span className="flex-1 font-bold">Free workout<span className="block text-[12px] font-normal text-walkie-muted">Yoga, dance, anything that moves you</span></span></button>
      </div>
    </Sheet>
  );
}
