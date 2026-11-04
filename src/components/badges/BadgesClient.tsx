"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { BadgeCollection } from "@/lib/queries/badges";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/achievements/catalog";
import { BadgeArt } from "./BadgeArt";
import { BadgeShareSheet } from "./BadgeShareSheet";
import { Walkie } from "../mascot/Walkie";
import { Icon, Coin } from "../ui/Icon";
import { Bar, Ring } from "../ui/Progress";
import { Sheet } from "../ui/Sheet";
import { RarityBadge } from "../ui/Rarity";

export type Badge = BadgeCollection["badges"][number];

export function formatProgress(kind: string, v: number) {
  const n = Math.floor(v);
  if (["TOTAL_STEPS", "DAILY_STEPS_MAX"].includes(kind)) return `${n.toLocaleString()} steps`;
  if (/DISTANCE/.test(kind)) return `${(v / 1000).toLocaleString(undefined, { maximumFractionDigits: v >= 100000 ? 0 : 1 })} km`;
  if (/DURATION|ACTIVE_MINUTES|DAILY_ACTIVE_MAX/.test(kind)) return n >= 120 && kind === "TOTAL_ACTIVE_MINUTES" ? `${Math.floor(n / 60)} h` : `${n} min`;
  if (kind === "STREAK" || /ACTIVE_DAYS/.test(kind)) return `${n} days`;
  if (kind === "SHOP_FULL") return `${n}%`;
  if (kind === "SHOP_LEVEL") return `level ${n}`;
  return n.toLocaleString();
}
export function badgeReaction(b: Badge) {
  if (b.unlockedAt) return b.rarity === "LEGENDARY" || b.rarity === "MYTHICAL" ? "This one is LEGENDARY. I'm so proud of you!" : "We did it together! Walkie is proud of you!";
  const p = b.progress / b.target;
  if (p >= 0.75) return "You're getting closer! Almost there!";
  if (p > 0) return "You're getting closer! Let's keep going.";
  return "A new adventure awaits — let's start!";
}

