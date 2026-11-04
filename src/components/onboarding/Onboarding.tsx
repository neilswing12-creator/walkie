"use client";
/**
 * Walkie first-time user experience. Principles taken from the reference analysis (docs/FTUE_ANALYSIS.md):
 * one decision per screen, auto-advance on single choice (~320 ms dwell), 220 ms crossfades, a shared mascot
 * that glides between "hero" and "peek" positions (380 ms), thin progress bar + back + skip, primed permissions,
 * a tactile micro-game and a plan-building checklist. Progress persists in localStorage and resumes after OAuth.
 */
import Link from "next/link";
import { LOOKS, WARDROBE_BY_KEY, type LookKey } from "@/lib/wardrobe";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Walkie, type Mood } from "../mascot/Walkie";
import { Icon, Coin } from "../ui/Icon";
import { api } from "@/lib/client/api";
import { isNative } from "@/lib/native/platform";
import { enablePush } from "@/lib/native/push";
import { syncHealth } from "@/lib/native/health";
import { ShopMini } from "../app/ShopMini";

type Answers = { adventure?: "walk" | "run" | "bike" | "mixed"; goals: string[]; level?: string; steps: number; petName: string; reminder?: { on: boolean; hour: number }; perms: { health?: string; location?: string }; look?: string };
const STEPS = ["wake", "hello", "intro", "adventure", "goals", "level", "daily", "buddy", "world", "reminders", "permissions", "account", "finish"] as const;
type Step = (typeof STEPS)[number];
const KEY = "walkie.ftue";
const QUESTION_STEPS: Step[] = ["adventure", "goals", "level", "daily", "reminders", "permissions"];
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; } };
const persist = (v: unknown) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } };

