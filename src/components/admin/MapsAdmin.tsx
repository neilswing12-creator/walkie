"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { clearMapsConfigCache } from "@/lib/client/maps";
import { useToast } from "../ui/Toast";
import { RouteMap } from "../activity/RouteMap";
import type { Capability, MapPlatform, MapProvider, MapsSettings, ProviderStatus } from "@/lib/maps/types";

type Data = { settings: MapsSettings; capabilities: Record<MapPlatform, Record<MapProvider, Capability>>; readiness: Record<MapPlatform, ProviderStatus[]>; credentials: Record<string, boolean | string> };
const PLAT: [MapPlatform, string][] = [["ios", "iOS app"], ["android", "Android app"], ["web", "Web"]];
const NAME: Record<MapProvider, string> = { google: "Google Maps", apple: "Apple Maps", open: "Open map (MapLibre)" };
// a sample loop around Rizal Park, Manila — admin preview only
const SAMPLE: [number, number][] = Array.from({ length: 40 }, (_, i) => { const a = (i / 39) * Math.PI * 2; return [14.5826 + Math.sin(a) * 0.0032, 120.9787 + Math.cos(a) * 0.0045]; });

export function MapsAdmin() {
  const toast = useToast();
  const [d, setD] = useState<Data | null>(null);
  const [s, setS] = useState<MapsSettings | null>(null);
  const [preview, setPreview] = useState<MapProvider | null>(null);
  const [impl, setImpl] = useState<string | null>(null);
  const load = useCallback(() => api<Data>("/api/admin/maps").then((x) => { setD(x); setS(x.settings); }).catch((e) => toast("error", e.message)), [toast]);
  useEffect(() => { load(); }, [load]);
  if (!d || !s) return <p className="text-walkie-muted">Loading…</p>;
  const toggle = (p: MapPlatform, prov: MapProvider) => setS({ ...s, [p]: s[p].includes(prov) ? s[p].filter((x) => x !== prov) : [...s[p], prov] });
  const move = (p: MapPlatform, i: number, dir: -1 | 1) => { const l = [...s[p]]; const j = i + dir; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setS({ ...s, [p]: l }); };
  const save = async () => { try { await api("/api/admin/settings", { method: "PATCH", body: { key: "maps", value: s } }); clearMapsConfigCache(); toast("success", "Saved — apps pick this up on their next refresh (within ~5 minutes)"); load(); } catch (e: any) { toast("error", e.message); } };
  const ready = (p: MapPlatform, prov: MapProvider) => d.readiness[p].find((r) => r.provider === prov);
  return (
    <div className="max-w-5xl">
      <p className="text-[12px] font-bold uppercase tracking-wide text-walkie-muted">Settings › Integrations</p>
      <h1 className="font-display text-2xl font-semibold">Maps & Location</h1>
      <p className="mt-1 text-[13px] text-walkie-muted">Choose which map provider each platform uses, in priority order. Apps read this from the server, so changes apply without an app update (on the next refresh, within ~5 minutes). If the first provider can't load, the next <b>enabled</b> one is used — a provider you turn off is never used. With nothing enabled, routes are drawn without a map background.</p>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {PLAT.map(([p, label]) => (
          <section key={p} className="card p-4">
            <h2 className="font-display text-lg font-semibold">{label}</h2>
            <ol className="mt-2 space-y-2">
              {s[p].map((prov, i) => { const r = ready(p, prov); return (
                <li key={prov} className="flex items-center gap-2 rounded-2xl bg-walkie-light px-3 py-2 text-[13px]">
                  <span className="font-display font-semibold text-walkie-blue">{i + 1}</span>
                  <span className="flex-1"><b>{NAME[prov]}</b><span className={`block text-[11px] ${r?.ready ? "text-emerald-700" : "text-amber-700"}`}>{r?.ready ? "Ready" : r?.reason}</span></span>
                  <button className="px-1 font-bold" disabled={i === 0} onClick={() => move(p, i, -1)} aria-label="Move up">↑</button>
                  <button className="px-1 font-bold" disabled={i === s[p].length - 1} onClick={() => move(p, i, 1)} aria-label="Move down">↓</button>
                </li>); })}
              {s[p].length === 0 && <li className="rounded-2xl bg-butter/50 px-3 py-2 text-[12px] font-semibold text-amber-900">Maps off — routes drawn without a map</li>}
            </ol>
            <div className="mt-3 space-y-2">
              {(["google", "apple", "open"] as MapProvider[]).map((prov) => { const cap = d.capabilities[p][prov]; return (
                <label key={prov} className={`flex items-start gap-2 text-[13px] ${cap.supported ? "" : "opacity-60"}`}>
                  <input type="checkbox" className="mt-0.5 h-5 w-5 accent-walkie-blue" disabled={!cap.supported} checked={s[p].includes(prov)} onChange={() => toggle(p, prov)} />
                  <span><b>{NAME[prov]}</b> <span className="text-walkie-muted">— {cap.how}</span>{cap.note && <span className="block text-[11px] text-walkie-muted">{cap.note}</span>}</span>
                </label>); })}
            </div>
          </section>
        ))}
      </div>

      <section className="card mt-3 p-4 text-[13px]">
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 h-5 w-5 accent-walkie-blue" checked={s.googleNativeSdk} onChange={(e) => setS({ ...s, googleNativeSdk: e.target.checked })} />
          <span><b>Use the native Google Maps SDK in the iOS/Android apps</b><span className="block text-[11px] text-walkie-muted">Off = Google Maps JavaScript API inside the app. On = native SDK (needs GOOGLE_MAPS_IOS_KEY / GOOGLE_MAPS_ANDROID_KEY), automatically falling back to the JavaScript API if the SDK can't start.</span></span></label>
      </section>

      <section className="card mt-3 p-4 text-[13px]">
        <h2 className="font-display text-lg font-semibold">Credentials (server environment)</h2>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {[["GOOGLE_MAPS_WEB_KEY", d.credentials.googleWeb, "Maps JavaScript API — restrict to HTTP referrer walkie.run/*"], ["GOOGLE_MAPS_IOS_KEY", d.credentials.googleIos, "Maps SDK for iOS — restrict to bundle id run.walkie.app"], ["GOOGLE_MAPS_ANDROID_KEY", d.credentials.googleAndroid, "Maps SDK for Android — restrict to package run.walkie.app + signing SHA-1"], ["APPLE_MAPKIT_TEAM_ID / KEY_ID / PRIVATE_KEY", d.credentials.appleMapkit, "MapKit JS key from developer.apple.com (tokens are minted server-side, 30-min, origin-bound)"]].map(([k, on, note]) => (
            <li key={k as string}><span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${on ? "bg-emerald-500" : "bg-rose-400"}`} /><code>{k as string}</code> <span className="text-walkie-muted">· {on ? "set" : "missing"} — {note as string}</span></li>))}
          <li><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" /><code>MAP_STYLE_URL</code> <span className="text-walkie-muted">· {String(d.credentials.openStyle)} (no key needed for OpenFreeMap)</span></li>
        </ul>
        <p className="mt-2 text-[11px] text-walkie-muted">Map keys used by browsers and apps are visible to users by design — protect them with the restrictions above and API quotas in Google Cloud. Keys are set in the server's .env, never in this panel.</p>
      </section>

      <div className="mt-4 flex gap-2"><button className="btn-primary" onClick={save}>Save map settings</button><button className="btn-soft" onClick={() => setS(d.settings)}>Reset changes</button></div>

      <section className="card mt-4 p-4">
        <h2 className="font-display text-lg font-semibold">Preview on this browser (web)</h2>
        <p className="text-[12px] text-walkie-muted">Sample route around Rizal Park. Uses the saved web configuration; pick one provider to test it alone.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">{([null, "google", "apple", "open"] as (MapProvider | null)[]).map((x) => <button key={x ?? "auto"} onClick={() => { clearMapsConfigCache(); setImpl(null); setPreview(x); }} className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${preview === x ? "bg-walkie-blue text-white" : "bg-walkie-light"}`}>{x ? NAME[x] : "Configured order"}</button>)}</div>
        <div className="mt-3"><RouteMap key={preview ?? "auto"} points={SAMPLE} height={280} only={preview ?? undefined} onProvider={setImpl} /></div>
        <p className="mt-1 text-[12px] text-walkie-muted">Rendered with: <b>{impl ?? "no map (provider disabled, unconfigured or failed) — SVG route"}</b></p>
      </section>
    </div>
  );
}
