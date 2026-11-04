"use client";
import Link from "next/link";
import { MyWalkie } from "../mascot/MyWalkie";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { Icon } from "../ui/Icon";
import { Walkie } from "../mascot/Walkie";
import { Loading, ErrorState } from "../ui/States";
import { Sheet } from "../ui/Sheet";
import { useToast } from "../ui/Toast";

type Data = {
  enabled: boolean; code: string; link: string; referrerDays: number; refereeDays: number;
  stats: { successful: number; pending: number; earnedDays: number };
  entitlement: { plus: boolean; source: string | null; trialEndsAt: string | null };
  referrals: { id: string; friend: string; status: string; message: string; createdAt: string; canAppeal: boolean }[];
  received: { id: string; status: string; message: string; canAppeal: boolean } | null;
  credits: { id: string; source: string; days: number; startsAt: string; endsAt: string; status: string }[];
};
const TONE: Record<string, string> = { REWARD_GRANTED: "bg-mint/70 text-emerald-800", QUALIFIED: "bg-mint/70 text-emerald-800", REJECTED: "bg-rose-100 text-rose-800", UNDER_REVIEW: "bg-butter/70 text-amber-900", SUSPICIOUS: "bg-butter/70 text-amber-900" };
const LABEL: Record<string, string> = { PENDING: "Joined", REGISTERED: "Setting up", VERIFICATION_REQUIRED: "Verifying", QUALIFIED: "Verified", REWARD_GRANTED: "Reward added", UNDER_REVIEW: "In review", SUSPICIOUS: "In review", REJECTED: "Not qualified" };