export function Onboarding({ authed, userName }: { authed: boolean; userName: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("wake");
  const [a, setA] = useState<Answers>({ goals: [], steps: 6000, petName: "Walkie", perms: {} });
  const [mood, setMood] = useState<Mood>("sleep");
  const [ready, setReady] = useState(false);
  const flow = STEPS.filter((s) => !(authed && s === "account"));
  const idx = flow.indexOf(step);

  useEffect(() => {
    const saved = load();
    if (saved?.a) setA(saved.a);
    if (saved?.step && flow.includes(saved.step)) setStep(saved.step === "account" && authed ? "finish" : saved.step);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (ready) persist({ step, a }); }, [ready, step, a]);
  useEffect(() => {
    const base: Partial<Record<Step, Mood>> = { wake: "sleep", hello: "greet", intro: "walk", adventure: a.adventure === "run" ? "run" : a.adventure === "bike" ? "bike" : a.adventure === "walk" ? "walk" : "idle", goals: "discover", level: "sit", daily: "wag", buddy: "sit", world: "happy", reminders: "idle", permissions: "discover", account: "greet", finish: "celebrate" };
    setMood(base[step] ?? "idle");
  }, [step, a.adventure]);

  const go = useCallback((dir: 1 | -1) => setStep((s) => flow[Math.max(0, Math.min(flow.length - 1, flow.indexOf(s) + dir))]), [flow]);
  const next = () => go(1);
  const autoNext = () => setTimeout(next, 320);
  const hero = ["wake", "hello", "intro", "buddy", "world", "account", "finish"].includes(step);
  const showChrome = idx >= flow.indexOf("adventure") && step !== "finish";
  const progress = Math.max(0, idx - flow.indexOf("intro")) / (flow.length - flow.indexOf("intro") - 1);

  if (!ready) return <div className="min-h-dvh bg-walkie-light" />;
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-lg flex-col overflow-hidden bg-walkie-light" style={{ background: QUESTION_STEPS.includes(step) ? "linear-gradient(162deg, #EAF2FC 0 34%, #F4F6F8 34.2%)" : "radial-gradient(ellipse at 50% 28%, #FFFFFF, #EAF2FC 70%)", transition: "background 380ms ease" }}>
      {/* chrome */}
      <div className={`relative z-20 flex h-14 items-center gap-3 px-4 pt-[var(--safe-top)] transition-opacity duration-200 ${showChrome ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <button onClick={() => go(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white/80 text-walkie-slate" aria-label="Back"><Icon name="back" size={18} /></button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-walkie-gray/70" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Setup progress">
          <div className="h-full rounded-full bg-walkie-blue transition-[width] duration-500 ease-out" style={{ width: `${Math.max(6, progress * 100)}%` }} />
        </div>
        <button onClick={() => setStep(authed ? "finish" : "account")} className={`text-[13px] font-bold text-walkie-muted ${["reminders", "permissions", "goals"].includes(step) ? "" : "invisible"}`}>Skip</button>
      </div>

      {/* shared mascot (glides between hero and peek) */}
      <div className="pointer-events-none absolute left-1/2 top-0 z-10" style={{ transform: hero ? "translate(-50%, 15dvh) scale(1)" : "translate(calc(-50% - min(34vw, 150px)), 46px) scale(.5)", transformOrigin: "50% 0", transition: "transform 380ms cubic-bezier(.2,.8,.2,1)" }}>
        <button className="pointer-events-auto block" aria-label={step === "wake" ? "Tap to wake Walkie" : step === "buddy" ? `Pet ${a.petName}` : "Walkie"} onClick={() => {
          if (step === "wake") { setMood("discover"); setTimeout(() => setMood("greet"), 700); setTimeout(next, 1250); }
          else if (step === "buddy") { setMood("interact"); setTimeout(() => setMood("happy"), 1600); }
        }}>
          <Walkie mood={mood} size={230} look={a.look} accessories={["buddy", "world", "reminders", "permissions", "account", "finish"].includes(step) ? (LOOKS[(a.look ?? "classic") as LookKey] ?? LOOKS.classic).preset.map((k) => ({ key: k, color: WARDROBE_BY_KEY[k].color })) : []} />
        </button>
        {step === "wake" && mood === "discover" && <p className="animate-pop text-center font-display text-3xl font-semibold text-walkie-slate">!!!</p>}
      </div>

      {/* screen content */}
      <section key={step} className="relative z-0 flex flex-1 flex-col px-5 pb-[calc(20px+var(--safe-bottom))]" style={{ animation: "ftue-in 220ms cubic-bezier(.2,.8,.2,1) both" }}>
        {step === "wake" && <Wake />}
        {step === "hello" && <Hero title="Hey there! I'm Walkie!" sub="Ready for a little adventure?" cta="Let's go!" onCta={next} foot={<Link href="/login?next=/app" className="text-[13px] font-bold text-walkie-blue">I already have an account</Link>} />}
        {step === "intro" && <Hero title="Every step helps us grow!" sub="Walk, run or ride in real life. Collect pets, earn rewards and build your own cozy pet shop." cta="Build my adventure" onCta={next} foot={<p className="text-[12px] text-walkie-muted">A few quick questions · Walkie is free · you can change everything later</p>} extra={<ShopMini size={170} className="mx-auto -mt-3" />} />}

        {step === "adventure" && (
          <Q title="What's your favorite way to move?">
            {[["walk", "Walking", "Strolls, hikes & treadmill", "walk"], ["run", "Running", "Jogs, runs & races", "run"], ["bike", "Cycling", "Rides, roads & indoor bikes", "bike"], ["mixed", "A little bit of everything", "Mix it up!", "jump"]].map(([v, t, s, m]) => (
              <Option key={v} selected={a.adventure === v} onClick={() => { setA({ ...a, adventure: v as Answers["adventure"] }); setMood(m as Mood); autoNext(); }} title={t} sub={s} icon={v === "mixed" ? "sparkle" : v} />
            ))}
          </Q>
        )}
        {step === "goals" && (
          <Q title="What would you love to achieve?" sub="Pick up to three — Walkie will tailor missions.">
            <div className="grid grid-cols-2 gap-2.5">
              {[["habit", "Build a walking habit", "🐾"], ["fitness", "Improve fitness", "💪"], ["running", "Start running", "👟"], ["outdoors", "Explore outdoors", "🌲"], ["daily", "Stay active every day", "☀️"], ["pets", "Have fun with pets", "💙"]].map(([v, t, e]) => {
                const on = a.goals.includes(v);
                return <button key={v} onClick={() => { setMood("happy"); setA({ ...a, goals: on ? a.goals.filter((g) => g !== v) : a.goals.length >= 3 ? a.goals : [...a.goals, v] }); }} aria-pressed={on} className={`flex min-h-[96px] flex-col items-start justify-between rounded-3xl p-4 text-left font-bold shadow-card transition duration-200 active:scale-[.97] ${on ? "bg-walkie-blue text-white" : "bg-white"}`}><span className="text-2xl">{e}</span><span className="text-[14px] leading-tight">{t}</span></button>;
              })}
            </div>
            <Cta disabled={!a.goals.length} onClick={next} hint={!a.goals.length ? "Pick at least one goal" : undefined}>{a.goals.length ? `Continue with ${a.goals.length} goal${a.goals.length > 1 ? "s" : ""}` : "Continue"}</Cta>
          </Q>
        )}
        {step === "level" && (
          <Q title="How active are you right now?" sub="No wrong answers — every pup starts somewhere.">
            {[["starting", "Just getting started", "We'll begin gently 🐾"], ["occasional", "Occasionally active", "A walk here and there"], ["regular", "Regularly active", "A few times a week"], ["very", "Very active", "Most days — let's go!"]].map(([v, t, s]) => (
              <Option key={v} selected={a.level === v} onClick={() => { const steps = { starting: 4000, occasional: 6000, regular: 8000, very: 10000 }[v]!; setA({ ...a, level: v, steps }); setMood(v === "very" ? "run" : "happy"); autoNext(); }} title={t} sub={s} />
            ))}
          </Q>
        )}
        {step === "daily" && <Daily value={a.steps} onChange={(steps) => setA({ ...a, steps })} onMood={setMood} onNext={next} />}
        {step === "buddy" && (
          <Hero title="I'll be your walking buddy!" sub={`Tap me for a pat — then pick my name. Let's grow together.`} cta="Be my buddy!" onCta={() => { setMood("celebrate"); setTimeout(next, 900); }} disabled={!a.petName.trim()}
            extra={<>
              <label className="mx-auto mt-1 block w-full max-w-xs"><span className="sr-only">Your husky's name</span><input className="input text-center font-display text-lg font-semibold" maxLength={24} value={a.petName} onChange={(e) => setA({ ...a, petName: e.target.value.replace(/[^\p{L}\p{N} '\-]/gu, "") })} /></label>
              <div className="mx-auto mt-3 w-full max-w-xs" role="radiogroup" aria-label="Pick a look (optional)">
                <p className="text-center text-[12px] font-bold text-walkie-muted">Pick a look <span className="font-semibold">· optional, change anytime</span></p>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">{(Object.keys(LOOKS) as LookKey[]).map((k) => (
                  <button key={k} role="radio" aria-checked={(a.look ?? "classic") === k} onClick={() => { setA({ ...a, look: k }); setMood("interact"); setTimeout(() => setMood("happy"), 900); }}
                    className={`rounded-2xl px-2 py-2 text-[12px] font-bold transition ${(a.look ?? "classic") === k ? "bg-walkie-blue text-white shadow-card" : "bg-white text-walkie-slate shadow-card"}`}>{LOOKS[k].label}</button>
                ))}</div>
              </div>
            </>} />
        )}
        {step === "world" && (
          <Hero title="Every adventure helps your little world grow" cta="Love it!" onCta={next} extra={<WorldBuild />}
            sub={<ul className="mx-auto mt-1 grid max-w-xs gap-1.5 text-left text-[14px] font-semibold text-walkie-slate">{[["walk", "Walk, run & ride to earn rewards"], ["paw", "Collect 14 adorable pets"], ["store", "Decorate your own pet shop"], ["sparkle", "Unlock new places & adventures"]].map(([i, t], n) => <li key={t} className="flex items-center gap-2" style={{ animation: `ftue-in 300ms ${200 + n * 120}ms both` }}><span className="grid h-7 w-7 place-items-center rounded-lg bg-walkie-pale text-walkie-blue"><Icon name={i} size={16} /></span>{t}</li>)}</ul>} />
        )}
        {step === "reminders" && <Reminders a={a} setA={setA} onNext={next} onMood={setMood} />}
        {step === "permissions" && <Permissions a={a} setA={setA} onNext={next} />}
        {step === "account" && <Account answers={a} onDone={() => setStep("finish")} />}
        {step === "finish" && <Finish a={a} userName={userName} onEnter={() => { try { localStorage.removeItem(KEY); } catch {} router.replace("/app"); router.refresh(); }} onMood={setMood} />}
      </section>
    </main>
  );
}

