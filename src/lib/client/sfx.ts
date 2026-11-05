"use client";
/**
 * Walkie sound effects — short, soft, original sounds synthesised with the Web Audio API (no audio files, nothing to
 * license, ~0 KB). Action sounds only; there is no background music.
 *
 *   sfx("feed")  sfx("coin")  sfx("levelup") …
 *
 * · Off/on + volume are per-device preferences (Profile → Sounds), stored in localStorage; default on at 60 %.
 * · Silent until the first user gesture (browser autoplay rules) and while the tab is hidden.
 * · Everything runs through one compressor + master gain so stacked sounds never clip.
 */
export type Sfx =
  | "tap" | "giggle" | "pet" | "feed" | "drink" | "play" | "squeak"
  | "coin" | "coins" | "reward" | "claim" | "levelup" | "badge" | "discover" | "evolve" | "streak"
  | "buy" | "equip" | "tryon" | "unequip" | "place" | "store" | "rotate" | "undo" | "open"
  | "count" | "go" | "pause" | "resume" | "finish" | "goal"
  | "success" | "error" | "toggle" | "cheer";

const PREF = "walkie.sfx";
type Prefs = { on: boolean; volume: number };
let prefs: Prefs | null = null;
export function sfxPrefs(): Prefs {
  if (prefs) return prefs;
  try { const p = JSON.parse(localStorage.getItem(PREF) ?? "null"); prefs = { on: p?.on !== false, volume: typeof p?.volume === "number" ? Math.min(1, Math.max(0, p.volume)) : 0.6 }; }
  catch { prefs = { on: true, volume: 0.6 }; }
  return prefs;
}
export function setSfxPrefs(p: Partial<Prefs>) {
  prefs = { ...sfxPrefs(), ...p };
  try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch { /* private mode */ }
  if (master && ac) master.gain.setTargetAtTime(prefs.volume * 0.9, ac.currentTime, 0.02);
  window.dispatchEvent(new CustomEvent("walkie:sfx-prefs", { detail: prefs }));
}

let ac: AudioContext | null = null, master: GainNode | null = null;
let unlocked = false;
type Wired = BaseAudioContext & { _out: AudioNode; _verb: AudioNode; _noise: AudioBuffer };

/** Shared output chain: compressor → master gain, plus a tiny synthetic room so chimes sparkle instead of beeping. */
function wire<C extends BaseAudioContext>(c: C, volume: number): C & Wired {
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
  const m = c.createGain(); m.gain.value = volume * 0.9; comp.connect(m).connect(c.destination);
  const verb = c.createConvolver(), len = Math.floor(c.sampleRate * 0.9), ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  verb.buffer = ir; const vIn = c.createGain(); vIn.gain.value = 0.18; vIn.connect(verb).connect(comp);
  const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return Object.assign(c, { _out: comp, _verb: vIn, _noise: nb, _master: m });
}
function ctx(): (AudioContext & Wired) | null {
  if (typeof window === "undefined") return null;
  if (ac) return ac as AudioContext & Wired;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const c = wire(new AC({ latencyHint: "interactive" }), sfxPrefs().volume);
  ac = c; master = (c as unknown as { _master: GainNode })._master;
  return c;
}

/** Call once from app start; unlocks audio on the first tap/click/key (required by browsers & iOS web views). */
export function initSfx() {
  if (typeof window === "undefined" || unlocked) return;
  const unlock = () => { const c = ctx(); if (c && c.state !== "running") c.resume().catch(() => {}); unlocked = true; ["pointerdown", "keydown", "touchend"].forEach((e) => window.removeEventListener(e, unlock, true)); };
  ["pointerdown", "keydown", "touchend"].forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));
  document.addEventListener("visibilitychange", () => { if (!ac) return; document.hidden ? ac.suspend().catch(() => {}) : unlocked && ac.resume().catch(() => {}); });
}