export function InviteClient() {
  const toast = useToast();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [appealFor, setAppealFor] = useState<string | null>(null);
  const [text, setText] = useState("");
  const load = useCallback(() => api<Data>("/api/referrals").then(setD).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  if (err) return <ErrorState message={err} retry={load} />;
  if (!d) return <Loading />;
  const vipLeft = d.entitlement.trialEndsAt ? Math.max(0, Math.ceil((new Date(d.entitlement.trialEndsAt).getTime() - Date.now()) / 86400000)) : 0;
  const copy = async (s: string, what: string) => { try { await navigator.clipboard.writeText(s); toast("success", `${what} copied!`); } catch { toast("error", "Couldn't copy — long-press to copy instead"); } };
  const share = async () => {
    const msg = `Walk with me on Walkie! Join with my link and get ${d.refereeDays} days of Walkie Plus free 🐾`;
    if (navigator.share) { try { await navigator.share({ title: "Join me on Walkie", text: msg, url: d.link }); } catch {} } else copy(`${msg} ${d.link}`, "Invite");
  };
  return (
    <div className="px-4 pb-28 pt-[calc(14px+var(--safe-top))]">
      <Link href="/app/profile" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card" aria-label="Back"><Icon name="back" size={20} /></Link>
      <section className="card mt-4 overflow-hidden text-center">
        <div className="relative bg-gradient-to-b from-walkie-soft/70 via-walkie-pale to-white px-6 pt-6">
          <div className="flex items-end justify-center -space-x-6"><Walkie size={120} mood="happy" /><MyWalkie living size={150} mood="celebrate" /></div>
        </div>
        <div className="p-6 pt-3">
          <h1 className="font-display text-[26px] font-semibold leading-tight">Invite your friends.<br />Grow together!</h1>
          <p className="mt-2 text-[14px] text-walkie-muted">You get <b className="text-walkie-ink">{d.referrerDays} day{d.referrerDays === 1 ? "" : "s"} of VIP</b> for every friend who joins and sets up. They get <b className="text-walkie-ink">{d.refereeDays} days</b> free.</p>
          {!d.enabled && <p className="mt-3 rounded-2xl bg-butter/60 px-4 py-2 text-[13px] font-semibold text-amber-900">Referral rewards are paused right now.</p>}
        </div>
      </section>

      <section className="card mt-3 p-4">
        <p className="text-[12px] font-bold uppercase tracking-wide text-walkie-muted">Your code</p>
        <div className="mt-1 flex items-center gap-2"><p className="flex-1 font-display text-[28px] font-semibold tracking-wider text-walkie-slate">{d.code}</p><button className="btn-soft !px-3" onClick={() => copy(d.code, "Code")}>Copy</button></div>
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-walkie-light px-3 py-2.5"><Icon name="link" size={16} className="text-walkie-blue" /><p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{d.link}</p><button className="text-[13px] font-bold text-walkie-blue" onClick={() => copy(d.link, "Link")}>Copy</button></div>
        <button className="btn-primary mt-3 w-full" onClick={share}><Icon name="share2" size={18} /> Share invite</button>
        <button className="mt-2 w-full text-[12px] font-bold text-walkie-muted underline" onClick={async () => { if (!confirm("Make a new code? Your old link will stop working.")) return; try { await api("/api/referrals/regenerate", { method: "POST" }); load(); toast("success", "New code ready"); } catch (e: any) { toast("error", e.message); } }}>Get a new code</button>
      </section>

      <section className="mt-3 grid grid-cols-3 gap-2">
        {[["Joined & verified", d.stats.successful, "users"], ["In progress", d.stats.pending, "clock"], ["VIP days earned", d.stats.earnedDays, "star"]].map(([l, v, i]) => (
          <div key={l as string} className="card p-3 text-center"><Icon name={i as string} size={18} className="mx-auto text-walkie-blue" /><p className="mt-1 font-display text-[22px] font-semibold">{v}</p><p className="text-[11px] font-bold text-walkie-muted">{l}</p></div>
        ))}
      </section>

      <section className="card mt-3 flex items-center gap-3 p-4">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-200 to-amber-400 text-amber-900"><Icon name="star" size={20} fill="currentColor" /></span>
        <div className="flex-1">
          <p className="font-display text-[17px] font-semibold">{d.entitlement.plus ? (d.entitlement.source === "subscription" ? "Plus member" : `${vipLeft} VIP day${vipLeft === 1 ? "" : "s"} left`) : "No VIP time yet"}</p>
          <p className="text-[12px] text-walkie-muted">{d.entitlement.trialEndsAt ? `VIP ends ${new Date(d.entitlement.trialEndsAt).toLocaleDateString(undefined, { dateStyle: "medium" })} · new days stack on top` : "Invite a friend to earn VIP days"}</p>
        </div>
      </section>

      {d.received && <section className="card mt-3 p-4"><p className="font-display text-[16px] font-semibold">Your welcome trial</p><p className="text-[13px] text-walkie-muted">{d.received.message}</p>{d.received.canAppeal && <button className="mt-2 text-[13px] font-bold text-walkie-blue" onClick={() => setAppealFor(d.received!.id)}>Ask for a review</button>}</section>}

      <h2 className="mt-5 px-1 font-display text-[18px] font-semibold">Your invites</h2>
      {d.referrals.length === 0 ? <p className="card mt-2 p-5 text-center text-[14px] text-walkie-muted">No invites yet. Share your link — Walkie loves new friends!</p> : (
        <ul className="mt-2 space-y-2">{d.referrals.map((r) => (
          <li key={r.id} className="card flex items-start gap-3 p-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-walkie-pale font-display font-semibold text-walkie-slate">{r.friend[0]}</span>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-bold">{r.friend}</p><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TONE[r.status] ?? "bg-walkie-light text-walkie-slate"}`}>{LABEL[r.status] ?? r.status}</span></div><p className="text-[12px] text-walkie-muted">{r.message}</p>{r.canAppeal && <button className="mt-1 text-[12px] font-bold text-walkie-blue" onClick={() => setAppealFor(r.id)}>Appeal</button>}</div>
            <p className="text-[11px] text-walkie-muted">{new Date(r.createdAt).toLocaleDateString()}</p>
          </li>))}</ul>)}

      {d.credits.length > 0 && <><h2 className="mt-5 px-1 font-display text-[18px] font-semibold">VIP history</h2>
        <ul className="card mt-2 divide-y divide-walkie-gray/70">{d.credits.map((c) => <li key={c.id} className="flex items-center justify-between px-4 py-3 text-[13px]"><span className="font-semibold">{c.source === "REFERRAL_WELCOME" ? "Welcome trial" : c.source === "REFERRAL_REFERRER" ? "Friend reward" : c.source}{c.status !== "ACTIVE" && <span className="ml-2 text-rose-700">· {c.status.toLowerCase()}</span>}</span><span className="text-walkie-muted">+{c.days}d · until {new Date(c.endsAt).toLocaleDateString()}</span></li>)}</ul></>}
      <p className="mt-4 text-center text-[11px] text-walkie-muted">Rewards are granted once your friend creates an account and finishes setup. Each person can claim one welcome trial. We may review referrals to keep things fair.</p>

      <Sheet open={!!appealFor} onClose={() => setAppealFor(null)} title="Ask for a review" footer={<button className="btn-primary w-full" disabled={text.trim().length < 10} onClick={async () => { try { const r = await api<{ message: string }>(`/api/referrals/${appealFor}/appeal`, { body: { text } }); toast("success", r.message); setAppealFor(null); setText(""); load(); } catch (e: any) { toast("error", e.message); } }}>Send</button>}>
        <p className="text-[13px] text-walkie-muted">Tell us a little about how you know each other. A person will take a look.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={4} className="input mt-3 w-full py-3" placeholder="e.g. We're roommates and share a Wi-Fi network" />
      </Sheet>
    </div>
  );
}