function Wake() {
  return <div className="mt-auto pb-16 text-center"><Icon name="hand" size={28} className="mx-auto animate-floaty text-walkie-slate" /><p className="mt-2 font-display text-xl font-semibold">Tap to wake Walkie</p></div>;
}

function Hero({ title, sub, cta, onCta, foot, extra, disabled }: { title: string; sub?: ReactNode; cta: string; onCta: () => void; foot?: ReactNode; extra?: ReactNode; disabled?: boolean }) {
  return (
    <div className="flex flex-1 flex-col pt-[calc(15dvh+250px)] text-center">
      <h1 className="font-display text-[28px] font-semibold leading-tight">{title}</h1>
      {sub && (typeof sub === "string" ? <p className="mx-auto mt-2 max-w-xs text-[15px] text-walkie-muted">{sub}</p> : <div className="mt-3">{sub}</div>)}
      {extra && <div className="mt-3">{extra}</div>}
      <div className="mt-auto pt-6"><button className="btn-primary h-14 w-full text-[17px]" onClick={onCta} disabled={disabled}>{cta} <Icon name="chevron" size={18} /></button>{foot && <div className="mt-3">{foot}</div>}</div>
    </div>
  );
}

function Q({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return <div className="flex flex-1 flex-col pt-[120px]"><h1 className="font-display text-[26px] font-semibold leading-tight">{title}</h1>{sub && <p className="mt-1 text-[14px] text-walkie-muted">{sub}</p>}<div className="mt-5 flex flex-1 flex-col gap-2.5">{children}</div></div>;
}

function Option({ selected, onClick, title, sub, icon }: { selected: boolean; onClick: () => void; title: string; sub?: string; icon?: string }) {
  return (
    <button onClick={onClick} aria-pressed={selected} className={`flex items-center gap-3 rounded-3xl px-4 py-4 text-left shadow-card transition-colors duration-200 active:scale-[.98] ${selected ? "bg-walkie-blue text-white" : "bg-white"}`}>
      {icon && <span className={`grid h-11 w-11 place-items-center rounded-2xl ${selected ? "bg-white/20" : "bg-walkie-pale text-walkie-blue"}`}><Icon name={icon} size={22} /></span>}
      <span className="flex-1"><span className="block text-[16px] font-bold">{title}</span>{sub && <span className={`block text-[13px] ${selected ? "text-white/80" : "text-walkie-muted"}`}>{sub}</span>}</span>
      {selected && <Icon name="check" size={20} strokeWidth={3} />}
    </button>
  );
}

function Cta({ children, disabled, onClick, hint }: { children: ReactNode; disabled?: boolean; onClick: () => void; hint?: string }) {
  return <div className="mt-auto pt-6">{hint && <p className="mb-2 text-center text-[12px] font-semibold text-walkie-muted">{hint}</p>}<button className="btn-primary h-14 w-full text-[17px]" disabled={disabled} onClick={onClick}>{children} <Icon name="chevron" size={18} /></button></div>;
}

/** Rolling-digit number (per-digit vertical roll with a hint of motion blur). */
function Rolling({ value }: { value: number }) {
  const s = value.toLocaleString("en-US");
  return (
    <span className="inline-flex font-display text-[72px] font-semibold leading-none tabular" aria-live="polite">
      {s.split("").map((ch, i) => /\d/.test(ch) ? (
        <span key={`${s.length}-${i}`} className="relative inline-block h-[1em] w-[0.62em] overflow-hidden">
          <span className="absolute left-0 top-0 flex flex-col transition-transform duration-300 ease-out" style={{ transform: `translateY(-${Number(ch)}em)` }}>{"0123456789".split("").map((d) => <span key={d} className="h-[1em]">{d}</span>)}</span>
        </span>
      ) : <span key={i} className="w-[0.28em]">{ch}</span>)}
    </span>
  );
}

function Daily({ value, onChange, onMood, onNext }: { value: number; onChange: (n: number) => void; onMood: (m: Mood) => void; onNext: () => void }) {
  const drag = useRef<{ x: number; v: number } | null>(null);
  const set = (n: number) => { const v = Math.max(1000, Math.min(25000, Math.round(n / 500) * 500)); onChange(v); onMood(v >= 12000 ? "run" : v >= 7500 ? "happy" : "wag"); navigator.vibrate?.(4); };
  const msg = value <= 4000 ? "A gentle start — perfect! Let's take it one step at a time." : value <= 7500 ? "That's a great goal! Let's take it one step at a time." : value <= 10000 ? "Ooh, ambitious! I'll be wagging the whole way." : "Wow! We're going to be zooming around town!";
  const ticks = Array.from({ length: 49 }, (_, i) => 1000 + i * 500);
  return (
    <Q title="Pick a daily step goal" sub="Walking, running and riding all count toward your day.">
      <div className="text-center"><Rolling value={value} /><p className="text-sm font-bold text-walkie-muted">steps a day</p></div>
      <div role="slider" tabIndex={0} aria-label="Daily step goal" aria-valuemin={1000} aria-valuemax={25000} aria-valuenow={value} aria-valuetext={`${value.toLocaleString()} steps`}
        onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowUp") set(value + 500); if (e.key === "ArrowLeft" || e.key === "ArrowDown") set(value - 500); }}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, v: value }; }}
        onPointerMove={(e) => { if (drag.current) set(drag.current.v - ((e.clientX - drag.current.x) / 14) * 500); }}
        onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}
        className="focus-ring relative mt-2 h-16 cursor-grab touch-none overflow-hidden rounded-2xl active:cursor-grabbing">
        <div className="absolute inset-y-0 left-1/2 flex items-center gap-[10px] transition-transform duration-150 ease-out" style={{ transform: `translateX(${-((value - 1000) / 500) * 14 - 2}px)` }}>
          {ticks.map((t) => <span key={t} className={`w-1 shrink-0 rounded-full ${t === value ? "h-12 bg-walkie-blue" : t % 2500 === 0 ? "h-8 bg-walkie-slate/50" : "h-5 bg-walkie-gray"}`} />)}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#F4F6F8,transparent_30%,transparent_70%,#F4F6F8)]" />
      </div>
      <div className="grid grid-cols-4 gap-2">{[3000, 5000, 7500, 10000].map((v) => <button key={v} onClick={() => set(v)} className={`rounded-2xl py-2.5 font-display font-semibold transition ${value === v ? "bg-walkie-blue text-white" : "bg-white shadow-card"}`}>{v / 1000}k</button>)}</div>
      <p className="mt-1 rounded-2xl bg-white px-4 py-3 text-center text-[14px] font-semibold text-walkie-slate shadow-card">🐾 {msg}</p>
      <Cta onClick={onNext}>Set my goal: {value.toLocaleString()} steps</Cta>
    </Q>
  );
}