function Inner({ data, userName }: { data: BadgeCollection; userName: string }) {
  const sp = useSearchParams();
  const [cat, setCat] = useState<string>("ALL");
  const [sel, setSel] = useState<Badge | null>(null);
  const [share, setShare] = useState(false);
  useEffect(() => { const k = sp.get("b"); if (k) { const b = data.badges.find((x) => x.key === k); if (b) { setSel(b); if (sp.get("share")) setShare(true); } } }, [sp, data.badges]);
  const list = useMemo(() => data.badges.filter((b) => cat === "ALL" || b.category === cat).sort((a, b) => Number(!!b.unlockedAt) - Number(!!a.unlockedAt)), [cat, data.badges]);
  const latest = data.badges.find((b) => b.key === data.latestKey);
  const pct = data.total ? data.earned / data.total : 0;
  return (
    <div className="px-4 pt-[calc(14px+var(--safe-top))]">
      <div className="flex items-center gap-3"><Link href="/app/explore" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card" aria-label="Back"><Icon name="back" size={20} /></Link><h1 className="font-display text-[28px] font-semibold">My Achievements</h1></div>
      <section className="card mt-4 flex items-center gap-4 overflow-hidden bg-gradient-to-br from-walkie-pale to-white p-4">
        <Ring value={pct} size={92} stroke={10} label="Collection completion"><div><p className="font-display text-xl font-semibold leading-none">{Math.round(pct * 100)}%</p><p className="text-[10px] font-bold text-walkie-muted">complete</p></div></Ring>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[26px] font-semibold leading-none tabular">{data.earned}<span className="text-[15px] text-walkie-muted"> / {data.total} badges</span></p>
          {latest ? <button onClick={() => setSel(latest)} className="mt-2 flex items-center gap-2 rounded-2xl bg-white px-2 py-1.5 text-left shadow-card"><BadgeArt rarity={latest.rarity} art={latest.art} imageUrl={latest.imageUrl} size={34} still /><span className="min-w-0"><span className="block text-[10px] font-bold uppercase text-walkie-muted">Latest</span><span className="block truncate text-[13px] font-bold">{latest.title}</span></span></button> : <p className="mt-1 text-[13px] text-walkie-muted">Your first badge is one walk away!</p>}
        </div>
        <Walkie mood={data.earned ? "celebrate" : "greet"} size={84} className="-mr-2 shrink-0" />
      </section>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist">
        {["ALL", ...CATEGORIES].map((c) => { const n = c === "ALL" ? data.earned : data.badges.filter((b) => b.category === c && b.unlockedAt).length; return (
          <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition ${cat === c ? "bg-walkie-ink text-white" : "bg-white text-walkie-slate shadow-card"}`}>{c === "ALL" ? "All" : CATEGORY_LABEL[c]}{n > 0 && <span className="ml-1.5 opacity-60">{n}</span>}</button>
        ); })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {list.map((b, i) => (
          <button key={b.id} onClick={() => setSel(b)} className="flex animate-fade-up flex-col items-center rounded-3xl bg-white px-1.5 pb-2.5 pt-2 shadow-card transition active:scale-[.97]" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
            <BadgeArt rarity={b.rarity} art={b.art} imageUrl={b.imageUrl} size={84} locked={!b.unlockedAt} hidden={b.hidden} still title={b.title} />
            <p className="mt-0.5 line-clamp-2 min-h-[30px] text-center text-[11.5px] font-extrabold leading-tight">{b.title}</p>
            {b.unlockedAt ? <span className="mt-1 text-[10px] font-extrabold text-emerald-600">✓ Earned</span> : <div className="mt-1.5 w-full px-2"><Bar value={b.progress / b.target} height={4} /></div>}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="card mt-3 p-6 text-center text-sm text-walkie-muted">No badges in this category yet.</p>}

      <Sheet open={!!sel} onClose={() => { setSel(null); setShare(false); }} title={sel?.title}>
        {sel && (
          <div className="text-center">
            <div className="mx-auto w-fit animate-pop"><BadgeArt rarity={sel.rarity} art={sel.art} imageUrl={sel.imageUrl} size={190} locked={!sel.unlockedAt} hidden={sel.hidden} /></div>
            <div className="mt-2 flex justify-center gap-2"><RarityBadge rarity={sel.rarity} /><span className="chip bg-walkie-light text-walkie-muted">{CATEGORY_LABEL[sel.category] ?? sel.category}</span></div>
            <p className="mt-2 text-[15px] text-walkie-slate">{sel.description}</p>
            {sel.unlockedAt ? (
              <p className="mt-2 text-[13px] font-bold text-emerald-600">Unlocked {new Date(sel.unlockedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
            ) : !sel.hidden ? (
              <div className="mt-3 rounded-2xl bg-walkie-light p-4 text-left">
                <p className="text-[13px] font-extrabold text-walkie-slate">You're getting closer!</p>
                <p className="mt-0.5 font-display text-lg font-semibold tabular">{formatProgress(sel.kind, sel.progress)} <span className="text-walkie-muted">/ {formatProgress(sel.kind, sel.target)}</span></p>
                <Bar value={sel.progress / sel.target} className="mt-2" height={10} />
                {sel.startsAt && <p className="mt-2 text-[12px] text-walkie-muted">Limited time: {new Date(sel.startsAt).toLocaleDateString()} – {new Date(sel.endsAt!).toLocaleDateString()}</p>}
              </div>
            ) : null}
            {!sel.hidden && <div className="mt-3 flex flex-wrap justify-center gap-2 text-[13px] font-extrabold"><span className="inline-flex items-center gap-1 rounded-full bg-butter px-3 py-1.5 text-amber-800"><Coin size={15} />{sel.rewardCoins}</span><span className="rounded-full bg-walkie-pale px-3 py-1.5 text-walkie-slate">{sel.rewardXp} XP</span>{sel.rewardItemKey && <span className="rounded-full bg-lavender px-3 py-1.5 text-violet-700">🎁 Exclusive item</span>}</div>}
            <div className="mt-4 flex items-center gap-3 rounded-3xl bg-walkie-pale p-3 text-left"><Walkie mood={sel.unlockedAt ? "celebrate" : "greet"} size={64} className="-my-2 shrink-0" /><p className="font-display font-semibold">{badgeReaction(sel)}</p></div>
            {sel.unlockedAt && <button className="btn-primary mt-4 w-full" onClick={() => setShare(true)}><Icon name="share" size={18} />Share badge</button>}
          </div>
        )}
      </Sheet>
      {sel?.unlockedAt && <BadgeShareSheet open={share} onClose={() => setShare(false)} badge={sel} userName={userName} />}
      <div className="h-6" />
    </div>
  );
}
export function BadgesClient(props: { data: BadgeCollection; userName: string }) { return <Suspense><Inner {...props} /></Suspense>; }
