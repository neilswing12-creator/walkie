"use client";
import { sfx, type Sfx } from "@/lib/client/sfx";
import Link from "next/link";
import { AppIcon } from "../ui/AppIcon";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { PetCollection } from "@/lib/queries/pets";
import { PetArt, PetSilhouette } from "../mascot/PetArt";
import { RarityBadge, rarityClass, rarityBg } from "../ui/Rarity";
import { Icon, Coin } from "../ui/Icon";
import { Bar } from "../ui/Progress";
import { Sheet } from "../ui/Sheet";
import { useToast } from "../ui/Toast";
import { useCelebrate } from "../ui/Celebrate";
import { api } from "@/lib/client/api";
import { fmtMission, missionIcon } from "../app/HomeClient";
import { num } from "@/lib/format";

type Mission = { id: string; title: string; description: string; kind: string; period: string; target: number; progress: number; completed: boolean; claimed: boolean; locked: boolean; rewardCoins: number; difficulty: string };
type Challenge = { id: string; title: string; description: string; kind: string; target: number; endsAt: string; rewardCoins: number; community: boolean; locked: boolean; participants: number; joined: boolean; progress: number; completed: boolean; claimed: boolean };
type Ach = { id: string; title: string; description: string; icon: string; rewardCoins: number; progress: number; unlocked: boolean };
const TABS = ["Pets", "Missions", "Challenges", "Badges"] as const;