function WorldBuild() {
  const pop = (d: number) => ({ animation: `ftue-pop 420ms cubic-bezier(.2,.9,.3,1.3) ${d}ms both`, transformBox: "fill-box" as const, transformOrigin: "50% 100%" });
  const tile = (x: number, y: number, c: string) => <path key={`${x}${y}`} d={`M${x} ${y} l24 -12 l24 12 l-24 12z`} fill={c} />;
  const tiles = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) tiles.push(tile(64 + (i - j) * 24, 60 + (i + j) * 12, (i + j) % 2 ? "#CFE8C4" : "#C3E0B7"));
  return (
    <svg viewBox="0 0 192 160" className="mx-auto -mt-2 h-[150px]" aria-label="Your pet shop growing">
      <path d="M16 90 l80 40 l80 -40 v8 l-80 40 l-80 -40z" fill="#B7A08A" />
      {tiles}
      <g style={pop(150)}><g transform="translate(78 42)"><path d="M0 30 l26 13 v28 l-26 -13z" fill="#8FB0E6" /><path d="M26 43 l30 -15 v28 l-30 15z" fill="#A9C5ED" /><path d="M-4 30 l30 -18 l34 16 l-30 17z" fill="#6B8FD6" /></g></g>
      <g style={pop(450)}><g transform="translate(30 66)"><rect x="9" y="18" width="4" height="10" fill="#A57A4E" /><circle cx="11" cy="14" r="11" fill="#6DBB8A" /></g></g>
      <g style={pop(650)}><g transform="translate(140 74)"><rect x="7" y="14" width="4" height="9" fill="#A57A4E" /><path d="M9 -4 l10 18 h-20z" fill="#4FA27A" /></g></g>
      <g style={pop(850)}><ellipse cx="120" cy="112" rx="8" ry="5" fill="#7CC49A" /><circle cx="117" cy="109" r="2" fill="#F2A7C0" /></g>
      <g style={pop(1050)}><g transform="translate(58 98)"><ellipse cx="6" cy="10" rx="7" ry="2" fill="#425A7C" opacity=".15" /><ellipse cx="6" cy="5" rx="6" ry="5" fill="#E9A65A" /><ellipse cx="6" cy="6.5" rx="4" ry="3" fill="#fff" /></g></g>
      {[[40, 30], [150, 26], [100, 14]].map(([x, y], i) => <g key={i} style={pop(1250 + i * 120)}><circle cx={x} cy={y} r="6" fill="#F2C94C" stroke="#E0B23A" strokeWidth="1.5" /><circle cx={x} cy={y} r="2.5" fill="#D9A62E" /></g>)}
    </svg>
  );
}

