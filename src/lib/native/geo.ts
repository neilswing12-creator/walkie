"use client";
/**
 * Location tracking. Native (Capacitor) → @capacitor/geolocation; web → navigator.geolocation.
 * Honest about limits: browsers suspend GPS when the tab is backgrounded or the screen locks.
 * Continuous background tracking on iOS/Android requires a background-location plugin (see docs/MOBILE.md).
 */
import { isNative } from "./platform";

export type Fix = { lat: number; lng: number; accuracy: number; altitude: number | null; t: number; speed: number | null };
export type GeoStatus = "idle" | "requesting" | "denied" | "unavailable" | "searching" | "ok";

export async function watchLocation(onFix: (f: Fix) => void, onStatus: (s: GeoStatus, msg?: string) => void): Promise<() => void> {
  onStatus("requesting");
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    try {
      const perm = await Geolocation.requestPermissions({ permissions: ["location"] });
      if (perm.location === "denied") { onStatus("denied", "Location permission is off. Enable it in Settings to record your route."); return () => {}; }
    } catch { /* web fallback inside plugin */ }
    onStatus("searching");
    const id = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }, (pos, err) => {
      if (err || !pos) { onStatus("unavailable", err?.message ?? "GPS unavailable"); return; }
      onStatus("ok");
      onFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, altitude: pos.coords.altitude ?? null, t: pos.timestamp, speed: pos.coords.speed ?? null });
    });
    return () => { Geolocation.clearWatch({ id }); };
  }
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) { onStatus("unavailable", "This browser can't access GPS."); return () => {}; }
  onStatus("searching");
  const id = navigator.geolocation.watchPosition(
    (pos) => { onStatus("ok"); onFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, altitude: pos.coords.altitude, t: pos.timestamp, speed: pos.coords.speed }); },
    (err) => onStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable", err.code === err.PERMISSION_DENIED ? "Location permission was denied. Allow it in your browser settings to record a route." : "Can't get a GPS signal. Try moving outdoors."),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

/** Keep the screen awake during web tracking where supported. */
export async function keepAwake(): Promise<() => void> {
  try {
    const lock = await (navigator as any).wakeLock?.request("screen");
    return () => lock?.release?.();
  } catch { return () => {}; }
}
