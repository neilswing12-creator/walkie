/**
 * Fitness calculations shared by the client tracker (live display) and the server
 * (authoritative recomputation before any reward is granted).
 */
import { ACTIVITY_META, type ActivityType, type ActivityFamily } from "./constants";

/** [lat, lng, timestampMs, accuracyM, altitudeM | null] */
export type RawPoint = [number, number, number, number, number | null];

const R = 6371008.8; // mean Earth radius (m)
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export const MAX_ACCURACY_M = 35;
export const MIN_SEGMENT_M = 3;
/** Absolute physical cap (m/s) used to reject GPS teleport jumps. */
export const MAX_SEGMENT_SPEED: Record<ActivityFamily, number> = { walk: 4.5, run: 10, bike: 22, other: 10 };
/** Average-speed ceilings above which an activity is flagged (likely vehicle). */
export const MAX_AVG_SPEED: Record<ActivityFamily, number> = { walk: 2.8, run: 6.7, bike: 16.7, other: 6.7 };

export interface ProcessedRoute {
  points: [number, number, number, number | null][]; // lat, lng, tSec(relative), alt
  distanceM: number;
  elevationGainM: number | null;
  maxSpeedMps: number;
  splits: { km: number; sec: number }[]; // seconds per completed km
  bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number } | null;
  rejected: number;
}

/** `mode` accepts a family, or a boolean (true = run) for backwards compatibility. */
export function processRoute(raw: RawPoint[], mode: ActivityFamily | boolean): ProcessedRoute {
  if (typeof mode === "boolean") mode = mode ? "run" : "walk";
  const sorted = [...raw]
    .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180 && p[3] <= MAX_ACCURACY_M)
    .sort((a, b) => a[2] - b[2]);
  const out: ProcessedRoute = { points: [], distanceM: 0, elevationGainM: null, maxSpeedMps: 0, splits: [], bbox: null, rejected: raw.length - sorted.length };
  if (sorted.length === 0) return out;

  const t0 = sorted[0][2];
  let anchor = sorted[0];
  out.points.push([anchor[0], anchor[1], 0, anchor[4]]);
  let nextKm = 1000;
  let lastSplitT = 0;
  let altRef: number | null = anchor[4];
  let gain = 0;
  let hasAlt = anchor[4] != null;

  for (let i = 1; i < sorted.length; i++) {
    const p = sorted[i];
    const d = haversine(anchor[0], anchor[1], p[0], p[1]);
    const dt = (p[2] - anchor[2]) / 1000;
    if (dt <= 0) continue;
    if (d < MIN_SEGMENT_M) continue; // GPS jitter while standing still
    const speed = d / dt;
    if (speed > MAX_SEGMENT_SPEED[mode]) {
      out.rejected++;
      continue; // teleport / vehicle jump — skip point
    }
    out.maxSpeedMps = Math.max(out.maxSpeedMps, speed);
    const prevDist = out.distanceM;
    out.distanceM += d;
    const tRel = (p[2] - t0) / 1000;
    while (out.distanceM >= nextKm) {
      // interpolate the moment the km boundary was crossed
      const frac = (nextKm - prevDist) / d;
      const tCross = (anchor[2] - t0) / 1000 + dt * frac;
      out.splits.push({ km: nextKm / 1000, sec: Math.round(tCross - lastSplitT) });
      lastSplitT = tCross;
      nextKm += 1000;
    }
    if (p[4] != null) {
      hasAlt = true;
      if (altRef == null) altRef = p[4];
      else if (p[4] - altRef > 2) {
        gain += p[4] - altRef;
        altRef = p[4];
      } else if (altRef - p[4] > 2) altRef = p[4];
    }
    out.points.push([round6(p[0]), round6(p[1]), Math.round(tRel), p[4] == null ? null : Math.round(p[4] * 10) / 10]);
    anchor = p;
  }
  out.elevationGainM = hasAlt ? Math.round(gain) : null;
  out.distanceM = Math.round(out.distanceM * 10) / 10;
  const lats = out.points.map((p) => p[0]);
  const lngs = out.points.map((p) => p[1]);
  out.bbox = { minLat: Math.min(...lats), minLng: Math.min(...lngs), maxLat: Math.max(...lats), maxLng: Math.max(...lngs) };
  return out;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Pace in seconds per km, or null when distance is too small to be meaningful. */