function Reminders({ a, setA, onNext, onMood }: { a: Answers; setA: (a: Answers) => void; onNext: () => void; onMood: (m: Mood) => void }) {
  const [hour, setHour] = useState(a.reminder?.hour ?? 18);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Q title="Want a little reminder when it's time for an adventure?" sub="One gentle nudge a day, max. Change it anytime.">
      <div className="grid grid-cols-3 gap-2">{[[8, "Morning", "☀️"], [12, "Lunchtime", "🥪"], [18, "Evening", "🌙"]].map(([h, l, e]) => <button key={h} onClick={() => { setHour(h as number); onMood("happy"); }} className={`rounded-3xl py-4 font-bold shadow-card transition ${hour === h ? "bg-walkie-blue text-white" : "bg-white"}`}><span className="block text-2xl">{e}</span>{l}</button>)}</div>
      <div className="rounded-3xl bg-white p-4 text-[13px] text-walkie-muted shadow-card"><p className="font-bold text-walkie-ink">Why reminders?</p>People who get a friendly nudge build habits faster. Walkie never sends more than one reminder a day and stays quiet at night.</div>
      {msg && <p className="text-center text-[13px] font-semibold text-walkie-slate">{msg}</p>}
      <div className="mt-auto grid gap-2 pt-6">
        <button className="btn-primary h-14 text-[17px]" onClick={async () => {
          let note = "In-app reminders on.";
          if (isNative()) { const r = await enablePush(); note = r.message; }
          else if (typeof Notification !== "undefined" && Notification.permission === "default") { await Notification.requestPermission().catch(() => {}); note = "Reminders on — you'll see them in Walkie."; }
          setA({ ...a, reminder: { on: true, hour } }); setMsg(note); onMood("celebrate"); setTimeout(onNext, 700);
        }}><Icon name="bell" size={18} />Remind me</button>
        <button className="btn-ghost" onClick={() => { setA({ ...a, reminder: { on: false, hour } }); onNext(); }}>Not now</button>
      </div>
    </Q>
  );
}

