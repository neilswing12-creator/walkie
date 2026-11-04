"use client";
/**
 * Client-side map provider loading. Reads the admin's per-platform configuration from the backend (cached 5 min, so a
 * change applies on the next refresh — no app update), then tries the enabled providers in order. A provider that fails
 * to load falls through to the next *enabled* one; a provider the admin disabled is never used.
 */
import type { MapPlatform, MapProvider, MapsClientConfig } from "../maps/types";

export function currentPlatform(): MapPlatform {
  if (typeof window === "undefined") return "web";
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const p = cap?.getPlatform?.();
  return p === "ios" || p === "android" ? p : "web";
}

let cache: { at: number; cfg: MapsClientConfig } | null = null;
let inflight: Promise<MapsClientConfig | null> | null = null;
export async function getMapsConfig(force = false): Promise<MapsClientConfig | null> {
  if (!force && cache && Date.now() - cache.at < 300000) return cache.cfg;
  inflight ??= fetch(`/api/maps/config?platform=${currentPlatform()}`, { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null)).then((j) => { const cfg = j?.data ?? null; if (cfg) cache = { at: Date.now(), cfg }; return cfg; })
    .catch(() => null).finally(() => { inflight = null; });
  return inflight;
}
export const clearMapsConfigCache = () => { cache = null; };

const scripts = new Map<string, Promise<void>>();
function loadScript(src: string, attrs: Record<string, string> = {}) {
  if (!scripts.has(src)) scripts.set(src, new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = src; s.async = true; s.crossOrigin = "anonymous";
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    s.onload = () => res(); s.onerror = () => { scripts.delete(src); rej(new Error(`failed to load ${src}`)); };
    document.head.appendChild(s);
  }));
  return scripts.get(src)!;
}

type LatLng = [number, number]; // [lat, lng]
export type MapHandle = { destroy: () => void; provider: MapProvider; impl: string };
const BLUE = "#6B8FD6", START = "#5DBE9A", END = "#242B35";
const bounds = (pts: LatLng[]) => { const la = pts.map((p) => p[0]), ln = pts.map((p) => p[1]); return { s: Math.min(...la), n: Math.max(...la), w: Math.min(...ln), e: Math.max(...ln) }; };

async function openMap(el: HTMLElement, pts: LatLng[], styleUrl: string): Promise<MapHandle> {
  const maplibre = await import("maplibre-gl");
  maplibre.setWorkerUrl?.("/vendor/maplibre/maplibre-gl-worker.mjs"); // v6: worker served from our origin (scripts/copy-vendor.mjs)
  await import("maplibre-gl/dist/maplibre-gl.css" as string).catch(() => {});
  const b = bounds(pts), coords = pts.map((p) => [p[1], p[0]]);
  const map = new maplibre.Map({ container: el, style: styleUrl, bounds: [[b.w, b.s], [b.e, b.n]], fitBoundsOptions: { padding: 36 }, attributionControl: { compact: true } });
  // draw as soon as the style is ready (don't wait for every tile — slow mobile networks)
  await new Promise<void>((res, rej) => {
    let done = false; const ok = () => { if (!done && map.isStyleLoaded()) { done = true; res(); } };
    map.on("styledata", ok); map.once("load", ok);
    map.once("error", (e: unknown) => { if (!done) { done = true; rej(e); } });
    setTimeout(() => { if (!done) { done = true; rej(new Error("map style timeout")); } }, 15000);
  });
  map.addSource("route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } } });
  map.addLayer({ id: "casing", type: "line", source: "route", paint: { "line-color": "#fff", "line-width": 9 }, layout: { "line-cap": "round", "line-join": "round" } });
  map.addLayer({ id: "line", type: "line", source: "route", paint: { "line-color": BLUE, "line-width": 5 }, layout: { "line-cap": "round", "line-join": "round" } });
  const dot = (c: number[], color: string) => { const d = document.createElement("div"); d.style.cssText = `width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.2)`; new maplibre.Marker({ element: d }).setLngLat(c as [number, number]).addTo(map); };
  dot(coords[0], START); dot(coords[coords.length - 1], END);
  return { destroy: () => map.remove(), provider: "open", impl: "maplibre" };
}

async function googleJs(el: HTMLElement, pts: LatLng[], key: string): Promise<MapHandle> {
  const w = window as unknown as { google?: any; __wkGmaps?: () => void };
  if (!w.google?.maps) {
    const ready = new Promise<void>((res) => { w.__wkGmaps = () => res(); });
    await loadScript(`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=__wkGmaps`);
    await Promise.race([ready, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000))]);
  }
  const g = w.google.maps;
  const map = new g.Map(el, { disableDefaultUI: true, zoomControl: true, gestureHandling: "cooperative", clickableIcons: false });
  const path = pts.map(([lat, lng]) => ({ lat, lng }));
  new g.Polyline({ path, map, strokeColor: "#fff", strokeWeight: 9, strokeOpacity: 1 });
  new g.Polyline({ path, map, strokeColor: BLUE, strokeWeight: 5, strokeOpacity: 1 });
  const dot = (p: { lat: number; lng: number }, color: string) => new g.Marker({ position: p, map, icon: { path: g.SymbolPath.CIRCLE, scale: 7, fillColor: color, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 } });
  dot(path[0], START); dot(path[path.length - 1], END);
  const b = bounds(pts); map.fitBounds({ south: b.s, north: b.n, west: b.w, east: b.e }, 36);
  return { destroy: () => { el.innerHTML = ""; }, provider: "google", impl: "google-js" };
}

