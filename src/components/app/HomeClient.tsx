"use client";
import { sfx } from "@/lib/client/sfx";
import Link from "next/link";
import { AppIcon, type AppIconName } from "../ui/AppIcon";
import { Scene, useTod } from "./Scene";
import { MyWalkie } from "../mascot/MyWalkie";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { HomeData } from "@/lib/queries/home";
import { Walkie, type Mood } from "../mascot/Walkie";
import { PetArt } from "../mascot/PetArt";
import { Icon, Coin } from "../ui/Icon";
import { Ring, Bar } from "../ui/Progress";
import { useToast } from "../ui/Toast";
import { useCelebrate } from "../ui/Celebrate";
import { api } from "@/lib/client/api";
import { num, dist, distUnit, dayLetter } from "@/lib/format";
import { ShopMini } from "./ShopMini";
import { ActivityPicker } from "./ActivityPicker";

const MOOD_LINE: Record<string, string> = {
  greet: "is ready for today's adventure.",
  idle: "is wagging — shall we go for a walk?",
  happy: "loved that last outing!",
  celebrate: "is doing zoomies — goal smashed!",
  sit: "is sitting by the door with the leash…",
  sleep: "is snoozing. See you tomorrow!",
};

export function HomeClient({ data }: { data: HomeData; onboarded?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const celebrate = useCelebrate();
  const tod = useTod();
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const [pick, setPick] = useState(false);
  const refresh = () => start(() => router.refresh());
  const { today, ctx } = data;
  const greeting = ctx.hour < 12 ? "Good morning" : ctx.hour < 18 ? "Good afternoon" : "Good evening";
  const petName = data.pet?.nickname ?? "Walkie";
  const mood = data.mood;

  async function claimDaily() {
    setBusy("daily");
    try {
      const r = await api<{ day: number; coins: number; xp: number; items: { name: string; qty: number }[]; leveledUp: boolean; level: number }>("/api/daily-reward/claim", { method: "POST" });
      celebrate({ title: `Day ${r.day} reward!`, body: r.items.length ? r.items.map((i) => `${i.qty}× ${i.name}`).join(", ") : "Walkie found some coins on the path.", coins: r.coins, xp: r.xp, mood: "reward" });
      if (r.leveledUp) setTimeout(() => celebrate({ title: `Level ${r.level}!`, body: "New pets and items may be waiting.", mood: "levelup" }), 2600);
      refresh();
    } catch (e: any) { toast("error", e.message); } finally { setBusy(null); }
  }
  async function claimMission(id: string, title: string) {
    setBusy(id);
    try {
      const r = await api<{ coins: number; xp: number; leveledUp: boolean; level: number; discoveredPets: { key: string; name: string }[] }>(`/api/missions/${id}/claim`, { method: "POST" });
      toast("success", `${title} · +${r.coins} coins`); sfx("coins");
      if (r.discoveredPets?.[0]) celebrate({ title: `You found a ${r.discoveredPets[0].name}!`, species: r.discoveredPets[0].key, body: "Say hi in your collection." });
      else if (r.leveledUp) celebrate({ title: `Level ${r.level}!`, mood: "levelup" });
      refresh();
    } catch (e: any) { toast("error", e.message); } finally { setBusy(null); }
  }

  const stepP = today.steps / Math.max(1, today.goals.steps);
  const weekMax = Math.max(30, ...data.week.map((d) => d.activeMinutes));
  const units = ctx.units;

  return (
    <div className="px-4 pt-[calc(14px+var(--safe-top))]">
      {/* header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link href="/app/profile" className="focus-ring grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white shadow-card" aria-label="Profile">
            {data.user.avatarUrl ? <img src={data.user.avatarUrl} alt="" className="h-full w-full object-cover" /> : <PetArt species={data.pet?.species ?? "husky"} size={44} mood="sit" />}
          </Link>
          <div>
            <p className="font-display text-[22px] font-semibold leading-none">Walkie</p>
            <p className="text-[12px] font-bold text-walkie-muted">Level {data.wallet?.level ?? 1} · {num(today.points)} pts today</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-sm font-extrabold shadow-card tabular" title="Coins"><Coin size={18} />{num(data.wallet?.coins ?? 0)}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-extrabold shadow-card ${data.streak.activeToday ? "bg-walkie-blue text-white" : "bg-white text-walkie-slate"}`} title="Day streak"><Icon name="flame" size={17} fill={data.streak.activeToday ? "rgba(255,255,255,.3)" : "none"} />{data.streak.current}</span>
          <Link href="/app/notifications" className="focus-ring relative grid h-10 w-10 place-items-center rounded-full bg-white text-walkie-slate shadow-card" aria-label={`Notifications${data.unread ? `, ${data.unread} unread` : ""}`}>
            <Icon name="bell" size={20} />
            {data.unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-400 ring-2 ring-white" />}
          </Link>
        </div>
      </header>

      {/* week strip */}
      <div className="mt-4 grid grid-cols-7 gap-1.5" aria-label="This week">
        {data.week.map((d) => {
          const isToday = d.date === ctx.today;
          return (
            <div key={d.date} className="flex flex-col items-center gap-1">
              <span className={`text-[11px] font-extrabold ${isToday ? "text-walkie-blue" : "text-walkie-muted"}`}>{dayLetter(d.date)}</span>
              <span className={`grid h-10 w-10 place-items-center rounded-full ${d.goalMet ? "bg-walkie-blue text-white" : d.activeMinutes > 0 ? "bg-walkie-soft/60 text-walkie-slate" : d.future ? "bg-white/60 text-walkie-gray" : "bg-white text-walkie-gray"} ${isToday ? "ring-2 ring-walkie-blue ring-offset-2 ring-offset-walkie-light" : ""}`}>
                <Icon name="paw" size={18} fill={d.goalMet ? "rgba(255,255,255,.9)" : "currentColor"} strokeWidth={0} />
              </span>
            </div>
          );
        })}
      </div>

      {!data.user.emailVerified && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-butter/70 px-4 py-3 text-[13px] font-semibold text-amber-900">
          <Icon name="mail" size={18} /> <span className="flex-1">Check your inbox to verify your email.</span>
          <button className="font-extrabold underline" onClick={async () => { try { await api("/api/auth/verify/resend", { method: "POST" }); toast("success", "Verification email sent"); } catch (e: any) { toast("error", e.message); } }}>Resend</button>
        </div>
      )}

      {/* hero */}
      <section className="card mt-4 overflow-hidden">
        <div className="relative overflow-hidden px-5 pb-4 pt-5">
          <Scene />
          {tod !== "night" && <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/70 to-transparent" />}
          <div className={`relative ${tod === "night" ? "text-white [&_.eyebrow]:text-white/75" : ""}`}>
          <p className="eyebrow">{greeting}</p>
          <h1 className="mt-0.5 font-display text-[26px] font-semibold leading-tight">{greeting.split(" ")[1] === "morning" ? "Rise and shine" : "Hey"}, {data.user.name}!</h1>
          <p className={`mt-1 max-w-[58%] text-[14px] font-semibold ${tod === "night" ? "text-white/85" : "text-walkie-slate"}`}>{petName} {MOOD_LINE[mood] ?? MOOD_LINE.idle}</p>
          {(!data.pet || data.pet.species === "husky") && <Link href="/app/wardrobe" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 py-1.5 pl-1.5 pr-3 text-[12px] font-bold text-walkie-slate shadow-card backdrop-blur"><AppIcon name="wardrobe" size={22} />Dress up</Link>}
          </div>
          <div className="absolute -bottom-1 right-1">
            {data.pet && data.pet.species !== "husky" ? <PetArt species={data.pet.species} mood={mood as Mood} size={150} /> : <MyWalkie living interactive mood={mood as Mood} size={150} />}
          </div>
          <div className="h-10" />
        </div>
        <div className="flex items-center gap-4 border-t border-walkie-light px-5 py-4">
          <Ring value={stepP} size={96} stroke={11} label="Daily step goal">
            <div><p className="font-display text-xl font-semibold leading-none tabular">{Math.min(999, Math.round(stepP * 100))}%</p><p className="text-[10px] font-bold text-walkie-muted">of goal</p></div>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[38px] font-semibold leading-none tabular">{num(today.steps)}</p>
            <p className="mt-1 text-[13px] font-semibold text-walkie-muted">of {num(today.goals.steps)} steps{today.stepsSource === "ESTIMATED" && <span title="Estimated from your tracked walks and runs. Connect Apple Health or Health Connect in the mobile app for all-day steps."> · est.</span>}</p>
            {today.stepsSource == null && today.steps === 0 && <p className="mt-1 text-[12px] text-walkie-muted">Track a walk, or connect Health in the mobile app for all-day steps.</p>}
          </div>
        </div>
      </section>

      {/* stats */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        {[
          { label: "Walked", value: dist(today.walkDistanceM, units), unit: distUnit(units), icon: "walk", tint: "" },
          { label: "Ran", value: dist(today.runDistanceM, units), unit: distUnit(units), icon: "run", tint: "" },
          { label: "Rode", value: dist(today.bikeDistanceM, units), unit: distUnit(units), icon: "bike", tint: "" },
          { label: "Active", value: String(today.activeMinutes), unit: `min · ${num(today.calories)} kcal`, icon: "calories", tint: "", progress: today.activeMinutes / today.goals.activeMin },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center justify-between"><span className="text-[13px] font-bold text-walkie-muted">{s.label}</span><AppIcon name={s.icon as AppIconName} size={34} /></div>
            <p className="mt-2 font-display text-[28px] font-semibold leading-none tabular">{s.value}<span className="ml-1 text-[13px] font-bold text-walkie-muted">{s.unit}</span></p>
            {"progress" in s && s.progress != null && <Bar value={s.progress} className="mt-2.5" height={6} color="#5DBE9A" />}
          </div>
        ))}
      </section>

      <button onClick={() => setPick(true)} className="btn-primary mt-4 h-14 w-full text-[17px]"><Icon name="play" size={20} fill="currentColor" /> Start activity</button>
      <ActivityPicker open={pick} onClose={() => setPick(false)} />

      {/* daily reward */}
      <section className="card mt-4 p-5">
        <div className="flex items-center justify-between">
          <div><h2 className="font-display text-lg font-semibold">Daily treat</h2><p className="text-[13px] text-walkie-muted">{data.reward.claimedToday ? "Claimed — come back tomorrow!" : `Day ${data.reward.day} of 7`}</p></div>
          <button className="btn-primary" disabled={data.reward.claimedToday || busy === "daily"} onClick={claimDaily}><Icon name="gift" size={18} />{data.reward.claimedToday ? "Claimed" : "Claim"}</button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {data.reward.cycle.map((c) => {
            const done = c.day < data.reward.day || (data.reward.claimedToday && c.day === data.reward.day);
            const next = c.day === data.reward.day && !data.reward.claimedToday;
            return (
              <div key={c.day} className={`flex flex-col items-center rounded-2xl py-2 text-[10px] font-extrabold ${done ? "bg-walkie-blue text-white" : next ? "bg-butter text-amber-800 ring-2 ring-amber-300" : "bg-walkie-light text-walkie-muted"}`} title={c.label}>
                {c.hasItem ? <Icon name="gift" size={16} /> : <Coin size={16} />}
                <span className="mt-0.5">{c.day === 7 ? "★" : `D${c.day}`}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* missions */}
      <section className="mt-6">
        <div className="mb-2 flex items-end justify-between px-1"><h2 className="font-display text-xl font-semibold">Today's missions</h2><Link href="/app/explore#missions" className="text-sm font-bold text-walkie-blue">All</Link></div>
        <div className="card divide-y divide-walkie-light">
          {data.missions.filter((m) => !m.locked).map((m) => {
            const p = m.progress / m.target;
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
                {m.completed ? <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-mint text-emerald-700"><Icon name="check" size={20} /></span> : <AppIcon name={missionAppIcon(m.kind)} size={40} />}
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[15px] font-bold ${m.claimed ? "text-walkie-muted line-through" : ""}`}>{m.title}</p>
                  <div className="mt-1.5 flex items-center gap-2"><Bar value={p} height={6} color={m.completed ? "#5DBE9A" : "#6B8FD6"} /><span className="shrink-0 text-[11px] font-bold text-walkie-muted tabular">{fmtMission(m.kind, m.progress)}/{fmtMission(m.kind, m.target)}</span></div>
                </div>
                {m.completed && !m.claimed ? (
                  <button className="btn-primary min-h-[36px] px-3.5 text-sm" disabled={busy === m.id} onClick={() => claimMission(m.id, m.title)}><Coin size={16} />{m.rewardCoins}</button>
                ) : (
                  <span className={`inline-flex items-center gap-1 text-[13px] font-extrabold ${m.claimed ? "text-emerald-600" : "text-walkie-muted"}`}>{m.claimed ? <Icon name="check" size={16} /> : <Coin size={15} />}{m.claimed ? "" : m.rewardCoins}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* weekly chart */}
      <section className="card mt-6 p-5">
        <div className="flex items-end justify-between"><div><h2 className="font-display text-lg font-semibold">This week</h2><p className="text-[13px] text-walkie-muted">{data.week.reduce((t, d) => t + d.activeMinutes, 0)} active minutes</p></div><Link href="/app/insights" className="text-sm font-bold text-walkie-blue">Insights</Link></div>
        <div className="mt-4 flex h-32 items-end gap-2">
          {data.week.map((d) => {
            const h = d.activeMinutes / weekMax;
            const isToday = d.date === ctx.today;
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="relative flex h-24 w-full items-end">
                  <div className={`w-full rounded-[12px] transition-all duration-700 ${isToday ? "bg-walkie-blue" : d.goalMet ? "bg-walkie-soft" : "bg-walkie-gray/70"}`} style={{ height: `${Math.max(8, h * 100)}%` }} title={`${d.activeMinutes} min`} />
                </div>
                <span className={`text-[11px] font-extrabold ${isToday ? "text-walkie-blue" : "text-walkie-muted"}`}>{dayLetter(d.date)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* pet shop teaser */}
      <Link href="/app/shop" className="card mt-4 flex items-center gap-3 overflow-hidden p-4 transition active:scale-[.99]">
        <ShopMini size={130} className="-my-2 -ml-2 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold">Your pet shop</h2>
          <p className="text-[13px] text-walkie-muted">Every walk earns coins to decorate and grow it.</p>
          <span className="btn-soft mt-2 min-h-[34px] px-4 text-sm">Open shop</span>
        </div>
      </Link>
      <div className="h-6" />
    </div>
  );
}

export function missionIcon(kind: string) {
  return ({ STEPS: "paw", WALK_DISTANCE: "walk", RUN_DISTANCE: "run", RUN_DURATION: "run", ACTIVE_MINUTES: "clock", ACTIVITY_COUNT: "bolt", FEED_PET: "bowl", PLAY_PET: "ball", VISIT_SHOP: "store" } as Record<string, string>)[kind] ?? "star";
}
export function fmtMission(kind: string, v: number) {
  if (kind === "WALK_DISTANCE" || kind === "RUN_DISTANCE") return v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}km` : `${v}m`;
  if (kind === "STEPS") return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
  if (kind === "RUN_DURATION" || kind === "ACTIVE_MINUTES") return `${v}m`;
  return String(v);
}

function missionAppIcon(kind: string): AppIconName {
  if (kind.startsWith("BIKE")) return "bike";
  if (kind.startsWith("RUN")) return "run";
  if (kind.includes("STEPS")) return "steps";
  if (kind.includes("DISTANCE")) return "distance";
  if (kind.includes("STREAK")) return "streak";
  if (kind.includes("PET")) return "pets";
  if (kind.includes("SHOP") || kind.includes("PLACE") || kind.includes("BUY")) return "shop";
  if (kind.includes("POINTS")) return "reward";
  if (kind.includes("FRIEND") || kind.includes("INVITE")) return "friends";
  if (kind.includes("WALK")) return "walk";
  return "mission";
}
