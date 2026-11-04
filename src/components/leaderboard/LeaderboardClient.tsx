"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { Walkie, type Mood } from "../mascot/Walkie";
import type { AccessoryProp } from "../mascot/Accessories";
import { Icon, Coin } from "../ui/Icon";
import { AppIcon, type AppIconName } from "../ui/AppIcon";
import { Sheet } from "../ui/Sheet";
import { Loading, ErrorState } from "../ui/States";
import { useToast } from "../ui/Toast";
import { COUNTRIES, flag, countryName } from "./countries";

type Row = { rank: number; userId: string; me: boolean; name: string; country: string | null; photo: string | null; score: number; change: number | null; walkie: { look: string; fur: string; accessories: AccessoryProp[] } };
type Data = {
  period: string; board: Board; scope: Scope; total: number; needs?: "country" | "community"; rows: Row[];
  me: { rank: number | null; score: number; gapToNext: number | null; inScope: boolean; change: number | null; disqualified: { id: string } | null } | null;
  privacy?: { optedIn: boolean; country: string | null; community: string | null; publicName: string | null };
  available: { periods: string[]; boards: string[]; scopes: string[] };
  weekly: { score: number; tier: string | null; next: { key: string; min: number; coins: number } | null; unverifiedKm: number };
  rules: { overall: { pointsWeight: number; stepsPer1000: number; missionWeight: number; dailyCap: number }; tiers: { key: string; min: number; coins: number }[]; weeklyTop: number[]; monthlyTop: number[]; improvementBonus: number; minParticipants: number; timezone: string; weekStartsOn: number; includeUnverifiedDistance: boolean };
};
type Board = "overall" | "walk" | "run" | "bike" | "steps";
type Scope = "friends" | "global" | "country" | "community";
type Duel = { id: string; metric: string; label: string; days: number; status: string; endsAt: string | null; incoming: boolean; me: { score: number }; friend: { id: string; name: string; score: number }; result: string | null };
const PERIODS = [["day", "Today"], ["week", "This week"], ["month", "This month"], ["all", "All time"]] as const;
const BOARDS: [Board, string, AppIconName][] = [["overall", "Overall", "leaderboard"], ["walk", "Walking", "walk"], ["run", "Running", "run"], ["bike", "Cycling", "bike"], ["steps", "Steps", "steps"]];
const SCOPES: [Scope, string][] = [["friends", "Friends"], ["global", "Global"], ["country", "Country"], ["community", "Community"]];
const TIER_STYLE: Record<string, string> = { BRONZE: "from-[#E8B48A] to-[#B9784A]", SILVER: "from-[#E3E9F1] to-[#9AA6B8]", GOLD: "from-[#FFE08A] to-[#E0A325]", DIAMOND: "from-[#C8E9FF] to-[#7FA6DE]" };
const fmt = (b: Board, v: number) => (b === "steps" || b === "overall" ? Math.round(v).toLocaleString() : v.toFixed(v >= 100 ? 0 : 1));
const unit = (b: Board) => (b === "overall" ? "pts" : b === "steps" ? "steps" : "km");
const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function Avatar({ r, size = 44 }: { r: Row; size?: number }) {
  if (r.photo) return <img src={r.photo} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span className="relative shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-walkie-pale to-white ring-2 ring-white" style={{ width: size, height: size }}>
      <span className="absolute left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2"><Walkie size={size * 1.75} mood="sit" look={r.walkie.look} fur={r.walkie.fur} accessories={r.walkie.accessories.filter((a) => !/acc_(cape|wings|jetpack)/.test(a.key))} title={r.name} /></span>
    </span>
  );
}
function Change({ v }: { v: number | null }) {
  if (!v) return null;
  return <span className={`animate-pop inline-flex items-center rounded-full px-1.5 text-[10px] font-extrabold ${v > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{v > 0 ? "▲" : "▼"}{Math.abs(v)}</span>;
}

function Podium({ rows, board }: { rows: Row[]; board: Board }) {
  const spot = (i: number) => rows[i];
  const order = [1, 0, 2];
  const H = [148, 112, 90], MOOD: Mood[] = ["celebrate", "happy", "wag"];
  const FACE = ["from-[#FFE7A0] via-[#F2C14E] to-[#D79A26]", "from-[#F1F5FA] via-[#C9D3E0] to-[#99A6B9]", "from-[#F4C9A4] via-[#D99A68] to-[#A9693F]"];
  const TOP = ["#FFF0BE", "#F7FAFD", "#F8D7BB"];
  return (
    <div className="relative mx-auto mt-2 flex max-w-sm items-end justify-center gap-2 px-2">
      {order.map((i) => {
        const r = spot(i);
        return (
          <div key={i} className="flex w-1/3 flex-col items-center" style={{ animation: `ftue-in 420ms ${120 + (i === 0 ? 260 : i * 120)}ms both cubic-bezier(.2,.8,.2,1)` }}>
            <div className="relative">
              {i === 0 && <><span aria-hidden className="absolute left-1/2 top-[44%] h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/50 blur-2xl" /><span aria-hidden className="absolute -top-5 left-1/2 z-10 -translate-x-1/2 drop-shadow" style={{ animation: "lb-bob 2.4s ease-in-out infinite" }}><AppIcon name="vip" size={34} bare /></span></>}
              {r ? <Walkie size={i === 0 ? 124 : 104} mood={MOOD[i]} look={r.walkie.look} fur={r.walkie.fur} accessories={r.walkie.accessories} title={r.name} className="relative" />
                : <div className="grid place-items-center text-white/60" style={{ width: i === 0 ? 124 : 104, height: i === 0 ? 124 : 104 }}><span className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-white/40 font-display text-xl">?</span></div>}
            </div>
            <p className="-mt-1 w-full truncate text-center text-[13px] font-extrabold text-white drop-shadow">{r ? (r.me ? "You" : r.name) : "Open spot"}</p>
            <p className="text-[11px] font-bold text-white/80">{r ? `${fmt(board, r.score)} ${unit(board)}` : "—"}</p>
            <div className="relative mt-1.5 w-full">
              <div className="mx-auto h-4 w-[92%] rounded-[50%]" style={{ background: TOP[i], boxShadow: "inset 0 -2px 0 rgba(0,0,0,.08)" }} />
              <div className={`-mt-2 flex items-start justify-center rounded-b-2xl rounded-t-md bg-gradient-to-b ${FACE[i]} pt-3 shadow-[0_14px_28px_-12px_rgba(0,0,0,.45)]`} style={{ height: H[i] - 40 }}>
                <span className="font-display text-[30px] font-semibold text-white/95 [text-shadow:0_2px_0_rgba(0,0,0,.15)]">{i + 1}</span>
              </div>
              <span aria-hidden className="pointer-events-none absolute inset-x-2 top-3 h-6 rounded-full bg-white/25 blur-sm" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Inner() {
  const toast = useToast();
  const sp = useSearchParams();
  const [period, setPeriod] = useState<string>("week");
  const [board, setBoard] = useState<Board>("overall");
  const [scope, setScope] = useState<Scope>((sp.get("tab") as Scope) ?? "friends");
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [sheet, setSheet] = useState<null | "rules" | "privacy" | "duel" | "dispute">(null);
  const [friends, setFriends] = useState<{ id: string; name: string }[]>([]);
  const load = useCallback(() => { setErr(null); api<Data>(`/api/leaderboard?period=${period}&board=${board}&scope=${scope}`).then(setD).catch((e) => setErr(e.message)); }, [period, board, scope]);
  useEffect(() => { load(); }, [load]);
  const loadDuels = useCallback(() => api<Duel[]>("/api/duels").then(setDuels).catch(() => {}), []);
  useEffect(() => { loadDuels(); }, [loadDuels]);

  if (err) return <ErrorState message={err} retry={load} />;
  const weekly = d?.weekly;
  const tierP = weekly?.next ? Math.min(1, weekly.score / weekly.next.min) : 1;
  const share = async () => {
    if (!d?.me?.rank) return;
    const text = `I'm #${d.me.rank} on Walkie's ${PERIODS.find((p) => p[0] === period)?.[1].toLowerCase()} ${BOARDS.find((b) => b[0] === board)?.[1].toLowerCase()} leaderboard 🐾 Come walk with me!`;
    if (navigator.share) { try { await navigator.share({ title: "My Walkie rank", text, url: `${location.origin}/` }); } catch {} } else { try { await navigator.clipboard.writeText(text); toast("success", "Copied — paste it anywhere!"); } catch {} }
  };
  const cheer = async (r: Row) => { try { await api("/api/leaderboard/cheer", { body: { userId: r.userId } }); toast("success", `You cheered on ${r.name}! 📣`); } catch (e: any) { toast("info", e.message); } };

  return (
    <div className="pb-32">
      {/* arena */}
      <section className="relative overflow-hidden rounded-b-[34px] pb-6 pt-[calc(12px+var(--safe-top))] text-white" style={{ background: "radial-gradient(90% 60% at 50% 30%, #6F86D9 0%, #4A5DAA 45%, #2E3A72 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-10 top-0 h-[120%] w-24 rotate-[18deg] bg-gradient-to-b from-white/25 to-transparent blur-md" />
          <div className="absolute -right-10 top-0 h-[120%] w-24 -rotate-[18deg] bg-gradient-to-b from-white/25 to-transparent blur-md" />
          {[[10, 20], [88, 14], [24, 48], [76, 40], [50, 8], [62, 60], [16, 70]].map(([x, y], i) => <span key={i} className="wk-twinkle absolute h-1.5 w-1.5 rotate-45 rounded-[1px] bg-white" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.33}s` }} />)}
        </div>
        <header className="relative flex items-center gap-2 px-4">
          <Link href="/app/explore" className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur" aria-label="Back"><Icon name="back" size={20} /></Link>
          <h1 className="flex-1 font-display text-[22px] font-semibold">Leaderboard</h1>
          <button onClick={() => setSheet("rules")} className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur" aria-label="How scoring works"><Icon name="info" size={19} /></button>
          <button onClick={() => setSheet("privacy")} className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur" aria-label="Leaderboard privacy"><Icon name="shield" size={19} /></button>
        </header>
        <div className="relative mx-4 mt-3 flex rounded-full bg-white/15 p-1 backdrop-blur" role="tablist" aria-label="Period">
          {PERIODS.filter(([k]) => !d || d.available.periods.includes(k)).map(([k, l]) => <button key={k} role="tab" aria-selected={period === k} onClick={() => setPeriod(k)} className={`flex-1 rounded-full py-1.5 text-[12px] font-bold transition ${period === k ? "bg-white text-walkie-ink shadow" : "text-white/85"}`}>{l}</button>)}
        </div>
        <div className="no-scrollbar relative mt-2 flex gap-1.5 overflow-x-auto px-4">
          {BOARDS.filter(([k]) => !d || d.available.boards.includes(k)).map(([k, l, ic]) => <button key={k} onClick={() => setBoard(k)} className={`flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-[12px] font-bold transition ${board === k ? "bg-white text-walkie-ink" : "bg-white/10 text-white/90"}`}><AppIcon name={ic} size={24} />{l}</button>)}
        </div>
        {!d ? <div className="h-[300px]" /> : d.needs ? (
          <div className="relative mx-6 mt-8 rounded-3xl bg-white/12 p-5 text-center backdrop-blur">
            <p className="font-display text-lg font-semibold">{d.needs === "country" ? "Pick your country" : "Join a community"}</p>
            <p className="mt-1 text-[13px] text-white/80">{d.needs === "country" ? "Choose it yourself — we never use your location for this." : "Type your town, club or school to compete locally. We never use GPS for this."}</p>
            <button className="btn-primary mt-3 !bg-white !text-walkie-ink" onClick={() => setSheet("privacy")}>Set it up</button>
          </div>
        ) : <Podium key={`${period}${board}${scope}`} rows={d.rows.slice(0, 3)} board={board} />}
      </section>

      {/* scope */}
      <div className="sticky top-0 z-10 bg-walkie-light/95 px-4 pb-2 pt-3 backdrop-blur">
        <div className="flex rounded-2xl bg-white p-1 shadow-card" role="tablist" aria-label="Who">
          {SCOPES.filter(([k]) => !d || d.available.scopes.includes(k)).map(([k, l]) => <button key={k} role="tab" aria-selected={scope === k} onClick={() => setScope(k)} className={`flex-1 rounded-xl py-2 text-[13px] font-bold transition ${scope === k ? "bg-walkie-blue text-white shadow" : "text-walkie-muted"}`}>{l}</button>)}
        </div>
      </div>

      <div className="px-4">
        {!d ? <Loading label="Counting steps…" /> : (
          <>
            {d.me?.disqualified && (
              <div className="card mt-2 border-2 border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900"><p className="font-bold">Your entry is on hold after a review</p><p className="mt-0.5">Your activities, coins and badges are unaffected. If you think this is a mistake, ask for a second look.</p><button className="mt-2 font-bold underline" onClick={() => setSheet("dispute")}>Ask for a review</button></div>
            )}
            {(scope === "global" || scope === "country" || scope === "community") && !d.privacy?.optedIn && !d.needs && (
              <button onClick={() => setSheet("privacy")} className="card mt-2 flex w-full items-center gap-3 p-4 text-left"><AppIcon name="leaderboard" size={40} /><span className="flex-1"><span className="block font-bold">Join the public boards</span><span className="block text-[12px] text-walkie-muted">Opt in with a display name and your Walkie as your avatar. Totals only — never locations.</span></span><Icon name="chevron" size={18} /></button>
            )}

            {/* tier progress — rewards personal effort, not only first place */}
            {weekly && (
              <section className="card mt-2 overflow-hidden p-4">
                <div className="flex items-center gap-3">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${TIER_STYLE[weekly.tier ?? ""] ?? "from-walkie-pale to-walkie-soft"} font-display text-[13px] font-semibold text-white shadow-card`}>{weekly.tier ? weekly.tier[0] : "–"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-walkie-muted">Your week</p>
                    <p className="font-display text-[17px] font-semibold">{weekly.tier ? `${title(weekly.tier.toLowerCase())} tier` : "Warming up"} · {Math.round(weekly.score).toLocaleString()} pts</p>
                  </div>
                </div>
                {weekly.next ? <>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-walkie-light"><div className="h-full rounded-full bg-gradient-to-r from-walkie-blue to-[#9A7BE6] transition-[width] duration-700" style={{ width: `${Math.max(4, tierP * 100)}%` }} /></div>
                  <p className="mt-1.5 text-[12px] text-walkie-muted">{Math.max(0, Math.ceil(weekly.next.min - weekly.score)).toLocaleString()} pts to <b>{title(weekly.next.key.toLowerCase())}</b> · <Coin size={11} className="inline" /> {weekly.next.coins} when the week ends</p>
                </> : <p className="mt-2 text-[12px] font-bold text-emerald-700">Top tier reached — incredible week!</p>}
                {weekly.unverifiedKm > 0 && <p className="mt-1.5 text-[11px] text-walkie-muted">{weekly.unverifiedKm} km from indoor sessions isn't ranked on distance boards (it can't be verified) — it still counts toward Overall points.</p>}
              </section>
            )}

            {/* ranked list */}
            <ol className="mt-3 space-y-2" aria-label="Rankings">
              {d.rows.slice(3).map((r, i) => (
                <li key={r.userId} className={`card flex items-center gap-3 px-3 py-2.5 ${r.me ? "ring-2 ring-walkie-blue" : ""}`} style={{ animation: `ftue-in 300ms ${Math.min(i, 12) * 35}ms both` }}>
                  <span className="w-7 text-center font-display text-[15px] font-semibold text-walkie-slate tabular">{r.rank}</span>
                  <Avatar r={r} />
                  <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-bold">{r.me ? "You" : r.name} {r.country && <span title={countryName(r.country)}>{flag(r.country)}</span>}</p><Change v={r.change} /></div>
                  {scope === "friends" && !r.me && <button onClick={() => cheer(r)} className="grid h-8 w-8 place-items-center rounded-full bg-walkie-pale text-[15px]" aria-label={`Cheer on ${r.name}`}><Icon name="hand" size={16} className="text-walkie-blue" /></button>}
                  <p className="text-right font-display text-[16px] font-semibold tabular">{fmt(board, r.score)}<span className="block text-[10px] font-bold text-walkie-muted">{unit(board)}</span></p>
                </li>
              ))}
            </ol>
            {d.rows.length === 0 && !d.needs && (
              <div className="card mt-3 p-6 text-center"><Walkie mood="discover" size={110} className="mx-auto" /><p className="font-display text-lg font-semibold">No scores yet</p><p className="text-[13px] text-walkie-muted">{scope === "friends" ? "Add friends or head out for a walk to get the board started!" : "Be the first on this board — every step counts."}</p></div>
            )}
            {d.total > d.rows.length && <p className="mt-2 text-center text-[11px] text-walkie-muted">Showing the top {d.rows.length} of {d.total.toLocaleString()}</p>}

            {/* friends: duels */}
            {scope === "friends" && (
              <section className="mt-5">
                <div className="flex items-end justify-between px-1"><h2 className="font-display text-[18px] font-semibold">Friendly challenges</h2><button className="text-[13px] font-bold text-walkie-blue" onClick={async () => { setSheet("duel"); try { const f = await api<{ status: string; user: { id: string; name: string } }[]>("/api/friends"); setFriends(f.filter((x) => x.status === "ACCEPTED").map((x) => x.user)); } catch {} }}>+ Challenge a friend</button></div>
                {duels.length === 0 ? <p className="card mt-2 p-4 text-center text-[13px] text-walkie-muted">Challenge a friend to most steps, km or points over 1, 3 or 7 days. Everyone who takes part earns coins.</p> : (
                  <ul className="mt-2 space-y-2">{duels.map((x) => {
                    const total = Math.max(1, x.me.score + x.friend.score);
                    return (
                      <li key={x.id} className="card p-3.5">
                        <div className="flex items-center justify-between text-[13px]"><p className="font-bold">You vs {x.friend.name}</p><p className="text-[11px] font-bold text-walkie-muted">{x.status === "ACTIVE" && x.endsAt ? `ends ${new Date(x.endsAt).toLocaleDateString(undefined, { weekday: "short", hour: "numeric" })}` : x.status === "DONE" ? (x.result === "won" ? "🏆 You won!" : x.result === "tie" ? "Tie!" : "Finished") : x.incoming ? "Waiting for you" : "Invite sent"}</p></div>
                        <p className="text-[11px] text-walkie-muted">Most {x.label} · {x.days} day{x.days > 1 ? "s" : ""}</p>
                        {x.status !== "PENDING" && <><div className="mt-2 flex h-3 overflow-hidden rounded-full bg-walkie-light"><div className="h-full bg-walkie-blue transition-[width] duration-700" style={{ width: `${(x.me.score / total) * 100}%` }} /><div className="h-full flex-1 bg-[#F28DAA]" /></div><div className="mt-1 flex justify-between text-[12px] font-bold"><span>You {x.me.score.toLocaleString()}</span><span>{x.friend.score.toLocaleString()} {x.friend.name}</span></div></>}
                        {x.incoming && <div className="mt-2 flex gap-2"><button className="btn-primary !min-h-[36px] flex-1" onClick={async () => { await api(`/api/duels/${x.id}`, { body: { action: "accept" } }).catch((e) => toast("error", e.message)); loadDuels(); }}>Accept</button><button className="btn-ghost !min-h-[36px]" onClick={async () => { await api(`/api/duels/${x.id}`, { body: { action: "decline" } }).catch(() => {}); loadDuels(); }}>Not now</button></div>}
                      </li>
                    );
                  })}</ul>
                )}
              </section>
            )}

            {/* rewards */}
            <section className="card mt-5 p-4">
              <div className="flex items-center gap-2"><AppIcon name="reward" size={34} /><h2 className="font-display text-[17px] font-semibold">Rewards for every pace</h2></div>
              <p className="mt-1 text-[12px] text-walkie-muted">Reach a tier and you're rewarded when the week ends — no matter where you rank. Beat last week by 10% for a +{d.rules.improvementBonus} personal-best bonus.</p>
              <div className="mt-3 grid grid-cols-4 gap-1.5">{d.rules.tiers.map((t) => <div key={t.key} className="rounded-2xl bg-walkie-light p-2 text-center"><span className={`mx-auto block h-7 w-7 rounded-full bg-gradient-to-br ${TIER_STYLE[t.key] ?? "from-walkie-pale to-walkie-soft"}`} /><p className="mt-1 text-[11px] font-extrabold">{title(t.key.toLowerCase())}</p><p className="text-[10px] text-walkie-muted">{t.min.toLocaleString()}+</p><p className="text-[10px] font-bold"><Coin size={9} className="inline" /> {t.coins}</p></div>)}</div>
              <p className="mt-3 text-[12px] text-walkie-muted"><b className="text-walkie-ink">Public podium</b> (Overall): weekly {d.rules.weeklyTop.join(" / ")} coins · monthly {d.rules.monthlyTop.join(" / ")} coins, and the monthly champion earns the exclusive <b>Champion laurel</b> for their Walkie.</p>
            </section>
          </>
        )}
      </div>

      {/* my position */}
      {d?.me && d.me.rank && !d.needs && (
        <div className="fixed inset-x-0 bottom-[calc(76px+var(--safe-bottom))] z-20 mx-auto max-w-lg px-3">
          <div className="flex items-center gap-3 rounded-2xl bg-walkie-ink px-4 py-2.5 text-white shadow-lift animate-fade-up">
            <span className="font-display text-[20px] font-semibold">#{d.me.rank}</span>
            <div className="min-w-0 flex-1"><p className="text-[13px] font-bold">You · {fmt(board, d.me.score)} {unit(board)} <Change v={d.me.change} /></p><p className="truncate text-[11px] text-white/70">{d.me.rank === 1 ? "You're leading — amazing!" : d.me.gapToNext != null ? `${fmt(board, d.me.gapToNext)} ${unit(board)} to pass #${d.me.rank - 1}` : ""}</p></div>
            <button onClick={share} className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-bold"><Icon name="share2" size={14} />Share</button>
          </div>
        </div>
      )}

      <Sheet open={sheet === "rules"} onClose={() => setSheet(null)} title="How scoring works">
        {d && <div className="space-y-3 text-[14px] text-walkie-slate">
          <p>Every score is calculated on Walkie's servers from your saved activities — nobody (including you) can edit a score.</p>
          <div className="rounded-2xl bg-walkie-light p-3"><p className="font-bold text-walkie-ink">Overall points (per day)</p><p className="mt-1 text-[13px]">activity points × {d.rules.overall.pointsWeight} + {d.rules.overall.stepsPer1000} per 1,000 synced steps + {d.rules.overall.missionWeight} per mission completed — capped at {d.rules.overall.dailyCap.toLocaleString()} a day.</p><p className="mt-1 text-[12px] text-walkie-muted">Activity points come from active minutes, and walking earns the most per minute, so fast cycling can't dominate Overall. Paused time earns nothing.</p></div>
          <p><b>Walking / Running / Cycling</b> rank verified GPS distance for that sport only. <b>Steps</b> uses steps synced from Apple Health or Health Connect.</p>
          <p><b>Verified vs unverified:</b> {d.rules.includeUnverifiedDistance ? "indoor distances are included." : "indoor and manual distances can't be verified, so they don't count on distance boards."} Activities that fail our speed checks never count.</p>
          <p><b>Resets:</b> days, weeks (starting {d.rules.weekStartsOn === 1 ? "Monday" : "Sunday"}) and months reset at midnight {d.rules.timezone}. Results are settled once and rewards are granted exactly once.</p>
          <p><b>Fair play:</b> unusual scores are reviewed by a person before anything happens — never automatically from one signal.</p>
        </div>}
      </Sheet>
      <PrivacySheet open={sheet === "privacy"} onClose={() => setSheet(null)} privacy={d?.privacy} onSaved={() => { setSheet(null); load(); }} />
      <DuelSheet open={sheet === "duel"} onClose={() => setSheet(null)} friends={friends} onSent={() => { setSheet(null); loadDuels(); }} />
      <DisputeSheet open={sheet === "dispute"} onClose={() => setSheet(null)} disqualificationId={d?.me?.disqualified?.id} period={d?.period} />
    </div>
  );
}