/* ── building blocks ─────────────────────────────────────────── */
type ToneOpt = { type?: OscillatorType; f: number; to?: number; t?: number; d: number; v?: number; a?: number; wet?: number; glide?: number; vib?: number };
function tone(c: Wired, o: ToneOpt) {
  const t0 = c.currentTime + (o.t ?? 0), osc = c.createOscillator(), g = c.createGain();
  osc.type = o.type ?? "sine"; osc.frequency.setValueAtTime(o.f, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.glide ?? o.d));
  if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib; lg.gain.value = o.f * 0.03; l.connect(lg).connect(osc.frequency); l.start(t0); l.stop(t0 + o.d + 0.05); }
  const v = (o.v ?? 0.3), a = o.a ?? 0.005;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
  osc.connect(g); g.connect(c._out); if (o.wet) { const w = c.createGain(); w.gain.value = o.wet; g.connect(w).connect(c._verb); }
  osc.start(t0); osc.stop(t0 + o.d + 0.02);
}
type NoiseOpt = { t?: number; d: number; v?: number; f: number; to?: number; q?: number; type?: BiquadFilterType; a?: number };
function noise(c: Wired, o: NoiseOpt) {
  const t0 = c.currentTime + (o.t ?? 0), src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  src.buffer = c._noise; fl.type = o.type ?? "bandpass"; fl.Q.value = o.q ?? 1.2; fl.frequency.setValueAtTime(o.f, t0);
  if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t0 + o.d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.v ?? 0.25, t0 + (o.a ?? 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
  src.connect(fl).connect(g).connect(c._out); src.start(t0, Math.random() * 0.5); src.stop(t0 + o.d + 0.02);
}
const N = (n: string) => { const m = /^([A-G])(#?)(\d)$/.exec(n)!; const i = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1] as "C"] + (m[2] ? 1 : 0) + (+m[3] - 4) * 12; return 440 * Math.pow(2, i / 12); };
const bell = (c: Wired, n: string, t: number, d = 0.5, v = 0.22, wet = 0.6) => { tone(c, { f: N(n), t, d, v, type: "sine", wet }); tone(c, { f: N(n) * 2.01, t, d: d * 0.6, v: v * 0.25, type: "sine", wet }); tone(c, { f: N(n) * 3.99, t, d: d * 0.25, v: v * 0.08, type: "sine" }); };
const pluck = (c: Wired, n: string, t: number, v = 0.2) => { tone(c, { f: N(n), t, d: 0.22, v, type: "triangle", wet: 0.3 }); };

/** Schedules a whole sound `dt` seconds from now (works for live and offline contexts). */
function later(c: Wired, dt: number, f: (c: Wired) => void) {
  const shifted = new Proxy(c, { get: (t, k) => (k === "currentTime" ? t.currentTime + dt : (Reflect.get(t, k) as unknown) instanceof Function ? (Reflect.get(t, k) as Function).bind(t) : Reflect.get(t, k)) }) as Wired;
  f(shifted);
}

/* ── the sounds ──────────────────────────────────────────────── */
const SOUNDS: Record<Sfx, (c: Wired) => void> = {
  tap: (c) => { tone(c, { f: 520, to: 880, d: 0.1, v: 0.5, glide: 0.06 }); tone(c, { f: 1040, to: 1760, d: 0.06, v: 0.08, glide: 0.05 }); },
  giggle: (c) => [0, 0.08, 0.16].forEach((t, i) => tone(c, { f: 700 + i * 160, to: 1000 + i * 180, t, d: 0.07, v: 0.16, type: "triangle" })),
  pet: (c) => { tone(c, { f: 95, d: 0.9, v: 0.12, type: "triangle", vib: 22, a: 0.12 }); tone(c, { f: 190, d: 0.8, v: 0.05, type: "sine", vib: 22, a: 0.15 }); bell(c, "E6", 0.35, 0.5, 0.08); },
  feed: (c) => { [0, 0.16, 0.32].forEach((t) => { noise(c, { t, d: 0.09, f: 1600, q: 2.5, v: 0.32 }); noise(c, { t: t + 0.03, d: 0.06, f: 3200, q: 3, v: 0.12 }); }); tone(c, { f: 340, to: 220, t: 0.5, d: 0.14, v: 0.14, type: "sine" }); bell(c, "G5", 0.66, 0.35, 0.09); },
  drink: (c) => [0, 0.11, 0.2, 0.31].forEach((t, i) => tone(c, { f: 380 + i * 70, to: 900 + i * 90, t, d: 0.08, v: 0.14 })),
  play: (c) => { [0, 0.2].forEach((t) => { tone(c, { f: 900, to: 1500, t, d: 0.08, v: 0.13, type: "square", glide: 0.05 }); tone(c, { f: 1500, to: 800, t: t + 0.08, d: 0.09, v: 0.1, type: "square" }); }); pluck(c, "C6", 0.42, 0.12); },
  squeak: (c) => { tone(c, { f: 1100, to: 1700, d: 0.07, v: 0.2, type: "square" }); tone(c, { f: 1700, to: 1000, t: 0.07, d: 0.08, v: 0.15, type: "square" }); },
  coin: (c) => { tone(c, { f: N("B5"), d: 0.08, v: 0.16, type: "square" }); tone(c, { f: N("E6"), t: 0.075, d: 0.35, v: 0.15, type: "square", wet: 0.3 }); },
  coins: (c) => [0, 0.07, 0.14, 0.21, 0.3].forEach((t, i) => { tone(c, { f: N(["E6", "G6", "A6", "B6", "E7"][i]), t, d: 0.18, v: 0.09, type: "square", wet: 0.35 }); }),
  reward: (c) => ["C6", "E6", "G6", "C7"].forEach((n, i) => bell(c, n, i * 0.07, 0.6, 0.15)),
  claim: (c) => { SOUNDS.open(c); later(c, 0.14, SOUNDS.reward); later(c, 0.42, SOUNDS.coins); },
  levelup: (c) => { ["C5", "E5", "G5", "C6"].forEach((n, i) => pluck(c, n, i * 0.09, 0.17)); ["C5", "E5", "G5", "C6", "E6"].forEach((n) => tone(c, { f: N(n), t: 0.4, d: 1.1, v: 0.06, type: "triangle", wet: 0.6, a: 0.02 })); bell(c, "G6", 0.42, 0.9, 0.12); },
  badge: (c) => { noise(c, { d: 0.5, f: 3000, to: 9000, q: 0.7, v: 0.06, a: 0.15, type: "highpass" }); ["G5", "D6", "G6", "B6"].forEach((n, i) => bell(c, n, 0.12 + i * 0.09, 0.9, 0.13)); },
  discover: (c) => { tone(c, { f: 300, to: 1200, d: 0.45, v: 0.08, type: "sine", wet: 0.5 }); ["E6", "B6"].forEach((n, i) => bell(c, n, 0.38 + i * 0.12, 0.7, 0.14)); },
  evolve: (c) => { tone(c, { f: 200, to: 800, d: 0.9, v: 0.07, type: "triangle", vib: 8, wet: 0.6 }); ["C6", "E6", "G6", "C7", "E7"].forEach((n, i) => bell(c, n, 0.6 + i * 0.07, 0.7, 0.12)); },
  streak: (c) => { noise(c, { d: 0.35, f: 400, to: 2400, q: 0.8, v: 0.12, a: 0.05 }); bell(c, "A6", 0.22, 0.6, 0.13); },
  buy: (c) => { SOUNDS.coin(c); bell(c, "C7", 0.18, 0.5, 0.09); noise(c, { t: 0.02, d: 0.06, f: 5000, q: 1, v: 0.05 }); },
  equip: (c) => { noise(c, { d: 0.16, f: 1800, to: 5000, q: 0.9, v: 0.22, type: "bandpass" }); tone(c, { f: 420, to: 760, t: 0.08, d: 0.14, v: 0.3 }); },
  tryon: (c) => { noise(c, { d: 0.2, f: 1200, to: 4200, q: 0.7, v: 0.38, a: 0.03 }); tone(c, { f: 880, to: 1320, t: 0.12, d: 0.1, v: 0.08 }); },
  unequip: (c) => { noise(c, { d: 0.14, f: 4200, to: 1400, q: 0.8, v: 0.22 }); tone(c, { f: 640, to: 380, t: 0.05, d: 0.12, v: 0.24 }); },
  place: (c) => { tone(c, { f: 190, to: 90, d: 0.18, v: 0.55 }); noise(c, { d: 0.05, f: 900, q: 1.5, v: 0.12 }); pluck(c, "G5", 0.06, 0.07); },
  store: (c) => { tone(c, { f: 700, to: 300, d: 0.18, v: 0.32 }); noise(c, { d: 0.12, f: 2500, to: 900, v: 0.14 }); },
  rotate: (c) => { noise(c, { d: 0.035, f: 3200, q: 2, v: 0.6 }); noise(c, { t: 0.06, d: 0.035, f: 3900, q: 2, v: 0.45 }); tone(c, { f: 1200, d: 0.04, v: 0.08, type: "triangle" }); },
  undo: (c) => { noise(c, { d: 0.24, f: 4000, to: 700, q: 0.8, v: 0.34, a: 0.02 }); tone(c, { f: 700, to: 420, t: 0.06, d: 0.14, v: 0.1 }); },
  open: (c) => { tone(c, { f: 260, to: 560, d: 0.12, v: 0.34 }); noise(c, { d: 0.12, f: 2600, q: 0.8, v: 0.2 }); },
  count: (c) => tone(c, { f: N("A5"), d: 0.16, v: 0.42, type: "triangle", wet: 0.2 }),
  go: (c) => { tone(c, { f: N("E6"), d: 0.45, v: 0.18, type: "triangle", wet: 0.4 }); tone(c, { f: N("A6"), d: 0.45, v: 0.07, type: "sine", wet: 0.4 }); },
  pause: (c) => { pluck(c, "E5", 0, 0.14); pluck(c, "C5", 0.1, 0.14); },
  resume: (c) => { pluck(c, "C5", 0, 0.14); pluck(c, "E5", 0.1, 0.14); },
  finish: (c) => { ["G5", "C6", "E6", "G6"].forEach((n, i) => pluck(c, n, i * 0.1, 0.15)); bell(c, "C7", 0.42, 0.9, 0.1); },
  goal: (c) => ["E6", "G6", "C7"].forEach((n, i) => bell(c, n, i * 0.09, 0.7, 0.14)),
  cheer: (c) => { ["C6", "E6", "G6", "C7"].forEach((n, i) => pluck(c, n, i * 0.06, 0.12)); noise(c, { d: 0.5, f: 6000, q: 0.5, v: 0.04, a: 0.05, type: "highpass" }); },
  success: (c) => { bell(c, "C6", 0, 0.35, 0.18); bell(c, "G6", 0.08, 0.5, 0.2); },
  error: (c) => { tone(c, { f: 330, to: 300, d: 0.12, v: 0.13, type: "triangle" }); tone(c, { f: 250, to: 210, t: 0.12, d: 0.18, v: 0.12, type: "triangle" }); },
  toggle: (c) => tone(c, { f: 880, d: 0.06, v: 0.34, type: "triangle" }),
};

let lastAt: Partial<Record<Sfx, number>> = {};
/** Play a sound effect. Safe to call anywhere — it's a no-op on the server, when muted, or before the first gesture. */
export function sfx(name: Sfx) {
  if (typeof window === "undefined" || !sfxPrefs().on || document.hidden) return;
  const now = performance.now();
  if ((lastAt[name] ?? 0) > now - 45) return; // de-dupe accidental double triggers
  lastAt[name] = now;
  const c = ctx(); if (!c || !master) return;
  if (c.state !== "running") { if (!unlocked) return; c.resume().catch(() => {}); }
  try { SOUNDS[name](c); } catch { /* never let a sound break the UI */ }
}
export const SFX_NAMES = Object.keys(SOUNDS) as Sfx[];
export const _resetSfxForTests = () => { lastAt = {}; };
/** Renders one sound offline (tests / previews): returns the audio buffer without touching the speakers. */
export async function renderSfx(name: Sfx, seconds = 2.2, rate = 44100): Promise<AudioBuffer> {
  const c = wire(new OfflineAudioContext(2, Math.floor(seconds * rate), rate), 0.6);
  SOUNDS[name](c);
  return c.startRendering();
}
