"use client";
import { useState } from "react";
import { api } from "@/lib/client/api";
export function Waitlist() {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (msg) return <p className="py-6 text-center font-display text-lg font-semibold">🐾 {msg}</p>;
  return (
    <form onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); try { const r = await api<{ message: string }>("/api/waitlist", { body: { email: f.get("email"), platform: f.get("platform"), source: "landing" } }); setMsg(r.message); } catch (er: any) { setErr(er.message); } finally { setBusy(false); } }} className="space-y-3">
      <p className="font-display text-xl font-semibold">Get notified</p>
      <label className="block"><span className="sr-only">Email</span><input name="email" type="email" required placeholder="you@example.com" className="input" /></label>
      <div className="grid grid-cols-3 gap-2 text-[13px] font-bold">{[["ios", "iPhone"], ["android", "Android"], ["any", "Both"]].map(([v, l], i) => <label key={v} className="cursor-pointer"><input type="radio" name="platform" value={v} defaultChecked={i === 2} className="peer sr-only" /><span className="block rounded-2xl bg-walkie-light py-2 text-center peer-checked:bg-walkie-blue peer-checked:text-white">{l}</span></label>)}</div>
      {err && <p className="text-[13px] font-semibold text-rose-600">{err}</p>}
      <button className="btn-primary w-full" disabled={busy}>Join the waitlist</button>
      <p className="text-[11px] text-walkie-muted">We'll only email you about the app launch. Unsubscribe anytime.</p>
    </form>
  );
}
