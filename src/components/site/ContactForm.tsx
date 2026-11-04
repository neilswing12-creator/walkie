"use client";
import { useState } from "react";
import { api } from "@/lib/client/api";
export function ContactForm() {
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (done) return <div className="card p-8 text-center font-display text-lg font-semibold">🐾 {done}</div>;
  return (
    <form className="card space-y-3 p-6" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { const r = await api<{ message: string }>("/api/support", { body: Object.fromEntries(f) }); setDone(r.message); } catch (er: any) { setErr(er.message); } }}>
      <label className="block"><span className="label">Email</span><input name="email" type="email" required className="input" /></label>
      <label className="block"><span className="label">Subject</span><input name="subject" required minLength={3} maxLength={120} className="input" /></label>
      <label className="block"><span className="label">Message</span><textarea name="message" required minLength={10} maxLength={4000} rows={6} className="input py-3" /></label>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {err && <p className="text-[13px] font-semibold text-rose-600">{err}</p>}
      <button className="btn-primary w-full">Send message</button>
    </form>
  );
}