export function ExploreClient({ collection, missions, challenges, achievements, coins }: { collection: PetCollection; missions: Mission[]; challenges: Challenge[]; achievements: Ach[]; coins: number }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Pets");
  const [sel, setSel] = useState<PetCollection["pets"][number] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();
  const celebrate = useCelebrate();
  const [, start] = useTransition();
  useEffect(() => { if (location.hash === "#missions") setTab("Missions"); }, []);
  const owned = collection.pets.filter((p) => p.owned).length;
  const act = async (key: string, fn: () => Promise<void>, sound: Sfx | null = "coins") => { setBusy(key); try { await fn(); if (sound) sfx(sound); start(() => router.refresh()); } catch (e: any) { toast("error", e.message); } finally { setBusy(null); } };

  return (
    <div className="px-4 pt-[calc(14px+var(--safe-top))]">
      <div className="flex items-end justify-between"><h1 className="font-display text-[30px] font-semibold">Explore</h1><Link href="/app/friends" className="btn-soft min-h-[38px] px-4 text-sm"><Icon name="users" size={18} />Friends</Link></div>
      <div className="mt-3 grid grid-cols-4 gap-1 rounded-full bg-white p-1 shadow-card" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-full py-2 text-[13px] font-extrabold transition ${tab === t ? "bg-walkie-blue text-white" : "text-walkie-muted"}`}>{t}</button>)}
      </div>

      {tab === "Pets" && (
        <section className="mt-4">
          <div className="card flex items-center gap-4 p-4">
            <div className="flex-1"><p className="eyebrow">Collection</p><p className="font-display text-2xl font-semibold">{owned} <span className="text-walkie-muted">/ {collection.pets.length}</span></p><Bar value={owned / collection.pets.length} className="mt-2" /></div>
            <div className="flex -space-x-6">{collection.pets.filter((p) => p.owned).slice(0, 3).map((p) => <PetArt key={p.key} species={p.key} size={60} mood="sit" />)}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {collection.pets.map((p) => (
              <button key={p.key} onClick={() => setSel(p)} className={`card relative overflow-hidden p-3 text-left transition active:scale-[.98] ${p.owned ? rarityClass(p.rarity) : ""}`}>
                <div className="grid place-items-center rounded-[20px]" style={{ background: p.owned ? rarityBg(p.rarity) : "#F4F6F8" }}>
                  {p.owned ? <PetArt species={p.key} size={120} mood={p.owned.id === collection.activePetId ? "wag" : "idle"} /> : <PetSilhouette species={p.key} size={120} />}
                </div>
                <div className="mt-2 flex items-center justify-between gap-1"><p className="truncate font-display text-[16px] font-semibold">{p.owned ? p.owned.nickname : "???"}</p>{p.premium && <span className="chip bg-lavender text-violet-700">Plus</span>}</div>
                <div className="mt-0.5 flex items-center justify-between"><RarityBadge rarity={p.rarity} />{p.owned ? <span className="text-[12px] font-bold text-walkie-muted">Lv {p.owned.level}</span> : <Icon name="lock" size={14} className="text-walkie-muted" />}</div>
                {!p.owned && p.progress != null && <Bar value={p.progress} className="mt-2" height={5} />}
                {p.owned?.id === collection.activePetId && <span className="chip absolute right-3 top-3 bg-walkie-blue text-white">Active</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {tab === "Missions" && (
        <section className="mt-4 space-y-5" id="missions">
          {(["DAILY", "WEEKLY"] as const).map((period) => (
            <div key={period}>
              <h2 className="mb-2 px-1 font-display text-lg font-semibold">{period === "DAILY" ? "Daily missions" : "Weekly missions"}</h2>
              <div className="card divide-y divide-walkie-light">
                {missions.filter((m) => m.period === period).map((m) => (
                  <div key={m.id} className={`flex items-center gap-3 px-4 py-3.5 ${m.locked ? "opacity-60" : ""}`}>
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${m.completed ? "bg-mint text-emerald-700" : "bg-walkie-pale text-walkie-blue"}`}><Icon name={m.locked ? "lock" : m.completed ? "check" : missionIcon(m.kind)} size={20} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold">{m.title} <span className={`chip ml-1 ${m.difficulty === "HARD" ? "bg-blush text-rose-600" : m.difficulty === "MEDIUM" ? "bg-butter text-amber-700" : "bg-mint/60 text-emerald-700"}`}>{m.difficulty.toLowerCase()}</span></p>
                      <p className="text-[12px] text-walkie-muted">{m.locked ? "Walkie Plus mission" : m.description}</p>
                      {!m.locked && <div className="mt-1.5 flex items-center gap-2"><Bar value={m.progress / m.target} height={6} color={m.completed ? "#5DBE9A" : "#6B8FD6"} /><span className="shrink-0 text-[11px] font-bold text-walkie-muted tabular">{fmtMission(m.kind, m.progress)}/{fmtMission(m.kind, m.target)}</span></div>}
                    </div>
                    {m.completed && !m.claimed ? <button className="btn-primary min-h-[36px] px-3.5 text-sm" disabled={busy === m.id} onClick={() => act(m.id, async () => { const r = await api<{ coins: number }>(`/api/missions/${m.id}/claim`, { method: "POST" }); toast("success", `+${r.coins} coins`); })}><Coin size={16} />{m.rewardCoins}</button>
                      : <span className="inline-flex items-center gap-1 text-[13px] font-extrabold text-walkie-muted">{m.claimed ? <Icon name="check" size={16} className="text-emerald-600" /> : <><Coin size={15} />{m.rewardCoins}</>}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === "Challenges" && (
        <section className="mt-4 space-y-3">
          {challenges.length === 0 && <p className="card p-6 text-center text-sm text-walkie-muted">No challenges running right now. New ones arrive every month!</p>}
          {challenges.map((c) => {
            const days = Math.max(0, Math.ceil((new Date(c.endsAt).getTime() - Date.now()) / 86400000));
            return (
              <div key={c.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="flex gap-1.5">{c.community && <span className="chip bg-walkie-pale text-walkie-blue">Community</span>}<span className="chip bg-walkie-light text-walkie-muted">{days}d left</span></div><h3 className="mt-2 font-display text-lg font-semibold">{c.title}</h3><p className="text-[13px] text-walkie-muted">{c.description}</p></div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-butter px-2.5 py-1 text-sm font-extrabold text-amber-800"><Coin size={15} />{c.rewardCoins}</span>
                </div>
                {c.joined && <div className="mt-3 flex items-center gap-2"><Bar value={c.progress / c.target} /><span className="shrink-0 text-[12px] font-bold text-walkie-muted tabular">{fmtMission(c.kind, c.progress)}/{fmtMission(c.kind, c.target)}</span></div>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-walkie-muted">{num(c.participants)} joined</span>
                  {c.locked ? <span className="chip bg-lavender text-violet-700">Plus</span> : !c.joined ? <button className="btn-primary min-h-[38px] text-sm" disabled={busy === c.id} onClick={() => act(c.id, async () => { await api(`/api/challenges/${c.id}/join`, { method: "POST" }); toast("success", "You're in! Activities from now on count."); }, "success")}>Join</button>
                    : c.completed && !c.claimed ? <button className="btn-primary min-h-[38px] text-sm" onClick={() => act(c.id, async () => { const r = await api<{ coins: number; xp: number }>(`/api/challenges/${c.id}/claim`, { method: "POST" }); celebrate({ title: "Challenge complete!", coins: r.coins, xp: r.xp }); })}>Claim</button>
                    : <span className="text-[13px] font-bold text-emerald-600">{c.claimed ? "Claimed ✓" : "Joined"}</span>}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {tab === "Badges" && (<>
        <Link href="/app/leaderboard" className="card mt-4 flex items-center gap-3 overflow-hidden bg-gradient-to-r from-[#3E4E86] to-[#6B8FD6] p-4 text-white"><AppIcon name="podium" size={44} /><span className="flex-1"><span className="block font-display text-lg font-semibold">Leaderboards</span><span className="block text-[12px] text-white/80">Weekly podiums, friendly duels & tier rewards</span></span><Icon name="chevron" size={18} /></Link>
        <Link href="/app/wardrobe" className="card mt-3 flex items-center gap-3 bg-gradient-to-r from-[#F4EFFE] to-white p-4"><AppIcon name="wardrobe" size={44} /><span className="flex-1"><span className="block font-display text-lg font-semibold">Wardrobe</span><span className="block text-[12px] text-walkie-muted">Dress Walkie — hats, hoodies, costumes & more</span></span><Icon name="chevron" size={18} /></Link>
        <Link href="/app/badges" className="card mt-3 flex items-center gap-3 bg-gradient-to-r from-walkie-pale to-white p-4"><AppIcon name="achievement" size={44} /><span className="flex-1"><span className="block font-display text-lg font-semibold">Open my badge collection</span><span className="block text-[12px] text-walkie-muted">{achievements.filter((a) => a.unlocked).length} earned · tap for categories, progress & sharing</span></span><Icon name="chevron" size={18} /></Link>
        <section className="mt-3 grid grid-cols-2 gap-3" id="achievements">
          {achievements.map((a) => (
            <div key={a.id} className={`card p-4 ${a.unlocked ? "" : "opacity-80"}`}>
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${a.unlocked ? "bg-butter text-amber-700" : "bg-walkie-light text-walkie-muted"}`}><Icon name={a.icon} size={24} /></span>
              <p className="mt-2 font-display text-[15px] font-semibold leading-tight">{a.title}</p>
              <p className="text-[12px] text-walkie-muted">{a.description}</p>
              {a.unlocked ? <p className="mt-2 text-[12px] font-extrabold text-emerald-600">Unlocked ✓</p> : <Bar value={a.progress} className="mt-2" height={5} />}
            </div>
          ))}
        </section>
      </>)}

      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.owned ? sel.owned.nickname : sel?.name}>
        {sel && (
          <div className="text-center">
            <div className={`mx-auto grid w-fit place-items-center rounded-[28px] px-6 ${sel.owned ? rarityClass(sel.rarity) : ""}`} style={{ background: sel.owned ? rarityBg(sel.rarity) : "#EEF1F5" }}>
              {sel.owned ? <PetArt species={sel.key} size={180} mood="happy" /> : <PetSilhouette species={sel.key} size={180} />}
            </div>
            <div className="mt-3 flex justify-center gap-2"><RarityBadge rarity={sel.rarity} /><span className="chip bg-walkie-light text-walkie-muted">{sel.name}</span></div>
            <p className="mt-2 text-sm text-walkie-muted">{sel.owned ? sel.description : sel.personality}</p>
            {sel.owned ? (
              <Link href={`/app/pets/${sel.owned.id}`} className="btn-primary mt-5 w-full">Visit {sel.owned.nickname}</Link>
            ) : (
              <div className="mt-4 rounded-2xl bg-walkie-light p-4">
                <p className="text-[13px] font-bold text-walkie-slate"><Icon name="lock" size={14} className="mr-1 inline" />{sel.hint}</p>
                {sel.progress != null && <Bar value={sel.progress} className="mt-2" />}
                {sel.unlockType === "PURCHASE" && (
                  <button className="btn-primary mt-3 w-full" disabled={busy === sel.key || (sel.premium && !collection.plus) || coins < (sel.priceCoins ?? 0)} onClick={() => act(sel.key, async () => { await api("/api/pets/adopt", { body: { speciesId: sel.speciesId } }); setSel(null); celebrate({ title: `Welcome, ${sel.name}!`, species: sel.key, body: "Your new friend joined the pet shop." }); }, null)}>
                    <Coin size={18} />{sel.priceCoins?.toLocaleString()} · Adopt
                  </button>
                )}
                {sel.unlockType === "PURCHASE" && coins < (sel.priceCoins ?? 0) && <p className="mt-2 text-[12px] text-walkie-muted">You have {num(coins)} coins — keep walking!</p>}
                {sel.premium && !collection.plus && <Link href="/app/plus" className="btn-soft mt-2 w-full">Part of Walkie Plus</Link>}
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