function Permissions({ a, setA, onNext }: { a: Answers; setA: (a: Answers) => void; onNext: () => void }) {
  const native = isNative();
  const card = (icon: string, title: string, why: string, status: string | undefined, action: ReactNode) => (
    <div className="rounded-3xl bg-white p-4 shadow-card"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-walkie-pale text-walkie-blue"><Icon name={icon} size={22} /></span><div className="flex-1"><p className="font-bold">{title}</p><p className="text-[13px] text-walkie-muted">{why}</p></div></div><div className="mt-3 flex items-center justify-between">{status ? <span className="text-[13px] font-bold text-emerald-600">{status}</span> : <span />}{action}</div></div>
  );
  return (
    <Q title="Let me count your steps and celebrate your adventures!" sub="Only what's needed — you're always in control.">
      {card("paw", "Steps & activity", native ? "Reads daily steps from Apple Health / Health Connect so all-day walking counts. Nothing is written or shared." : "All-day step counting works in the Walkie iOS & Android apps. On the web, tracked walks estimate your steps.", a.perms.health,
        native ? <button className="btn-soft min-h-[38px] text-sm" onClick={async () => { const r = await syncHealth(); setA({ ...a, perms: { ...a.perms, health: "error" in r ? "Not connected" : "Connected ✓" } }); }}>Connect</button> : <span className="text-[12px] font-bold text-walkie-muted">App only</span>)}
      {card("locate", "Location during activities", "Only while you're tracking a walk, run or ride — to draw your route and measure distance. Routes stay private.", a.perms.location,
        <button className="btn-soft min-h-[38px] text-sm" onClick={() => {
          if (!navigator.geolocation) return setA({ ...a, perms: { ...a.perms, location: "Unavailable" } });
          navigator.geolocation.getCurrentPosition(() => setA({ ...a, perms: { ...a.perms, location: "Allowed ✓" } }), () => setA({ ...a, perms: { ...a.perms, location: "Not allowed — you can enable it later" } }), { timeout: 15000 });
        }}>Allow</button>)}
      <Cta onClick={onNext}>{a.perms.location || a.perms.health ? "Continue" : "Maybe later"}</Cta>
    </Q>
  );
}

