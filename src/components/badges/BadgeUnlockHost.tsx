"use client";
import { usePathname, useRouter } from "next/navigation";
import { MyWalkie } from "../mascot/MyWalkie";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { RARITY_META, type Rarity } from "@/lib/constants";
import { BadgeArt } from "./BadgeArt";
import { Walkie } from "../mascot/Walkie";
import { Coin } from "../ui/Icon";
import type { BadgeArt as Art } from "@/lib/achievements/catalog";

const RANK: Record<string, number> = { COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4, MYTHICAL: 5 };
type U = { id: string; key: string; title: string; description: string; rarity: string; art: Art | null; imageUrl: string | null; coins: number; xp: number; item: string | null };
/** Call after any action that might unlock badges. */
export const checkBadges = () => window.dispatchEvent(new Event("walkie:check-badges"));

/**
 * Premium unlock moment, queued from the server's "unseen" list so unlocks from any device/sync get celebrated.
 * Never shown over live activity tracking.
 */
export function BadgeUnlockHost() {
  const path = usePathname();
  const router = useRouter();
  const [queue, setQueue] = useState<U[]>([]);
  const [stage, setStage] = useState(0);
  const tracking = path.startsWith("/app/activity/track");
  const load = useCallback(() => { if (!tracking) api<U[]>("/api/achievements/unseen").then((q) => q.sort((a, b) => RANK[b.rarity] - RANK[a.rarity])).then((q) => q.length && setQueue((cur) => (cur.length ? cur : q))).catch(() => {}); }, [tracking]);
  useEffect(() => { load(); }, [path, load]);
  useEffect(() => { const h = () => setTimeout(load, 600); window.addEventListener("walkie:check-badges", h); return () => window.removeEventListener("walkie:check-badges", h); }, [load]);
  const cur = queue[0];
  useEffect(() => { if (!cur) return; setStage(0); const t1 = setTimeout(() => setStage(1), 450), t2 = setTimeout(() => setStage(2), 1150); return () => { clearTimeout(t1); clearTimeout(t2); }; }, [cur]);
  if (!cur || tracking) return null;
  const rm = RARITY_META[cur.rarity as Rarity] ?? RARITY_META.COMMON;
  // Several unlocks at once (e.g. a first walk) are celebrated together: one big reveal + the rest in a row.
  const done = (go?: string) => { api("/api/achievements/unseen", { body: { ids: queue.map((q) => q.id) } }).catch(() => {}); setQueue([]); if (go) router.push(go); };
  return (
    <div className="fixed inset-0 z-[96] grid place-items-center bg-walkie-slate/50 p-6 backdrop-blur-sm animate-fade-up" role="dialog" aria-modal="true" aria-label={`New achievement: ${cur.title}`}>
      <div className="relative w-full max-w-xs text-center">
        {/* rays + particles */}
        <div className="pointer-events-none absolute left-1/2 top-[110px] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70" style={{ background: `repeating-conic-gradient(from 0deg, ${rm.bg} 0 10deg, transparent 10deg 24deg)`, animation: stage >= 1 ? "badge-rays 16s linear infinite" : undefined, maskImage: "radial-gradient(circle, #000 30%, transparent 70%)", WebkitMaskImage: "radial-gradient(circle, #000 30%, transparent 70%)" }} />
        {stage >= 1 && Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return <span key={i} className="pointer-events-none absolute left-1/2 top-[110px] h-2.5 w-2.5 rounded-full" style={{ background: ["#F2C94C", "#A9C5ED", "#F28DAA", "#C7B8F5", "#5DBE9A"][i % 5], ["--dx" as string]: `${Math.cos(a) * 150}px`, ["--dy" as string]: `${Math.sin(a) * 150}px`, animation: "particle 1.1s ease-out forwards" }} />; })}
        <div className="relative h-[230px]">
          {stage >= 1 ? <div className="mx-auto w-fit" style={{ animation: "badge-reveal .7s cubic-bezier(.2,.9,.3,1.2) both" }}><BadgeArt rarity={cur.rarity} art={cur.art} imageUrl={cur.imageUrl} size={190} /></div> : <Walkie mood="discover" size={170} className="mx-auto pt-8" />}
        </div>
        <div className={`relative rounded-[28px] bg-white p-5 shadow-lift transition-all duration-500 ${stage >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          <div className="absolute -left-6 -top-14"><MyWalkie mood="celebrate" size={90} /></div>
          <p className="text-[12px] font-extrabold tracking-[.14em]" style={{ color: rm.color }}>NEW ACHIEVEMENT!</p>
          <h2 className="mt-1 font-display text-2xl font-semibold leading-tight">{cur.title}</h2>
          <p className="mt-1 text-[13px] text-walkie-muted">{cur.description}</p>
          <p className="mt-1 text-[13px] font-bold text-walkie-slate">Walkie is proud of you!</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-[13px] font-extrabold"><span className="inline-flex items-center gap-1 rounded-full bg-butter px-3 py-1.5 text-amber-800"><Coin size={15} />+{cur.coins}</span><span className="rounded-full bg-walkie-pale px-3 py-1.5 text-walkie-slate">+{cur.xp} XP</span>{cur.item && <span className="rounded-full bg-lavender px-3 py-1.5 text-violet-700">🎁 New item</span>}</div>
          <div className="mt-4 grid grid-cols-2 gap-2"><button className="btn-soft" onClick={() => done(queue.length > 1 ? "/app/badges" : `/app/badges?b=${cur.key}&share=1`)}>{queue.length > 1 ? "See all" : "Share"}</button><button className="btn-primary" onClick={() => done()} data-autofocus>Awesome!</button></div>
          {queue.length > 1 && (
            <div className="mt-3 rounded-2xl bg-walkie-light p-2">
              <p className="text-[11px] font-extrabold text-walkie-muted">+{queue.length - 1} more badge{queue.length > 2 ? "s" : ""} unlocked</p>
              <div className="mt-1 flex justify-center gap-1">{queue.slice(1, 6).map((q) => <BadgeArt key={q.id} rarity={q.rarity} art={q.art} imageUrl={q.imageUrl} size={40} still title={q.title} />)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
