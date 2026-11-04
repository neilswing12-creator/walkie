"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { MyWalkie } from "../mascot/MyWalkie";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ACTIVITY_META, FAMILY_META, typesOfFamily, type ActivityFamily, type ActivityType } from "@/lib/constants";
import { estimateCalories, formatDuration, formatPace, formatSpeed, processRoute, type RawPoint } from "@/lib/fitness";
import { watchLocation, keepAwake, type GeoStatus } from "@/lib/native/geo";
import { isNative } from "@/lib/native/platform";
import { api, uid } from "@/lib/client/api";
import { dist, distUnit } from "@/lib/format";
import { Walkie, type Mood } from "../mascot/Walkie";
import { Icon } from "../ui/Icon";
import { Bar } from "../ui/Progress";
import { useToast } from "../ui/Toast";
import { useCelebrate } from "../ui/Celebrate";
import { Sheet } from "../ui/Sheet";
import { RouteSvg } from "./RouteSvg";
import { CompletionCard, type CompletionData } from "./CompletionCard";
import { ActivityPicker } from "../app/ActivityPicker";
import { checkBadges } from "../badges/BadgeUnlockHost";

/** idle(setup) → starting(3-2-1) → active ⇄ paused → finishing(confirm) → saving → completed | failed */
type Phase = "setup" | "starting" | "active" | "paused" | "finishing" | "saving" | "completed" | "failed";
type Goal = { kind: "FREE" | "DISTANCE" | "DURATION" | "CALORIES"; value?: number };
type Draft = { clientId: string; sessionId: string | null; type: ActivityType; goal: Goal; startedAt: number; movingMs: number; resumedAt: number | null; points: RawPoint[]; phase: Phase };
type RewardCfg = { types: { key: string; name: string; rate: number; enabled: boolean }[]; coinsPerPoint: number } | null;
const DRAFT_KEY = "walkie.activityDraft";
const loadDraft = (): Draft | null => { try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null"); return d && Date.now() - d.startedAt < 8 * 3600000 ? d : null; } catch { return null; } };
const saveDraft = (d: Draft | null) => { try { d ? localStorage.setItem(DRAFT_KEY, JSON.stringify(d)) : localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ } };
const GOALS: Record<ActivityFamily, Record<"DISTANCE" | "DURATION" | "CALORIES", number[]>> = {
  walk: { DISTANCE: [1, 2, 3, 5], DURATION: [15, 20, 30, 45], CALORIES: [100, 150, 200, 300] },
  run: { DISTANCE: [3, 5, 10, 21.1], DURATION: [10, 20, 30, 45], CALORIES: [200, 300, 400, 600] },
  bike: { DISTANCE: [5, 10, 20, 40], DURATION: [20, 30, 45, 60], CALORIES: [200, 300, 500, 800] },
  other: { DISTANCE: [1, 2, 3, 5], DURATION: [10, 20, 30, 45], CALORIES: [100, 200, 300, 400] },
};

export function Tracker({ units, weightKg, userName, petName }: { units: "metric" | "imperial"; weightKg: number | null; userName: string; petName: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const celebrate = useCelebrate();
  const famParam = sp.get("family") as ActivityFamily | null;
  const typeParam = sp.get("type") as ActivityType | null;
  const initialType: ActivityType | null = typeParam && ACTIVITY_META[typeParam] ? typeParam : famParam && FAMILY_META[famParam] ? typesOfFamily(famParam)[0] : null;
  const [picker, setPicker] = useState(!initialType);
  const [draft, setDraft] = useState<Draft>(() => ({ clientId: uid(), sessionId: null, type: initialType ?? "OUTDOOR_WALK", goal: { kind: "FREE" }, startedAt: 0, movingMs: 0, resumedAt: null, points: [], phase: "setup" }));
  const [geo, setGeo] = useState<{ status: GeoStatus; msg?: string; accuracy?: number; lastFix?: number }>({ status: "idle" });
  const [now, setNow] = useState(Date.now());
  const [count, setCount] = useState(3);
  const [restore, setRestore] = useState<Draft | null>(null);
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<CompletionData | null>(null);
  const [failMsg, setFailMsg] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [bgGap, setBgGap] = useState(false);
  const [cfg, setCfg] = useState<RewardCfg>(null);
  const [goalHit, setGoalHit] = useState(false);
  const stopGeo = useRef<() => void>(() => {});
  const release = useRef<() => void>(() => {});
  const hiddenAt = useRef<number | null>(null);
  const meta = ACTIVITY_META[draft.type];
  const fam = FAMILY_META[meta.family];
  const isBike = meta.family === "bike";
  const running = draft.phase === "active";

  useEffect(() => { api<RewardCfg>("/api/rewards/config").then(setCfg).catch(() => {}); const d = loadDraft(); if (d && !["completed", "setup"].includes(d.phase)) { setRestore(d); setPicker(false); } }, []);
  useEffect(() => { if (["active", "paused", "finishing", "failed"].includes(draft.phase)) saveDraft(draft); }, [draft]);
  useEffect(() => { if (!running) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [running]);
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) hiddenAt.current = Date.now();
      else { if (hiddenAt.current && Date.now() - hiddenAt.current > 15000 && meta.gps && !isNative() && running) setBgGap(true); hiddenAt.current = null; }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [meta.gps, running]);

  const startGeo = useCallback(async () => {
    if (!meta.gps) return;
    stopGeo.current();
    stopGeo.current = await watchLocation(
      (f) => {
        setGeo({ status: "ok", accuracy: f.accuracy, lastFix: Date.now() });
        setDraft((d) => (d.phase === "active" ? { ...d, points: [...d.points, [f.lat, f.lng, f.t, f.accuracy, f.altitude]] } : d));
      },
      (status, msg) => setGeo((g) => ({ ...g, status, msg })),
    );
  }, [meta.gps]);
  useEffect(() => () => { stopGeo.current(); release.current(); }, []);
  useEffect(() => { if (meta.gps && draft.phase === "setup" && !picker) startGeo(); if (!meta.gps) { stopGeo.current(); setGeo({ status: "idle" }); } }, [meta.gps, draft.phase, picker, startGeo]);

  const movingSec = Math.floor((draft.movingMs + (running && draft.resumedAt ? now - draft.resumedAt : 0)) / 1000);
  const route = useMemo(() => (meta.gps ? processRoute(draft.points, meta.family) : null), [draft.points, meta.gps, meta.family]);
  const distanceM = meta.gps ? route?.distanceM ?? 0 : Number(manual || 0) * (units === "imperial" ? 1609.344 : 1000);
  const recent = useMemo(() => {
    const pts = draft.points.filter((p) => p[2] > Date.now() - 30000);
    if (pts.length < 2) return null;
    const r = processRoute(pts, meta.family); const sec = (pts[pts.length - 1][2] - pts[0][2]) / 1000;
    return r.distanceM > 15 && sec > 0 ? { pace: sec / (r.distanceM / 1000), speed: r.distanceM / sec } : null;
  }, [draft.points, meta.family]);
  const avgPace = distanceM > 50 && movingSec > 0 ? movingSec / (distanceM / 1000) : null;
  const avgSpeed = distanceM > 0 && movingSec > 0 ? distanceM / movingSec : null;
  const kcal = estimateCalories(draft.type, movingSec, weightKg, avgSpeed ?? undefined);
  const gpsLost = running && meta.gps && geo.status === "ok" && geo.lastFix != null && now - geo.lastFix > 20000;
  const rate = cfg?.types.find((t) => t.key === draft.type)?.rate ?? meta.rate;
  const goalProgress = draft.goal.kind === "DISTANCE" ? distanceM / ((draft.goal.value ?? 1) * 1000) : draft.goal.kind === "DURATION" ? movingSec / ((draft.goal.value ?? 1) * 60) : draft.goal.kind === "CALORIES" ? kcal / (draft.goal.value ?? 1) : 0;
  useEffect(() => { if (running && draft.goal.kind !== "FREE" && goalProgress >= 1 && !goalHit) { setGoalHit(true); navigator.vibrate?.([80, 60, 80]); } }, [goalProgress, running, draft.goal.kind, goalHit]);

  async function start() {
    setDraft((d) => ({ ...d, phase: "starting" }));
    if (meta.gps && geo.status !== "ok") startGeo();
    release.current = await keepAwake();
    let sessionId: string | null = null;
    api<{ id: string }>("/api/activities/sessions", { body: { type: draft.type, goal: draft.goal } }).then((s) => { sessionId = s.id; setDraft((d) => ({ ...d, sessionId: s.id })); }).catch(() => toast("info", "Offline — your activity will be verified when it's saved"));
    for (const n of [3, 2, 1]) { setCount(n); await new Promise((r) => setTimeout(r, 800)); }
    const t = Date.now();
    setNow(t);
    setDraft((d) => ({ ...d, sessionId: d.sessionId ?? sessionId, startedAt: t, resumedAt: t, phase: "active" }));
    api("/api/analytics", { body: { name: "start_activity_tapped", props: { type: draft.type } } }).catch(() => {});
  }
  const syncSession = (action: "pause" | "resume" | "abandon") => { if (draft.sessionId) api(`/api/activities/sessions/${draft.sessionId}`, { method: "PATCH", body: { action } }).catch(() => {}); };
  const pause = () => { syncSession("pause"); setDraft((d) => ({ ...d, movingMs: d.movingMs + (d.resumedAt ? Date.now() - d.resumedAt : 0), resumedAt: null, phase: "paused" })); };
  const resume = () => { syncSession("resume"); const t = Date.now(); setNow(t); setDraft((d) => ({ ...d, resumedAt: t, phase: "active" })); };
  const finish = () => { if (running) pause(); setDraft((d) => ({ ...d, phase: "finishing" })); };

  async function save() {
    setDraft((d) => ({ ...d, phase: "saving" }));
    try {
      const body = {
        clientId: draft.clientId, sessionId: draft.sessionId ?? undefined, type: draft.type, startedAt: new Date(draft.startedAt).toISOString(), endedAt: new Date().toISOString(),
        movingSec: Math.floor(draft.movingMs / 1000), points: meta.gps ? draft.points : undefined, manualDistanceM: !meta.gps && manual ? Math.round(distanceM) : undefined,
      };
      const r = await api<any>("/api/activities", { body });
      saveDraft(null); stopGeo.current(); release.current();
      const a = r.activity;
      setResult({
        activity: { ...a, type: draft.type, startedAt: body.startedAt, estimatedSteps: null, elevationGainM: route?.elevationGainM ?? null, maxSpeedMps: route?.maxSpeedMps ?? null, records: a.records ?? [] },
        route: route?.points.map((p) => [p[0], p[1]] as [number, number]) ?? [], userName, units, petName, fresh: true,
        petHappiness: r.petHappiness, petXp: r.pet ? Math.round(a.xpAwarded * 0.8) : 0, missions: r.missions, shop: r.shop, streak: r.streak?.current, bonus: r.reward,
      });
      setDraft((d) => ({ ...d, phase: "completed" }));
      window.scrollTo(0, 0);
      setTimeout(() => {
        if (r.discoveredPets?.[0]) celebrate({ title: `You discovered a ${r.discoveredPets[0].name}!`, species: r.discoveredPets[0].key, body: "Your adventures attracted a new friend." });
        else if (r.leveledUp) celebrate({ title: "Level up!", mood: "levelup", body: "You and Walkie are getting stronger." });
        else if (r.unlockedAchievements?.length) checkBadges();
      }, 2400);
    } catch (e: any) {
      if (e?.code === "session_finished") { saveDraft(null); router.replace("/app/history"); return; }
      setFailMsg(e.message); setDraft((d) => ({ ...d, phase: "failed" }));
    }
  }
  function discard() { syncSession("abandon"); saveDraft(null); stopGeo.current(); release.current(); router.push("/app"); }

  if (picker) return <main className="min-h-dvh px-4"><ActivityPicker open onClose={() => { setPicker(false); if (!initialType) router.push("/app"); }} /></main>;

  if (restore) {
    return (
      <Shell onBack={() => router.push("/app")}>
        <div className="card mt-6 p-6 text-center">
          <MyWalkie mood="discover" size={140} className="mx-auto" />
          <h1 className="font-display text-2xl font-semibold">Unfinished {ACTIVITY_META[restore.type].short.toLowerCase()}</h1>
          <p className="mt-1 text-sm text-walkie-muted">Started {new Date(restore.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {formatDuration(Math.floor(restore.movingMs / 1000))} recorded</p>
          <div className="mt-5 grid gap-2">
            <button className="btn-primary" onClick={() => { setDraft({ ...restore, phase: "paused", resumedAt: null }); setRestore(null); if (ACTIVITY_META[restore.type].gps) startGeo(); }}>Continue it</button>
            <button className="btn-soft" onClick={() => { setDraft({ ...restore, phase: "finishing", resumedAt: null }); setRestore(null); }}>Finish & save</button>
            <button className="btn-ghost text-rose-600" onClick={() => { if (restore.sessionId) api(`/api/activities/sessions/${restore.sessionId}`, { method: "PATCH", body: { action: "abandon" } }).catch(() => {}); saveDraft(null); setRestore(null); }}>Discard</button>
          </div>
        </div>
      </Shell>
    );
  }

  if (draft.phase === "completed" && result) return <main className="mx-auto max-w-2xl"><CompletionCard d={result} /></main>;

  if (draft.phase === "saving") return <main className="grid min-h-dvh place-items-center text-center"><div><MyWalkie mood="celebrate" size={200} className="mx-auto" /><p className="font-display text-xl font-semibold">Saving & verifying rewards…</p></div></main>;

  if (draft.phase === "starting") {
    return (
      <main className="grid min-h-dvh place-items-center text-center" style={{ background: fam.tint }}>
        <div><MyWalkie mood={fam.mood} size={200} className="mx-auto" /><p key={count} className="animate-pop font-display text-[96px] font-semibold leading-none" style={{ color: fam.color }}>{count}</p><p className="mt-2 font-bold text-walkie-muted">{meta.label}</p></div>
      </main>
    );
  }

  const setupMode = draft.phase === "setup";
  const liveMood: Mood = running ? (goalHit ? "celebrate" : fam.mood) : draft.phase === "paused" ? "sit" : "greet";
  const typeChoices = typesOfFamily(meta.family).filter((t) => cfg?.types ? cfg.types.some((c) => c.key === t) : true);
  const estMin = draft.goal.kind === "DURATION" ? draft.goal.value ?? 30 : 30;

  return (
    <Shell onBack={setupMode ? () => setPicker(true) : undefined} title={setupMode ? `Ready to ${fam.verb}?` : meta.label}>
      {setupMode && (
        <>
          <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Activity type">
            {typeChoices.map((t) => <button key={t} role="radio" aria-checked={t === draft.type} onClick={() => setDraft((d) => ({ ...d, type: t }))} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition ${t === draft.type ? "text-white" : "bg-white text-walkie-slate shadow-card"}`} style={t === draft.type ? { background: fam.color } : undefined}>{cfg?.types.find((c) => c.key === t)?.name ?? ACTIVITY_META[t].label}</button>)}
          </div>
          <p className="mt-2 px-1 text-[13px] text-walkie-muted">{meta.description}</p>
        </>
      )}

      {meta.gps && <GpsBanner geo={geo} lost={gpsLost} />}
      {bgGap && <button onClick={() => setBgGap(false)} className="mt-2 w-full rounded-2xl bg-butter/70 px-3 py-2 text-[12px] font-semibold text-amber-900">Your browser paused GPS while Walkie was in the background, so the route may have a gap. Keep this screen open for best results. ✕</button>}

      <div className="mt-2 flex justify-center"><MyWalkie mood={liveMood} size={setupMode ? 170 : 140} /></div>

      {setupMode ? (
        <section className="card mt-1 p-5">
          <p className="label">Goal</p>
          <div className="grid grid-cols-4 gap-1 rounded-full bg-walkie-light p-1">{(["FREE", "DISTANCE", "DURATION", "CALORIES"] as const).map((k) => <button key={k} onClick={() => setDraft((d) => ({ ...d, goal: k === "FREE" ? { kind: k } : { kind: k, value: GOALS[meta.family][k][1] } }))} className={`rounded-full py-2 text-[12px] font-extrabold ${draft.goal.kind === k ? "bg-white text-walkie-ink shadow-card" : "text-walkie-muted"}`}>{k === "FREE" ? "Free" : k === "DISTANCE" ? "Distance" : k === "DURATION" ? "Time" : "Calories"}</button>)}</div>
          {draft.goal.kind !== "FREE" && (
            <div className="mt-3 grid grid-cols-4 gap-2">{GOALS[meta.family][draft.goal.kind].filter(() => draft.goal.kind !== "DISTANCE" || meta.gps || draft.type !== "FREE_WORKOUT").map((v) => <button key={v} onClick={() => setDraft((d) => ({ ...d, goal: { ...d.goal, value: v } }))} className={`rounded-2xl py-3 font-display text-lg font-semibold ${draft.goal.value === v ? "text-white shadow-button" : "bg-walkie-light"}`} style={draft.goal.value === v ? { background: fam.color } : undefined}>{v}<span className="text-[11px]">{draft.goal.kind === "DISTANCE" ? distUnit(units) : draft.goal.kind === "DURATION" ? "m" : ""}</span></button>)}</div>
          )}
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-walkie-pale px-4 py-3">
            <Icon name="paw" size={22} fill="#6B8FD6" strokeWidth={0} />
            <p className="flex-1 text-[13px] font-semibold text-walkie-slate"><b>{rate} points</b> per moving minute · ≈ {Math.round(rate * estMin).toLocaleString()} pts &amp; {Math.round(rate * estMin * (cfg?.coinsPerPoint ?? 0.2))} coins in {estMin} min</p>
          </div>
          <p className="mt-2 text-[11px] text-walkie-muted">Paused time doesn't earn points. Rewards are verified on our server when you finish.</p>
        </section>
      ) : (
        <section className="card mt-1 p-5 text-center">
          <p className="eyebrow">{meta.gps || manual ? "Distance" : "Moving time"}</p>
          <p className="font-display text-[64px] font-semibold leading-none tabular">{meta.gps ? dist(distanceM, units, 2) : formatDuration(movingSec)}</p>
          {meta.gps && <p className="text-sm font-bold text-walkie-muted">{units === "imperial" ? "miles" : "kilometers"}</p>}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {meta.gps ? <Stat label="time" value={formatDuration(movingSec)} /> : <Stat label="kcal est." value={String(kcal)} />}
            {isBike ? <Stat label={units === "imperial" ? "mph now" : "km/h now"} value={formatSpeed(recent?.speed ?? avgSpeed, units)} /> : meta.gps ? <Stat label={`pace /${distUnit(units)}`} value={formatPace(recent?.pace ?? avgPace, units)} /> : <Stat label="status" value={running ? "Moving" : "Paused"} />}
            {isBike ? <Stat label={units === "imperial" ? "avg mph" : "avg km/h"} value={formatSpeed(avgSpeed, units)} /> : meta.gps ? <Stat label={`avg /${distUnit(units)}`} value={formatPace(avgPace, units)} /> : <Stat label="type" value={meta.short} />}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] font-bold text-walkie-muted">
            {meta.gps && <span>{kcal} kcal est.</span>}
            {!isBike && meta.gps && distanceM > 0 && <span>≈ {Math.round(distanceM / (meta.family === "run" ? 1.1 : 0.75)).toLocaleString()} steps est.</span>}
            {route?.elevationGainM != null && <span className="inline-flex items-center gap-1"><Icon name="mountain" size={14} />{route.elevationGainM} m</span>}
            <span style={{ color: fam.color }}>≈ {Math.floor(movingSec / 60) * rate} pts</span>
          </div>
          {draft.goal.kind !== "FREE" && <div className="mt-3"><Bar value={goalProgress} color={fam.color} height={10} /><p className="mt-1 text-[12px] font-bold text-walkie-muted">{goalHit ? "Goal reached! 🎉 Keep going or finish." : `${Math.round(goalProgress * 100)}% of your ${draft.goal.value}${draft.goal.kind === "DISTANCE" ? ` ${distUnit(units)}` : draft.goal.kind === "DURATION" ? " min" : " kcal"} goal`}</p></div>}
        </section>
      )}

      {meta.gps && !setupMode && <RouteSvg live points={route?.points.map((p) => [p[0], p[1]] as [number, number]) ?? []} height={170} className="mt-3" />}
      {!isNative() && meta.gps && !setupMode && <p className="mt-3 text-center text-[12px] text-walkie-muted">Keep this screen open — browsers pause GPS in the background. The Walkie app is built for screen-off tracking.</p>}
      {draft.phase === "failed" && <div className="mt-3 rounded-2xl bg-rose-50 p-4 text-[13px] font-semibold text-rose-700">Couldn't save: {failMsg} Your activity is kept on this device.<div className="mt-2 flex gap-2"><button className="btn-primary min-h-[38px] text-sm" onClick={save}>Try again</button><button className="btn-ghost min-h-[38px] text-sm text-rose-600" onClick={() => setConfirmDiscard(true)}>Discard</button></div></div>}

      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-walkie-light via-walkie-light to-transparent px-4 pb-[calc(20px+var(--safe-bottom))] pt-6">
        <div className="mx-auto flex max-w-lg items-center justify-center gap-4">
          {setupMode && <button className="btn-primary h-16 w-full text-lg" style={{ background: fam.color }} onClick={start} disabled={meta.gps && (geo.status === "denied" || geo.status === "unavailable")}><Icon name="play" fill="currentColor" size={22} /> Start {fam.verb}</button>}
          {running && <><button className="grid h-16 w-16 place-items-center rounded-full bg-white text-walkie-slate shadow-card" onClick={finish} aria-label="Finish"><Icon name="stop" fill="currentColor" size={22} /></button><button className="grid h-20 w-20 place-items-center rounded-full bg-walkie-ink text-white shadow-lift" onClick={pause} aria-label="Pause"><Icon name="pause" size={30} strokeWidth={3} /></button></>}
          {draft.phase === "paused" && <><button className="btn-soft h-16 flex-1" onClick={finish}>Finish</button><button className="btn-primary h-16 flex-1" onClick={resume}><Icon name="play" fill="currentColor" size={20} />Resume</button></>}
        </div>
        {draft.phase === "paused" && <button onClick={() => setConfirmDiscard(true)} className="mx-auto mt-2 block text-[13px] font-bold text-rose-500">Discard</button>}
        {setupMode && meta.gps && (geo.status === "denied" || geo.status === "unavailable") && <p className="mt-2 text-center text-[12px] font-semibold text-walkie-muted">GPS is needed for outdoor tracking — or <button className="font-bold text-walkie-blue underline" onClick={() => setDraft((d) => ({ ...d, type: typesOfFamily(meta.family).find((t) => !ACTIVITY_META[t].gps) ?? "FREE_WORKOUT" }))}>switch to an indoor activity</button></p>}
      </div>

      <Sheet open={draft.phase === "finishing"} onClose={() => setDraft((d) => ({ ...d, phase: "paused" }))} title={`Finish your ${fam.verb}?`}>
        <div className="grid grid-cols-3 gap-2">
          <Stat label={distUnit(units)} value={dist(distanceM, units, 2)} /><Stat label="moving time" value={formatDuration(Math.floor(draft.movingMs / 1000))} /><Stat label="kcal est." value={String(kcal)} />
        </div>
        {!meta.gps && draft.type !== "FREE_WORKOUT" && (
          <label className="mt-4 block"><span className="label">{draft.type.startsWith("TREADMILL") || draft.type === "INDOOR_CYCLE" ? "Distance from the machine's console" : "Distance (optional)"} ({distUnit(units)})</span><input className="input" inputMode="decimal" placeholder="e.g. 3.2" value={manual} onChange={(e) => setManual(e.target.value.replace(/[^0-9.]/g, ""))} /></label>
        )}
        {meta.gps && (route?.points.length ?? 0) < 2 && <p className="mt-3 rounded-2xl bg-butter/60 px-3 py-2 text-[13px] font-semibold text-amber-900">No GPS route was recorded, so distance is 0. Moving minutes still earn points.</p>}
        {Math.floor(draft.movingMs / 1000) < 60 && <p className="mt-3 text-[12px] text-walkie-muted">Activities under a minute are saved but don't earn points.</p>}
        <div className="mt-5 grid gap-2"><button className="btn-primary" onClick={save}>Save activity</button><button className="btn-ghost" onClick={() => setDraft((d) => ({ ...d, phase: "paused" }))}>Keep going</button></div>
      </Sheet>
      <Sheet open={confirmDiscard} onClose={() => setConfirmDiscard(false)} title="Discard this activity?">
        <p className="text-sm text-walkie-muted">It won't be saved and you won't earn rewards for it.</p>
        <div className="mt-4 grid gap-2"><button className="btn-danger" onClick={discard}>Discard</button><button className="btn-soft" onClick={() => setConfirmDiscard(false)}>Cancel</button></div>
      </Sheet>
      <div className="h-28" />
    </Shell>
  );
}

function Shell({ children, onBack, title }: { children: React.ReactNode; onBack?: () => void; title?: string }) {
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pt-[calc(12px+var(--safe-top))]">
      <div className="flex h-11 items-center justify-between">
        {onBack ? <button onClick={onBack} className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card" aria-label="Back"><Icon name="back" size={20} /></button> : <span className="w-10" />}
        {title && <h1 className="font-display text-lg font-semibold">{title}</h1>}
        <span className="w-10" />
      </div>
      {children}
    </main>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-walkie-light px-2 py-3"><p className="font-display text-[22px] font-semibold leading-none tabular">{value}</p><p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-walkie-muted">{label}</p></div>;
}
function GpsBanner({ geo, lost }: { geo: { status: GeoStatus; msg?: string; accuracy?: number }; lost: boolean }) {
  const tone = lost ? "bg-butter/70 text-amber-900" : geo.status === "ok" ? (geo.accuracy ?? 99) <= 20 ? "bg-mint/70 text-emerald-800" : "bg-butter/70 text-amber-900" : geo.status === "denied" || geo.status === "unavailable" ? "bg-rose-50 text-rose-700" : "bg-white text-walkie-slate";
  const text = lost ? "GPS signal lost — distance pauses until it returns" : geo.status === "ok" ? `GPS active · ±${Math.round(geo.accuracy ?? 0)} m` : geo.status === "searching" || geo.status === "requesting" ? "Finding GPS signal…" : geo.status === "idle" ? "GPS not started" : geo.msg ?? "GPS unavailable";
  return <div role="status" className={`mt-3 flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[13px] font-bold shadow-card ${tone}`}><Icon name="locate" size={16} />{text}</div>;
}