function Account({ answers, onDone }: { answers: Answers; onDone: () => void }) {
  const [email, setEmail] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const prepOauth = () => persist({ step: "finish", a: answers });
  return (
    <div className="flex flex-1 flex-col pt-[calc(15dvh+250px)] text-center">
      <h1 className="font-display text-[28px] font-semibold leading-tight">Save your adventure</h1>
      <p className="mx-auto mt-1 max-w-xs text-[15px] text-walkie-muted">So {answers.petName} and your progress follow you on every device.</p>
      {!email ? (
        <div className="mt-auto grid gap-2 pt-6">
          <a href="/api/auth/oauth/apple" onClick={prepOauth} className="btn-dark h-14"><Icon name="apple" size={18} fill="currentColor" strokeWidth={0} /> Continue with Apple</a>
          <a href="/api/auth/oauth/google" onClick={prepOauth} className="btn h-14 border border-walkie-gray bg-white text-walkie-ink">Continue with Google</a>
          <button className="btn-soft h-14" onClick={() => setEmail(true)}><Icon name="mail" size={18} />Sign up with email</button>
          <Link href="/login?next=/welcome" onClick={prepOauth} className="mt-1 text-[13px] font-bold text-walkie-blue">I already have an account</Link>
        </div>
      ) : (
        <form className="mt-4 grid gap-2.5 text-left" onSubmit={async (e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setErr(null);
          try { await api("/api/auth/signup", { body: { name: f.get("name"), email: f.get("email"), password: f.get("password"), acceptTerms: f.get("terms") === "on", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } }); onDone(); }
          catch (er: any) { setErr(er.message); setBusy(false); }
        }}>
          <input name="name" className="input" placeholder="Your name" autoComplete="given-name" required maxLength={60} />
          <input name="email" type="email" className="input" placeholder="Email" autoComplete="email" required />
          <input name="password" type="password" className="input" placeholder="Password (8+ chars, a letter & a number)" autoComplete="new-password" required />
          <label className="flex items-start gap-2 text-[13px] text-walkie-muted"><input name="terms" type="checkbox" className="mt-0.5 h-5 w-5 accent-walkie-blue" /> I agree to the <Link href="/terms" className="font-bold text-walkie-blue">Terms</Link> and <Link href="/privacy" className="font-bold text-walkie-blue">Privacy Policy</Link>.</label>
          {err && <p role="alert" className="rounded-2xl bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-700">{err}</p>}
          <button className="btn-primary h-14 text-[17px]" disabled={busy}>{busy ? "Creating…" : "Create my account"}</button>
          <button type="button" className="btn-ghost" onClick={() => setEmail(false)}>Other options</button>
        </form>
      )}
    </div>
  );
}

