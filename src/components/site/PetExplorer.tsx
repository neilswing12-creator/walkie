"use client";
import { useState } from "react";
import { PetArt } from "../mascot/PetArt";
import { RarityBadge, rarityBg, rarityClass } from "../ui/Rarity";
import { RARITIES, RARITY_META } from "@/lib/constants";

type S = { key: string; name: string; rarity: string; description: string; personality: string; premium: boolean };
export function PetExplorer({ species }: { species: S[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [sel, setSel] = useState<S | null>(species[0] ?? null);
  const list = species.filter((s) => !filter || s.rarity === filter);
  if (!species.length) return null;
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by rarity">
          <button onClick={() => setFilter(null)} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold ${!filter ? "bg-walkie-ink text-white" : "bg-white shadow-card"}`}>All</button>
          {RARITIES.map((r) => <button key={r} onClick={() => setFilter(r)} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold ${filter === r ? "text-white" : "bg-white shadow-card"}`} style={filter === r ? { background: RARITY_META[r].color } : { color: RARITY_META[r].color }}>{RARITY_META[r].label}</button>)}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {list.map((s) => (
            <button key={s.key} onClick={() => setSel(s)} aria-pressed={sel?.key === s.key} className={`rounded-3xl p-2 transition hover:-translate-y-0.5 ${sel?.key === s.key ? `ring-2 ring-walkie-blue ${rarityClass(s.rarity)}` : "shadow-card"}`} style={{ background: rarityBg(s.rarity) }}>
              <PetArt species={s.key} size={96} mood={sel?.key === s.key ? "happy" : "idle"} className="mx-auto h-auto w-full" />
              <p className="truncate text-center text-[12px] font-extrabold">{s.name}</p>
            </button>
          ))}
        </div>
      </div>
      {sel && (
        <div className={`card sticky top-24 h-fit overflow-hidden ${rarityClass(sel.rarity)}`}>
          <div className="grid place-items-center pt-4" style={{ background: `linear-gradient(180deg, ${rarityBg(sel.rarity)}, #fff)` }}><PetArt species={sel.key} mood="wag" size={220} /></div>
          <div className="p-6 pt-2">
            <div className="flex items-center gap-2"><RarityBadge rarity={sel.rarity} />{sel.premium && <span className="chip bg-lavender text-violet-700">Plus</span>}</div>
            <h3 className="mt-2 font-display text-2xl font-semibold">{sel.name}</h3>
            <p className="text-[13px] font-bold text-walkie-muted">{sel.personality}</p>
            <p className="mt-2 text-[15px] text-walkie-muted">{sel.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