export function paceSecPerKm(distanceM: number, durationSec: number): number | null {
  if (distanceM < 50 || durationSec <= 0) return null;
  return durationSec / (distanceM / 1000);
}

export function formatPace(secPerKm: number | null | undefined, units: "metric" | "imperial" = "metric"): string {
  if (!secPerKm || !Number.isFinite(secPerKm)) return "–'––\"";
  const s = units === "imperial" ? secPerKm * 1.609344 : secPerKm;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}'${String(r === 60 ? 59 : r).padStart(2, "0")}"`;
}

export function formatSpeed(mps: number | null | undefined, units: "metric" | "imperial" = "metric"): string {
  if (!mps || !Number.isFinite(mps)) return "–";
  return (mps * (units === "imperial" ? 2.23694 : 3.6)).toFixed(1);
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDistance(m: number, units: "metric" | "imperial" = "metric", digits = 2): string {
  if (units === "imperial") return `${(m / 1609.344).toFixed(digits)} mi`;
  return m < 1000 && digits > 0 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(digits)} km`;
}

/** Calories via MET × body mass × hours. Defaults to 70 kg when weight is unknown (clearly an estimate). */
export function estimateCalories(type: ActivityType, durationSec: number, weightKg?: number | null, avgSpeedMps?: number): number {
  let met = ACTIVITY_META[type].met;
  const fam = ACTIVITY_META[type].family;
  if (avgSpeedMps && avgSpeedMps > 0) {
    const kmh = avgSpeedMps * 3.6;
    if (fam === "bike") met = kmh < 16 ? 4 : kmh < 19 ? 6.8 : kmh < 22 ? 8 : kmh < 25 ? 10 : 12;
    else if (fam === "run") met = Math.max(6, Math.min(14.5, 1.03 * kmh)); // ~1 MET per km/h for running
    else if (type !== "FREE_WORKOUT") met = kmh < 3.2 ? 2.8 : kmh < 4.8 ? 3.5 : kmh < 5.6 ? 4.3 : 5.0;
  }
  const kg = weightKg && weightKg > 25 && weightKg < 300 ? weightKg : 70;
  return Math.round(met * kg * (durationSec / 3600));
}

/** Steps estimated from distance and stride length (labelled "estimated" in UI). */
export function estimateSteps(distanceM: number, running: boolean, heightCm?: number | null): number {
  const stride = heightCm && heightCm > 100 && heightCm < 230 ? (heightCm / 100) * (running ? 0.65 : 0.415) : running ? 1.1 : 0.75;
  return Math.round(distanceM / stride);
}

export interface Plausibility {
  ok: boolean;
  reason?: string;
}

export function checkPlausibility(type: ActivityType, distanceM: number, movingSec: number, elapsedSec: number, maxAvg: Record<ActivityFamily, number> = MAX_AVG_SPEED): Plausibility {
  if (movingSec <= 0 || elapsedSec <= 0) return { ok: false, reason: "No recorded time" };
  if (movingSec > elapsedSec + 5) return { ok: false, reason: "Moving time exceeds elapsed time" };
  if (elapsedSec > 8 * 3600) return { ok: false, reason: "Activity longer than 8 hours" };
  const fam = ACTIVITY_META[type].family;
  const avg = distanceM / movingSec;
  const word = { walk: "walking", run: "running", bike: "cycling", other: "this workout" }[fam];
  if (distanceM > 0 && avg > maxAvg[fam]) return { ok: false, reason: `Average speed ${(avg * 3.6).toFixed(1)} km/h is too fast for ${word}` };
  if (fam === "walk" && distanceM > 60000) return { ok: false, reason: "Walking distance implausibly long" };
  if (fam === "bike" && distanceM > 400000) return { ok: false, reason: "Ride distance implausibly long" };
  return { ok: true };
}
