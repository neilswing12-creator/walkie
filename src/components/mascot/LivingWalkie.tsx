"use client";
/**
 * LivingWalkie — makes the SVG husky behave like a pet, not a picture.
 *  • Idle life: breathing/blinks/tail/ears run in CSS; on top a scheduler picks a micro-behaviour every ~3–7 s
 *    (look around, head tilt, ear flick, sniff, stretch, yawn, happy wiggle) — weighted by mood.
 *  • Gaze: pupils follow the pointer (or an explicit target), drifting back to centre when idle.
 *  • Touch: tap → giggle & hop; rapid taps → excited jump; press & hold → being petted (eyes close, tail goes wild).
 *  • Reactions: `reaction` prop ({ kind, id }) plays the outfit-change "ooh" (squint → blink → ooh → stomp, timing taken
 *    from the reference analysis), rare-item celebrations, rewards, etc.
 * Pauses when off-screen or the tab is hidden (battery), and drops to expression-only changes under prefers-reduced-motion.
 */
import { sfx } from "@/lib/client/sfx";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Walkie, type Expression, type Mood } from "./Walkie";
import type { AccessoryProp } from "./Accessories";

export type Reaction = { kind: "equip" | "unequip" | "rare" | "reward" | "celebrate" | "look" | "twirl" | "pet"; id: number; at?: { x: number; y: number } };
type Step = { t: number; expr?: Expression; act?: string | null; mood?: Mood | null; gaze?: { x: number; y: number } | null };

const SCRIPTS: Record<Reaction["kind"], Step[]> = {
  // squint while the item swaps (~100 ms crossfade), blink, round "ooh", little stomp, settle — ≈1.3 s
  equip: [{ t: 0, expr: "squint", act: null }, { t: 140, expr: "blink" }, { t: 260, expr: "ooh", act: "stomp" }, { t: 820, expr: "wide", act: null }, { t: 1300, expr: null }],
  unequip: [{ t: 0, expr: "blink" }, { t: 150, expr: null, act: "earflick" }, { t: 700, act: null }],
  rare: [{ t: 0, expr: "wide" }, { t: 260, expr: "ooh" }, { t: 520, expr: null, mood: "celebrate" }, { t: 2100, mood: null }],
  reward: [{ t: 0, expr: "ooh", act: "hop" }, { t: 600, expr: null, act: null, mood: "happy" }, { t: 1800, mood: null }],
  celebrate: [{ t: 0, mood: "celebrate" }, { t: 2200, mood: null }],
  look: [{ t: 0, act: "tilt" }, { t: 1500, act: null }],
  twirl: [{ t: 0, act: "twirl", expr: "squint" }, { t: 950, act: "hop", expr: "ooh" }, { t: 1500, act: null, expr: null }],
  pet: [{ t: 0, act: "pet", expr: "squint" }, { t: 1600, act: null, expr: null }],
};
const IDLE: { act?: string; expr?: Expression; look?: boolean; w: number; ms: number }[] = [
  { look: true, w: 5, ms: 1600 }, { act: "tilt", w: 3, ms: 1500 }, { act: "tilt-r", w: 2, ms: 1500 }, { act: "earflick", w: 3, ms: 600 },
  { act: "sniff", w: 2, ms: 900 }, { act: "stretch", w: 1, ms: 1400 }, { expr: "yawn", w: 1, ms: 1100 }, { act: "wiggle", w: 2, ms: 700 }, { act: "look", w: 2, ms: 1600 },
];