function PrivacySheet({ open, onClose, privacy, onSaved }: { open: boolean; onClose: () => void; privacy?: Data["privacy"]; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ leaderboardOptIn: false, publicName: "", country: "", community: "", showPhotoOnBoards: false, notifyCompetition: true });
  useEffect(() => { if (open) api<{ profile: Record<string, unknown> }>("/api/me").then((m) => { const p = m.profile as any; setF({ leaderboardOptIn: !!p.leaderboardOptIn, publicName: p.publicName ?? "", country: p.country ?? "", community: p.community ? title(p.community) : "", showPhotoOnBoards: !!p.showPhotoOnBoards, notifyCompetition: p.notifyCompetition !== false }); }).catch(() => {}); }, [open]);
  const save = async () => {
    try { await api("/api/me/profile", { method: "PATCH", body: { leaderboardOptIn: f.leaderboardOptIn, publicName: f.publicName.trim() || null, country: f.country || null, community: f.community.trim() || null, showPhotoOnBoards: f.showPhotoOnBoards, notifyCompetition: f.notifyCompetition } }); toast("success", "Saved"); onSaved(); }
    catch (e: any) { toast("error", e.message); }
  };
  const T = ({ k, label, sub }: { k: "leaderboardOptIn" | "showPhotoOnBoards" | "notifyCompetition"; label: string; sub: string }) => (
    <label className="flex items-center gap-3 py-2"><span className="flex-1"><span className="block text-[14px] font-bold">{label}</span><span className="block text-[12px] text-walkie-muted">{sub}</span></span><input type="checkbox" className="h-6 w-6 accent-walkie-blue" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} /></label>
  );
  void privacy;
  return (
    <Sheet open={open} onClose={onClose} title="Leaderboard privacy" footer={<button className="btn-primary w-full" onClick={save}>Save</button>}>
      <T k="leaderboardOptIn" label="Appear on public boards" sub="Global, country & community. Friends boards follow your activity visibility." />
      <label className="mt-1 block"><span className="label">Display name</span><input className="input" maxLength={24} value={f.publicName} onChange={(e) => setF({ ...f, publicName: e.target.value })} placeholder="Default: first name + initial" /></label>
      <label className="mt-2 block"><span className="label">Country (optional)</span><select className="input" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}><option value="">Not set</option>{COUNTRIES.map((c) => <option key={c} value={c}>{flag(c)} {countryName(c)}</option>)}</select></label>
      <label className="mt-2 block"><span className="label">Community (optional)</span><input className="input" maxLength={40} value={f.community} onChange={(e) => setF({ ...f, community: e.target.value })} placeholder="e.g. Makati Walkers, your school or town" /></label>
      <p className="mt-1 text-[11px] text-walkie-muted">You choose these yourself — Walkie never uses your GPS or address for leaderboards.</p>
      <T k="showPhotoOnBoards" label="Show my profile photo" sub="Off: your Walkie is your avatar" />
      <T k="notifyCompetition" label="Competition notifications" sub="Results, cheers and challenge invites" />
    </Sheet>
  );
}

