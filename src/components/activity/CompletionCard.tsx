"use client";
import Link from "next/link";
import { MyWalkie } from "../mascot/MyWalkie";
import { useEffect, useRef, useState } from "react";
import { ACTIVITY_META, FAMILY_META, type ActivityType } from "@/lib/constants";
import { formatDuration, formatPace, formatSpeed } from "@/lib/fitness";
import { dist, distUnit } from "@/lib/format";
import { Walkie, type Mood } from "../mascot/Walkie";
import { Icon, Coin } from "../ui/Icon";
import { Bar } from "../ui/Progress";
import { RouteMap } from "./RouteMap";
import { ShareSheet } from "./ShareSheet";

export type CompletionData = {
  activity: { id: string; type: string; title?: string | null; startedAt: string; distanceM: number; durationSec: number; avgPaceSecKm: number | null; avgSpeedMps: number | null; maxSpeedMps?: number | null; calories: number; estimatedSteps?: number | null; elevationGainM?: number | null; points: number; coinsAwarded: number; xpAwarded: number; records?: string[] | null; status: string; flagReason?: string | null };
  route: [number, number][];
  userName: string;
  units: "metric" | "imperial";
  petHappiness?: number;
  petXp?: number;
  petName?: string;
  missions?: { title: string; progress: number; target: number; completed: boolean }[];
  shop?: { coins: number; nextExpansion: number | null };
  streak?: number | null;
  bonus?: { streakBonus: number; recordBonus: number; capped: boolean } | null;
  fresh?: boolean; // just finished → play entrance animations
};

const RECORD_LABEL: Record<string, string> = { LONGEST_WALK: "Longest walk", LONGEST_RUN: "Longest run", LONGEST_RIDE: "Longest ride", LONGEST_WORKOUT: "Longest workout", FASTEST_1K: "Fastest 1K", FASTEST_5K: "Fastest 5K", MOST_ELEVATION: "Most climbing", LONGEST_WALK_TIME: "Longest walk time", LONGEST_RUN_TIME: "Longest run time", LONGEST_RIDE_TIME: "Longest ride time", LONGEST_WORKOUT_TIME: "Longest session" };

export function reaction(type: string, distanceM: number, durationSec: number, records: string[]): { text: string; mood: Mood } {
  const f = ACTIVITY_META[type as ActivityType]?.family ?? "other";
  if (records.length) return { text: "NEW RECORD! Walkie is jumping with excitement!", mood: "jump" };
  if ((f === "bike" && distanceM >= 40000) || (f !== "bike" && distanceM >= 10000) || durationSec >= 5400) return { text: "Wow! Look how far we went!", mood: "celebrate" };
  if (f === "run") return { text: "You were so fast! I'm proud of you!", mood: "happy" };
  if (f === "bike") return { text: "What a wonderful adventure!", mood: "happy" };
  if (f === "walk") return { text: "That was a lovely walk!", mood: "happy" };
  return { text: "Every bit of movement counts. Great job!", mood: "happy" };
}

function CountUp({ to, run, prefix = "+" }: { to: number; run: boolean; prefix?: string }) {
  const [v, setV] = useState(run ? 0 : to);
  useEffect(() => {
    if (!run || typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(to); return; }
    let raf = 0; const t0 = performance.now(); const d = 1100;
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / d); setV(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    const delay = setTimeout(() => (raf = requestAnimationFrame(tick)), 500);
    return () => { clearTimeout(delay); cancelAnimationFrame(raf); };
  }, [to, run]);
  return <>{prefix}{v.toLocaleString()}</>;
}