function Finish({ a, userName, onEnter, onMood }: { a: Answers; userName: string | null; onEnter: () => void; onMood: (m: Mood) => void }) {
  const items = [`Daily goal set: ${a.steps.toLocaleString()} steps`, `${a.adventure === "bike" ? "Cycling" : a.adventure === "run" ? "Running" : a.adventure === "walk" ? "Walking" : "Mixed"} missions picked`, `${a.petName} is ready to go`, "Pet shop opening…"];
  const [done, setDone] = useState(0);
  const [phase, setPhase] = useState<"packing" | "gift" | "open">("packing");
  const [wallet, setWallet] = useState<{ coins: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await api("/api/me/profile", { method: "PATCH", body: { onboarded: true, dailyStepGoal: a.steps, preferredActivity: a.adventure ?? null, fitnessGoals: a.goals, activityLevel: a.level ?? null, petNickname: a.petName.trim() || "Walkie", notifyDailyReminder: !!a.reminder?.on, reminderHour: a.reminder?.hour ?? 18, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } });
        await api("/api/wardrobe/appearance", { method: "PATCH", body: { look: a.look ?? "classic", reset: true } }).catch(() => {}); // dress the chosen starter outfit
        const me = await api<{ wallet: { coins: number } }>("/api/me"); if (alive) setWallet(me.wallet);
      } catch (e: any) { if (alive) setErr(e.message); }
    })();
    const ts = items.map((_, i) => setTimeout(() => alive && setDone(i + 1), 500 + i * 500));
    const g = setTimeout(() => { if (alive) { setPhase("gift"); onMood("discover"); } }, 500 + items.length * 500 + 300);
    return () => { alive = false; ts.forEach(clearTimeout); clearTimeout(g); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="flex flex-1 flex-col pt-[calc(15dvh+250px)] text-center">
      {phase === "packing" && (<>
        <h1 className="font-display text-[26px] font-semibold">Packing your adventure bag…</h1>
        <ul className="mx-auto mt-4 grid w-full max-w-xs gap-2.5 text-left">{items.map((t, i) => <li key={t} className={`flex items-center gap-2.5 text-[15px] font-semibold transition-opacity duration-300 ${i < done ? "opacity-100" : "opacity-40"}`}><span className={`grid h-6 w-6 place-items-center rounded-full transition-colors duration-300 ${i < done ? "bg-walkie-blue text-white" : "bg-walkie-gray"}`}>{i < done && <Icon name="check" size={14} strokeWidth={3} />}</span>{t}</li>)}</ul>
      </>)}
      {phase === "gift" && (<>
        <h1 className="font-display text-[26px] font-semibold">A welcome gift from {a.petName}!</h1>
        <p className="mt-1 text-walkie-muted">Tap to open</p>
        <button className="mx-auto mt-3 animate-[ftue-wiggle_1.2s_ease-in-out_infinite]" aria-label="Open gift" onClick={() => { setPhase("open"); onMood("celebrate"); navigator.vibrate?.([30, 40, 60]); }}>
          <svg width="130" height="130" viewBox="0 0 100 100"><rect x="14" y="40" width="72" height="50" rx="8" fill="#A9C5ED" /><rect x="10" y="28" width="80" height="18" rx="6" fill="#6B8FD6" /><rect x="44" y="28" width="12" height="62" fill="#F9D9E5" /><path d="M50 28 C38 10 22 16 30 28 Z M50 28 C62 10 78 16 70 28 Z" fill="#F28DAA" /></svg>
        </button>
      </>)}
      {phase === "open" && (<>
        <h1 className="font-display text-[28px] font-semibold" style={{ animation: "ftue-in 300ms both" }}>Your adventure starts now{userName ? `, ${userName}` : ""}!</h1>
        <div className="mt-3 flex justify-center gap-2" style={{ animation: "ftue-pop 420ms 150ms both" }}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-butter px-3 py-1.5 font-display font-semibold text-amber-800"><Coin size={18} />{wallet?.coins ?? 150} coins</span>
          <span className="rounded-full bg-walkie-pale px-3 py-1.5 font-display font-semibold text-walkie-slate">🥣 3 kibble</span>
          <span className="rounded-full bg-mint px-3 py-1.5 font-display font-semibold text-emerald-800">🌳 starter decor</span>
        </div>
        <div style={{ animation: "ftue-pop 500ms 350ms both" }}><ShopMini size={200} className="mx-auto mt-2" /></div>
        {err && <p className="text-[12px] text-rose-600">{err}</p>}
      </>)}
      <div className="mt-auto pt-6"><button className="btn-primary h-14 w-full text-[17px]" disabled={phase !== "open"} onClick={onEnter}>Enter Walkie <Icon name="chevron" size={18} /></button></div>
    </div>
  );
}