export function LivingWalkie({ mood = "idle", size = 180, accessories = [], look, fur, className = "", interactive = true, reaction, gazeTarget, onTap, title, style }: {
  mood?: Mood; size?: number; accessories?: AccessoryProp[]; look?: string | null; fur?: string | null; className?: string;
  interactive?: boolean; reaction?: Reaction | null; gazeTarget?: { x: number; y: number } | null; onTap?: () => void; title?: string; style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [expr, setExpr] = useState<Expression>(null);
  const [act, setAct] = useState<string | null>(null);
  const [tmpMood, setTmpMood] = useState<Mood | null>(null);
  const [gaze, setGaze] = useState<{ x: number; y: number } | null>(null);
  const timers = useRef<number[]>([]);
  const busyUntil = useRef(0);
  const visible = useRef(true);
  const reduced = useRef(false);
  const taps = useRef<number[]>([]);
  const hold = useRef<number | null>(null);
  const lastPointer = useRef(0);

  const clear = () => { timers.current.forEach((t) => clearTimeout(t)); timers.current = []; };
  const play = useCallback((steps: Step[]) => {
    clear();
    const end = steps[steps.length - 1].t;
    busyUntil.current = Date.now() + end + 200;
    for (const s of steps) timers.current.push(window.setTimeout(() => {
      if ("expr" in s) setExpr(s.expr ?? null);
      if ("act" in s) setAct(reduced.current ? null : s.act ?? null);
      if ("mood" in s) setTmpMood(s.mood ?? null);
      if ("gaze" in s) setGaze(s.gaze ?? null);
    }, s.t));
  }, []);

  // environment: reduced motion, visibility, on-screen
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = mq.matches;
    const onMq = () => { reduced.current = mq.matches; };
    mq.addEventListener?.("change", onMq);
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting; }, { threshold: 0.05 });
    if (ref.current) io.observe(ref.current);
    return () => { mq.removeEventListener?.("change", onMq); io.disconnect(); clear(); };
  }, []);

  // idle behaviour scheduler
  useEffect(() => {
    if (!interactive && mood !== "idle" && mood !== "sit" && mood !== "wag") return;
    if (["sleep", "run", "walk", "bike", "celebrate", "jump"].includes(mood)) return;
    let alive = true; let t = 0;
    const tick = () => {
      if (!alive) return;
      t = window.setTimeout(() => {
        if (visible.current && !document.hidden && !reduced.current && Date.now() > busyUntil.current && Date.now() - lastPointer.current > 2500) {
          const total = IDLE.reduce((a, b) => a + b.w, 0); let r = Math.random() * total;
          const pick = IDLE.find((b) => (r -= b.w) < 0) ?? IDLE[0];
          if (pick.look) {
            const g = { x: (Math.random() < 0.5 ? -1 : 1) * (1.8 + Math.random() * 1.4), y: (Math.random() - 0.5) * 2 };
            play([{ t: 0, gaze: g }, { t: 700, gaze: { x: -g.x * 0.6, y: g.y } }, { t: pick.ms, gaze: null }]);
          } else play([{ t: 0, act: pick.act ?? null, expr: pick.expr ?? null }, { t: pick.ms, act: null, expr: null }]);
        }
        tick();
      }, 2800 + Math.random() * 4200);
    };
    tick();
    return () => { alive = false; clearTimeout(t); };
  }, [mood, interactive, play]);

  // external reactions
  useEffect(() => { if (reaction) play(SCRIPTS[reaction.kind] ?? SCRIPTS.look); }, [reaction?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // explicit gaze target (e.g. the wardrobe slot being changed), in viewport px
  useEffect(() => {
    if (!gazeTarget || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = gazeTarget.x - (r.left + r.width / 2), dy = gazeTarget.y - (r.top + r.height * 0.46);
    const m = Math.hypot(dx, dy) || 1;
    setGaze({ x: (dx / m) * 3.2, y: (dy / m) * 2.6 });
    const t = window.setTimeout(() => setGaze(null), 1600);
    return () => clearTimeout(t);
  }, [gazeTarget?.x, gazeTarget?.y]); // eslint-disable-line react-hooks/exhaustive-deps

  // pointer follow (desktop hover + touch drag), throttled to animation frames
  useEffect(() => {
    if (!interactive) return;
    let raf = 0; let last: PointerEvent | null = null;
    const onMove = (e: PointerEvent) => {
      last = e; lastPointer.current = Date.now();
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0; if (!last || !ref.current || reduced.current) return;
        const r = ref.current.getBoundingClientRect();
        const dx = last.clientX - (r.left + r.width / 2), dy = last.clientY - (r.top + r.height * 0.46);
        const far = Math.hypot(dx, dy) > Math.max(window.innerWidth, 600);
        const m = Math.hypot(dx, dy) || 1, k = Math.min(1, m / 120);
        setGaze(far ? null : { x: (dx / m) * 3.2 * k, y: (dy / m) * 2.6 * k });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, [interactive]);

  const down = () => {
    if (!interactive) return;
    hold.current = window.setTimeout(() => { hold.current = null; sfx("pet"); play([{ t: 0, act: "pet", expr: "squint", mood: "interact" }, { t: 60000, act: null }]); }, 450);
  };
  const up = () => {
    if (!interactive) return;
    if (hold.current === null) { play([{ t: 0, act: null, expr: "smile", mood: null }, { t: 500, expr: null }]); return; } // end of petting
    clearTimeout(hold.current); hold.current = null;
    const now = Date.now(); taps.current = [...taps.current.filter((t) => now - t < 1200), now];
    if (taps.current.length >= 4) { taps.current = []; sfx("cheer"); play([{ t: 0, mood: "jump", expr: "squint" }, { t: 1100, mood: "celebrate", expr: null }, { t: 2300, mood: null }]); }
    else if (taps.current.length >= 2) { sfx("giggle"); play([{ t: 0, act: "hop", expr: "squint", mood: "interact" }, { t: 650, act: "wiggle" }, { t: 1350, act: null, expr: null, mood: null }]); }
    else { sfx("tap"); play([{ t: 0, expr: "ooh", act: "hop" }, { t: 450, expr: "squint", act: null, mood: "happy" }, { t: 1300, expr: null, mood: null }]); }
    onTap?.();
  };

  return (
    <div ref={ref} className={`relative inline-block touch-manipulation ${interactive ? "cursor-pointer" : ""} ${className}`} style={style}
      onPointerDown={down} onPointerUp={up} onPointerLeave={() => { if (hold.current) { clearTimeout(hold.current); hold.current = null; } }}
      onContextMenu={(e) => e.preventDefault()}
      role={interactive ? "button" : undefined} aria-label={interactive ? `${title ?? "Walkie"} — tap to play, hold to pet` : undefined} tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => { if (interactive && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); play([{ t: 0, expr: "ooh", act: "hop" }, { t: 450, expr: "squint", act: null, mood: "happy" }, { t: 1300, expr: null, mood: null }]); onTap?.(); } }}>
      <Walkie mood={tmpMood ?? mood} size={size} accessories={accessories} look={look} fur={fur} expr={expr} act={act} gaze={gaze} title={title} />
    </div>
  );
}