export function CompletionCard({ d }: { d: CompletionData }) {
  const a = d.activity;
  const meta = ACTIVITY_META[a.type as ActivityType] ?? ACTIVITY_META.FREE_WORKOUT;
  const fam = FAMILY_META[meta.family];
  const records = (a.records ?? []) as string[];
  const r = reaction(a.type, a.distanceM, a.durationSec, records);
  const [share, setShare] = useState(false);
  const u = d.units;
  const isBike = meta.family === "bike";
  const greet = { walk: "walk", run: "run", bike: "ride", other: "workout" }[meta.family];
  const flagged = a.status === "FLAGGED";

  // Only show statistics that were actually recorded.
  const tiles: { icon: string; label: string; value: string; unit?: string }[] = [];
  if (a.distanceM > 0) tiles.push({ icon: "map", label: "Distance", value: dist(a.distanceM, u, 2), unit: distUnit(u) });
  tiles.push({ icon: "clock", label: "Duration", value: formatDuration(a.durationSec) });
  if (!isBike && a.avgPaceSecKm) tiles.push({ icon: "bolt", label: "Avg. pace", value: formatPace(a.avgPaceSecKm, u), unit: `/${distUnit(u)}` });
  if (a.avgSpeedMps) tiles.push({ icon: "bolt", label: isBike ? "Avg. speed" : "Avg. speed", value: formatSpeed(a.avgSpeedMps, u), unit: u === "imperial" ? "mph" : "km/h" });
  if (isBike && a.maxSpeedMps) tiles.push({ icon: "run", label: "Max speed", value: formatSpeed(a.maxSpeedMps, u), unit: u === "imperial" ? "mph" : "km/h" });
  if (!isBike && a.estimatedSteps) tiles.push({ icon: "paw", label: "Steps (est.)", value: a.estimatedSteps.toLocaleString() });
  if (a.elevationGainM != null && a.elevationGainM > 0) tiles.push({ icon: "mountain", label: "Elevation", value: String(Math.round(a.elevationGainM)), unit: "m" });
  tiles.push({ icon: "flame", label: "Calories", value: String(a.calories), unit: "kcal est." });

  const rewards = [
    { icon: <Icon name="paw" size={20} className="text-amber-500" fill="currentColor" strokeWidth={0} />, label: "Points", value: a.points },
    { icon: <Icon name="star" size={20} className="text-amber-400" fill="currentColor" strokeWidth={0} />, label: "EXP", value: a.xpAwarded },
    { icon: <Coin size={20} />, label: "Coins", value: a.coinsAwarded },
    ...(d.petHappiness ? [{ icon: <Icon name="heart" size={20} className="text-rose-400" fill="currentColor" strokeWidth={0} />, label: `${d.petName ?? "Walkie"}'s happiness`, value: d.petHappiness }] : []),
  ];

  const shopLine = d.shop?.nextExpansion ? `${Math.max(0, d.shop.nextExpansion - d.shop.coins).toLocaleString()} coins until your shop can expand` : "You're getting more active and your pet shop is growing!";

  return (
    <div className="relative">
      {/* Scenic header */}
      <div className="relative h-[230px] overflow-hidden rounded-b-[40px] bg-gradient-to-b from-[#CFE2FA] via-[#E4EFFB] to-[#F1F7FD] sm:rounded-[40px]">
        <svg viewBox="0 0 400 230" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax slice" aria-hidden>
          <path d="M0 150 L60 96 L110 140 L170 80 L240 138 L300 100 L400 150 V230 H0Z" fill="#C7D7EE" />
          <path d="M150 92 l20 -12 l14 12z M286 108 l14 -8 l12 10z" fill="#fff" opacity=".9" />
          <path d="M0 170 Q100 130 200 165 T400 160 V230 H0Z" fill="#CFE8C4" />
          <path d="M140 230 Q190 180 260 172 Q330 166 400 178 V230Z" fill="#E6D3B8" />
          <g transform="translate(300 118)"><path d="M0 34 l34 -16 l34 16 v30 h-68z" fill="#A9C5ED" /><path d="M-6 36 l40 -22 l40 22" fill="#6B8FD6" /><rect x="26" y="46" width="16" height="18" fill="#425A7C" /><path d="M2 40 h64" stroke="#fff" strokeWidth="5" strokeDasharray="7 5" /><circle cx="34" cy="26" r="6" fill="#fff" /></g>
          <g transform="translate(70 150)"><rect x="18" y="0" width="4" height="24" fill="#A57A4E" /><path d="M2 2 h36 l-6 12 h-30z" fill="#D7B48A" /><circle cx="20" cy="8" r="3" fill="#fff" /></g>
          {[[26, 190], [52, 205], [120, 196], [360, 196], [380, 210]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}>{[0, 72, 144, 216, 288].map((r) => <ellipse key={r} rx="3" ry="5" transform={`rotate(${r}) translate(0 -4)`} fill={i % 2 ? "#F9D9E5" : "#fff"} />)}<circle r="2.5" fill="#F2C94C" /></g>)}
          {[[60, 30], [340, 42]].map(([x, y], i) => <path key={i} className="animate-floaty" style={{ animationDelay: `${i}s` }} d={`M${x} ${y - 8} l2.5 5.5 5.5 2.5 -5.5 2.5 -2.5 5.5 -2.5 -5.5 -5.5 -2.5 5.5 -2.5z`} fill="#F2C94C" />)}
        </svg>
        <div className="absolute left-4 top-[calc(14px+var(--safe-top))] flex items-center gap-1.5 font-display text-[15px] font-semibold text-walkie-slate"><Icon name="paw" size={18} fill="#6B8FD6" strokeWidth={0} /> Walkie.run</div>
        <div className={`absolute left-4 top-[calc(44px+var(--safe-top))] ${d.fresh ? "animate-fade-up" : ""}`}>
          <h1 className="font-display text-[30px] font-semibold leading-none text-walkie-ink [text-shadow:0_2px_0_#fff]">{flagged ? "Activity saved" : "Activity Complete!"}</h1>
          <p className="mt-2 inline-block rounded-full bg-white px-3.5 py-1.5 font-display text-[15px] font-semibold text-walkie-slate shadow-card">{flagged ? `Saved, ${d.userName}` : `Great ${greet}, ${d.userName}!`}</p>
        </div>
        <div className={`absolute -bottom-3 right-2 ${d.fresh ? "animate-pop" : ""}`}><MyWalkie living mood={flagged ? "sad" : isBike ? "bike" : r.mood} size={190} /></div>
      </div>

      <div className="relative -mt-6 px-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ background: fam.color }}><Icon name={meta.icon} size={26} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[20px] font-semibold leading-tight">{a.title || meta.label}</p>
              <p className="text-[13px] text-walkie-muted">{new Date(a.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
            </div>
            {records.length > 0 && <span className="shrink-0 animate-pop rounded-full bg-butter px-3 py-1.5 text-[13px] font-extrabold text-amber-800 ring-1 ring-amber-300" title={records.map((x) => RECORD_LABEL[x] ?? x).join(", ")}>🏆 New Record!</span>}
          </div>
          {flagged && <p className="mt-3 rounded-2xl bg-butter/70 px-3 py-2 text-[13px] font-semibold text-amber-900">No rewards for this one: {a.flagReason}. Contact support if that looks wrong.</p>}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tiles.map((t, i) => (
              <div key={t.label} className={`rounded-2xl border border-walkie-gray/70 bg-white px-3 py-2.5 ${d.fresh ? "animate-fade-up" : ""}`} style={{ animationDelay: `${150 + i * 60}ms` }}>
                <p className="flex items-center gap-1.5 text-[12px] font-bold text-walkie-muted"><Icon name={t.icon} size={15} className="text-walkie-blue" />{t.label}</p>
                <p className="mt-0.5 font-display text-[24px] font-semibold leading-tight tabular">{t.value}{t.unit && <span className="ml-1 text-[12px] font-bold text-walkie-muted">{t.unit}</span>}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
            {meta.gps ? <RouteMap points={d.route} height={200} /> : <div className="grid h-[200px] place-items-center rounded-3xl bg-walkie-pale text-center text-[13px] font-semibold text-walkie-muted"><span><Icon name={meta.icon} size={34} className="mx-auto text-walkie-blue" />{meta.label}<br />no GPS route for indoor activities</span></div>}
            <div className="rounded-3xl border border-walkie-gray/70 p-4">
              <p className="flex items-center gap-2 font-display text-lg font-semibold"><Icon name="gift" size={20} className="text-walkie-blue" />Walkie Rewards</p>
              <ul className="mt-2 divide-y divide-walkie-light">
                {rewards.map((x) => (
                  <li key={x.label} className="flex items-center gap-2 py-2"><span className="w-6">{x.icon}</span><span className="flex-1 text-[14px] font-semibold">{x.label}</span><span className="min-w-[56px] rounded-full bg-walkie-blue px-2.5 py-1 text-center font-display text-[14px] font-semibold text-white tabular"><CountUp to={x.value} run={!!d.fresh} /></span></li>
                ))}
              </ul>
              {d.bonus && (d.bonus.streakBonus > 0 || d.bonus.recordBonus > 0) && <p className="mt-1 text-[11px] font-semibold text-walkie-muted">Includes {d.bonus.streakBonus ? `+${d.bonus.streakBonus} streak bonus` : ""}{d.bonus.streakBonus && d.bonus.recordBonus ? " · " : ""}{d.bonus.recordBonus ? `+${d.bonus.recordBonus} record bonus` : ""}</p>}
              {d.bonus?.capped && <p className="mt-1 text-[11px] font-semibold text-amber-700">Daily point limit reached — the rest of today is just for fun!</p>}
              {d.petXp ? <p className="mt-1 text-[12px] font-bold text-walkie-muted">{d.petName ?? "Walkie"} gained {d.petXp} pet XP</p> : null}
            </div>
          </div>

          {!flagged && d.missions && d.missions.length > 0 && (
            <div className="mt-3 rounded-3xl bg-walkie-light p-4">
              <p className="text-[13px] font-extrabold text-walkie-slate">Mission progress</p>
              <div className="mt-2 space-y-2">{d.missions.map((m) => <div key={m.title} className="flex items-center gap-2 text-[12px] font-bold"><span className="w-36 truncate">{m.completed ? "✓ " : ""}{m.title}</span><Bar value={m.progress / m.target} height={6} color={m.completed ? "#5DBE9A" : "#6B8FD6"} /></div>)}</div>
            </div>
          )}

          <div className="mt-3 flex items-center gap-3 rounded-3xl bg-walkie-pale p-3 pr-4">
            <MyWalkie mood={r.mood === "jump" ? "celebrate" : "happy"} size={72} className="-my-2 shrink-0" />
            <div className="min-w-0 flex-1"><p className="font-display text-[17px] font-semibold leading-tight text-walkie-ink">{flagged ? "Let's try that one again together!" : r.text}</p><p className="text-[12px] text-walkie-muted">{shopLine} 🏠</p></div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/app/shop" className="btn-soft">Visit pet shop</Link>
            {flagged ? <Link href="/app" className="btn-primary">Back home</Link> : <button className="btn-primary" onClick={() => setShare(true)}><Icon name="share2" size={18} />Share</button>}
          </div>
          <Link href="/app" className="mt-2 block text-center text-[13px] font-bold text-walkie-muted">Back to dashboard</Link>
        </div>
      </div>
      {!flagged && <ShareSheet open={share} onClose={() => setShare(false)} d={d} />}
      <div className="h-8" />
    </div>
  );
}
void useRef;
