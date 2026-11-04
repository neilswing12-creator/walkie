"use client";
import { useState } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "../ui/Toast";
const TITLES: Record<string, string> = { branding: "App branding", economy: "Shop economy & rewards", maintenance: "Maintenance mode", notifications: "Notification limits", analytics: "Analytics", ads: "Ads", referrals: "Referrals & VIP trials", leaderboard: "Leaderboards: scoring, periods, rewards & resets", maps: "Maps & Location (use the dedicated page for a guided editor)" };
export function SettingsEditor({ values, integrations }: { values: Record<string, Record<string, any>>; integrations: Record<string, boolean> }) {
  const toast = useToast();
  const [v, setV] = useState(values);
  const save = async (key: string) => { try { const r = await api<Record<string, any>>("/api/admin/settings", { method: "PATCH", body: { key, value: v[key] } }); setV({ ...v, [key]: r }); toast("success", `${TITLES[key]} saved`); } catch (e: any) { toast("error", e.message); } };
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Settings</h1>
      <div className="card p-5"><p className="font-display font-semibold">Integrations (from environment variables)</p><div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(integrations).map(([k, on]) => <span key={k} className={`chip ${on ? "bg-mint text-emerald-800" : "bg-walkie-light text-walkie-muted"}`}>{on ? "●" : "○"} {k}</span>)}</div><p className="mt-2 text-[12px] text-walkie-muted">Secrets are never editable here — set them in your hosting provider. See docs/ENVIRONMENT.md.</p><a href="/admin/maps" className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-walkie-pale px-3 py-2 text-[13px] font-bold text-walkie-blue">Maps & Location — choose Google / Apple / open maps per platform →</a></div>
      {Object.entries(v).map(([key, obj]) => (
        <div key={key} className="card p-5">
          <p className="font-display text-lg font-semibold">{TITLES[key] ?? key}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(obj).map(([f, val]) => (
              <label key={f} className={`block ${val && typeof val === "object" && !Array.isArray(val) ? "sm:col-span-2 lg:col-span-3" : ""}`}><span className="label">{f.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                {typeof val === "boolean" ? <input type="checkbox" className="h-6 w-6 accent-walkie-blue" checked={val} onChange={(e) => setV({ ...v, [key]: { ...obj, [f]: e.target.checked } })} />
                  : (Array.isArray(val) && val.some((x) => typeof x !== "number")) || (val && typeof val === "object" && !Array.isArray(val)) ? <JsonInput value={val} onChange={(nv) => setV({ ...v, [key]: { ...obj, [f]: nv } })} />
                  : Array.isArray(val) ? <input className="input" value={val.join(", ")} onChange={(e) => setV({ ...v, [key]: { ...obj, [f]: e.target.value.split(",").map((x) => Number(x.trim())).filter((x) => !Number.isNaN(x)) } })} />
                  : <input className="input" type={typeof val === "number" ? "number" : "text"} value={val} onChange={(e) => setV({ ...v, [key]: { ...obj, [f]: typeof val === "number" ? Number(e.target.value) : e.target.value } })} />}
              </label>
            ))}
          </div>
          <button className="btn-primary mt-4" onClick={() => save(key)}>Save</button>
        </div>
      ))}
    </div>
  );
}

function JsonInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const [t, setT] = useState(JSON.stringify(value, null, Array.isArray(value) ? 0 : 2));
  const [bad, setBad] = useState(false);
  return <textarea className={`input min-h-[88px] py-2 font-mono text-[12px] ${bad ? "!border-rose-400" : ""}`} value={t} onChange={(e) => { setT(e.target.value); try { onChange(JSON.parse(e.target.value)); setBad(false); } catch { setBad(true); } }} />;
}