/** Native Google Maps SDK. The SDK draws *underneath* the web view, so the map's ancestors are made transparent while it's shown. */
async function googleNative(el: HTMLElement, pts: LatLng[], key: string): Promise<MapHandle> {
  const { GoogleMap } = await import("@capacitor/google-maps");
  const b = bounds(pts);
  const span = Math.max(b.n - b.s, (b.e - b.w) * Math.cos(((b.n + b.s) / 2) * (Math.PI / 180)), 0.002);
  const zoom = Math.max(3, Math.min(18, Math.floor(Math.log2(360 / span)) - 1));
  const holder = document.createElement("capacitor-google-map") as HTMLElement;
  holder.style.cssText = "display:block;width:100%;height:100%";
  el.appendChild(holder);
  const restored: [HTMLElement, string][] = [];
  for (let n: HTMLElement | null = el; n; n = n.parentElement) { restored.push([n, n.style.background]); n.style.background = "transparent"; }
  const map = await GoogleMap.create({ id: `wk-${Math.random().toString(36).slice(2)}`, element: holder, apiKey: key, config: { center: { lat: (b.n + b.s) / 2, lng: (b.e + b.w) / 2 }, zoom } });
  const path = pts.map(([lat, lng]) => ({ lat, lng }));
  await map.addPolylines([{ path, strokeColor: BLUE, strokeWeight: 5 }]);
  await map.addMarkers([{ coordinate: path[0], title: "Start" }, { coordinate: path[path.length - 1], title: "Finish" }]);
  return { destroy: () => { map.destroy().catch(() => {}); restored.forEach(([n, bg]) => { n.style.background = bg; }); holder.remove(); }, provider: "google", impl: "google-native" };
}

async function appleJs(el: HTMLElement, pts: LatLng[], tokenUrl: string, platform: MapPlatform): Promise<MapHandle> {
  const w = window as unknown as { mapkit?: any; __wkMapkitInit?: boolean };
  if (!w.mapkit) await loadScript("https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.core.js", { "data-libraries": "map,overlays,annotations" });
  for (let i = 0; i < 50 && !w.mapkit?.Map; i++) await new Promise((r) => setTimeout(r, 100)); // libraries load lazily
  const mk = w.mapkit;
  if (!mk?.Map) throw new Error("MapKit JS unavailable");
  if (!w.__wkMapkitInit) {
    mk.init({ authorizationCallback: (done: (t: string) => void) => { fetch(`${tokenUrl}?platform=${platform === "ios" ? "ios" : "web"}`, { credentials: "same-origin" }).then((r) => r.json()).then((j) => done(j?.data?.token ?? "")).catch(() => done("")); } });
    w.__wkMapkitInit = true;
  }
  const map = new mk.Map(el, { showsCompass: mk.FeatureVisibility.Hidden, showsScale: mk.FeatureVisibility.Hidden, isRotationEnabled: false });
  const coords = pts.map(([lat, lng]) => new mk.Coordinate(lat, lng));
  const line = new mk.PolylineOverlay(coords, { style: new mk.Style({ lineWidth: 5, strokeColor: BLUE, lineCap: "round", lineJoin: "round" }) });
  map.addOverlay(line);
  map.addAnnotations([new mk.MarkerAnnotation(coords[0], { color: START, title: "Start" }), new mk.MarkerAnnotation(coords[coords.length - 1], { color: END, title: "Finish" })]);
  map.showItems([line], { animate: false, padding: new mk.Padding(36, 36, 36, 36) });
  return { destroy: () => map.destroy(), provider: "apple", impl: "mapkit-js" };
}

/** Mounts a route map with the first working enabled provider. Returns null when none work (caller draws the SVG route). */
export async function mountRouteMap(el: HTMLElement, pts: LatLng[], opts: { only?: MapProvider } = {}): Promise<MapHandle | null> {
  const cfg = await getMapsConfig();
  if (!cfg || pts.length < 2) return null;
  const order = cfg.providers.filter((p) => p.ready && (!opts.only || p.provider === opts.only)).map((p) => p.provider);
  for (const p of order) {
    try {
      el.innerHTML = "";
      if (p === "open" && cfg.open) return await openMap(el, pts, cfg.open.styleUrl);
      if (p === "google" && cfg.google) {
        if (cfg.google.useNative && cfg.google.nativeKey) { try { return await googleNative(el, pts, cfg.google.nativeKey); } catch (e) { console.warn("[maps] native Google SDK failed, using JS API", e); } }
        if (cfg.google.jsKey) return await googleJs(el, pts, cfg.google.jsKey);
      }
      if (p === "apple" && cfg.apple) return await appleJs(el, pts, cfg.apple.tokenUrl, cfg.platform);
    } catch (e: any) { console.warn(`[maps] ${p} failed, trying next enabled provider:`, e?.error?.message ?? e?.message ?? String(e)); }
  }
  return null;
}