function DuelSheet({ open, onClose, friends, onSent }: { open: boolean; onClose: () => void; friends: { id: string; name: string }[]; onSent: () => void }) {
  const toast = useToast();
  const [to, setTo] = useState(""); const [metric, setMetric] = useState("STEPS"); const [days, setDays] = useState(3);
  return (
    <Sheet open={open} onClose={onClose} title="Challenge a friend" footer={<button className="btn-primary w-full" disabled={!to} onClick={async () => { try { await api("/api/duels", { body: { opponentId: to, metric, days } }); toast("success", "Challenge sent!"); onSent(); } catch (e: any) { toast("error", e.message); } }}>Send challenge</button>}>
      {friends.length === 0 ? <p className="text-[14px] text-walkie-muted">Add friends first — then you can challenge them here.</p> : <>
        <p className="label">Friend</p><div className="flex flex-wrap gap-1.5">{friends.map((f) => <button key={f.id} onClick={() => setTo(f.id)} className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${to === f.id ? "bg-walkie-blue text-white" : "bg-white shadow-card"}`}>{f.name}</button>)}</div>
        <p className="label mt-3">Most…</p><div className="flex flex-wrap gap-1.5">{[["STEPS", "Steps"], ["WALK", "Km walked"], ["RUN", "Km run"], ["BIKE", "Km ridden"], ["POINTS", "Activity points"]].map(([k, l]) => <button key={k} onClick={() => setMetric(k)} className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${metric === k ? "bg-walkie-blue text-white" : "bg-white shadow-card"}`}>{l}</button>)}</div>
        <p className="label mt-3">For</p><div className="flex gap-1.5">{[1, 3, 7].map((n) => <button key={n} onClick={() => setDays(n)} className={`flex-1 rounded-full py-2 text-[13px] font-bold ${days === n ? "bg-walkie-blue text-white" : "bg-white shadow-card"}`}>{n} day{n > 1 ? "s" : ""}</button>)}</div>
        <p className="mt-3 text-[12px] text-walkie-muted">Starts when they accept. Both of you earn coins for taking part; the winner gets a little extra.</p>
      </>}
    </Sheet>
  );
}

function DisputeSheet({ open, onClose, disqualificationId, period }: { open: boolean; onClose: () => void; disqualificationId?: string; period?: string }) {
  const toast = useToast(); const [text, setText] = useState("");
  return (
    <Sheet open={open} onClose={onClose} title="Ask for a review" footer={<button className="btn-primary w-full" disabled={text.trim().length < 10} onClick={async () => { try { const r = await api<{ message: string }>("/api/leaderboard/dispute", { body: { text, disqualificationId, period } }); toast("success", r.message); onClose(); setText(""); } catch (e: any) { toast("error", e.message); } }}>Send</button>}>
      <p className="text-[13px] text-walkie-muted">Tell us about the activities in question (e.g. a long ride or a race). A person will take a look.</p>
      <textarea className="input mt-2 w-full py-3" rows={4} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
    </Sheet>
  );
}

export function LeaderboardClient() {
  return <Suspense fallback={<Loading />}><Inner /></Suspense>;
}
