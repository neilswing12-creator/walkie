"use client";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "../ui/Toast";

type Row = { id: string; status: string; riskScore: number; reasons: { code: string; weight: number; detail?: string }[] | null; history: { at: string; by: string; status: string; note?: string }[] | null; appealText: string | null; appealAt: string | null; createdAt: string; referrer: { id: string; name: string; email: string }; referee: { id: string; name: string; email: string; createdAt: string; verified: boolean } };
type Data = { analytics: Record<string, number> & { topReferrers: { name: string; count: number }[] }; rows: Row[] };
const STATUSES = ["", "UNDER_REVIEW", "SUSPICIOUS", "REJECTED", "REWARD_GRANTED", "QUALIFIED", "VERIFICATION_REQUIRED", "REGISTERED", "PENDING"];
const REASON: Record<string, string> = { SELF_REFERRAL: "Self-referral", DEVICE_SHARED_WITH_REFERRER: "Same install as referrer", EMAIL_ALIAS_DUPLICATE: "Email alias of existing account", DEVICE_MULTI_ACCOUNT: "Install used by several accounts", DEVICE_ALREADY_REDEEMED_WELCOME: "Install already redeemed a trial", DISPOSABLE_EMAIL: "Disposable email domain", NETWORK_SIGNUP_VOLUME: "Many signups from network", NETWORK_SIGNUP_BURST: "Signup burst from network", NETWORK_SHARED_WITH_REFERRER: "Same network as referrer (weak)", REFERRER_VELOCITY: "Referrer velocity", REFERRER_VELOCITY_HIGH: "Referrer velocity (high)", REFERRER_PRIOR_REJECTIONS: "Referrer prior rejections", REFERRAL_LOOP: "Referral loop", REFERRER_MONTHLY_LIMIT: "Referrer monthly reward limit", NO_INSTALL_ID: "No install ID presented" };

export function ReferralsAdmin({ canDecide }: { canDecide: boolean }) {
  const toast = useToast();
  const [status, setStatus] = useState("UNDER_REVIEW");
  const [d, setD] = useState<Data | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => api<Data>(`/api/admin/referrals${status ? `?status=${status}` : ""}`).then(setD).catch((e) => toast("error", e.message)), [status, toast]);
  useEffect(() => { load(); }, [load]);
  const decide = async (id: string, action: "approve" | "reject") => {
    const note = prompt(`${action === "approve" ? "Approve" : "Reject"} — note for the audit log (optional)`) ?? undefined;
    try { await api(`/api/admin/referrals/${id}`, { method: "PATCH", body: { action, note } }); toast("success", `Referral ${action}d`); load(); } catch (e: any) { toast("error", e.message); }
  };
  const a = d?.analytics;
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Referrals</h1>
      <p className="text-[13px] text-walkie-muted">Rewards are decided server-side. Risk signals are hashed and IPs are never stored raw; signal details are visible to admins only. Configure rules in <Link className="underline" href="/admin/settings">Settings → Referrals</Link>.</p>
      {a && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {[["Total", a.total], ["Rewarded", a.successful], ["Pending", a.pending], ["In review", a.review], ["Suspicious", a.suspicious], ["Rejected", a.rejected], ["VIP days granted", a.vipDays], ["Active VIP users", a.activeTrials]].map(([l, v]) => <div key={l as string} className="card p-3"><p className="text-[11px] font-bold text-walkie-muted">{l}</p><p className="font-display text-xl font-semibold">{v}</p></div>)}
      </div>}
      {a && <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <div className="card p-3"><p className="text-[11px] font-bold text-walkie-muted">Conversion (rewarded / all)</p><p className="font-display text-xl font-semibold">{(a.conversion * 100).toFixed(1)}%</p></div>
        <div className="card p-3"><p className="text-[11px] font-bold text-walkie-muted">Flag rate (rejected + suspicious)</p><p className="font-display text-xl font-semibold">{(a.fraudRate * 100).toFixed(1)}%</p></div>
        <div className="card p-3"><p className="text-[11px] font-bold text-walkie-muted">Top referrers</p><p className="text-[13px]">{a.topReferrers.length ? a.topReferrers.slice(0, 5).map((t) => `${t.name} (${t.count})`).join(" · ") : "—"}</p></div>
      </div>}
      <div className="no-scrollbar mt-4 flex gap-1 overflow-x-auto">{STATUSES.map((s) => <button key={s} onClick={() => setStatus(s)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${status === s ? "bg-walkie-blue text-white" : "bg-white text-walkie-slate"}`}>{s ? s.replace(/_/g, " ").toLowerCase() : "all"}</button>)}</div>
      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="text-[11px] uppercase text-walkie-muted"><tr><th className="p-3">Created</th><th>Referrer</th><th>New user</th><th>Status</th><th>Risk</th><th>Appeal</th><th className="pr-3 text-right">Actions</th></tr></thead>
          <tbody>{d?.rows.map((r) => <Fragment key={r.id}>
            <tr key={r.id} className="border-t border-walkie-gray/70 align-top">
              <td className="p-3">{new Date(r.createdAt).toLocaleString()}</td>
              <td className="py-3"><p className="font-bold">{r.referrer.name}</p><p className="text-walkie-muted">{r.referrer.email}</p></td>
              <td className="py-3"><p className="font-bold">{r.referee.name}</p><p className="text-walkie-muted">{r.referee.email}{r.referee.verified ? " · ✓ verified" : ""}</p></td>
              <td className="py-3 font-bold">{r.status.replace(/_/g, " ").toLowerCase()}</td>
              <td className="py-3"><span className={`rounded-full px-2 py-0.5 font-bold ${r.riskScore >= 70 ? "bg-rose-100 text-rose-800" : r.riskScore >= 40 ? "bg-butter text-amber-900" : "bg-mint text-emerald-800"}`}>{r.riskScore}</span></td>
              <td className="max-w-[220px] py-3 text-walkie-muted">{r.appealText ? `“${r.appealText.slice(0, 90)}${r.appealText.length > 90 ? "…" : ""}”` : "—"}</td>
              <td className="py-3 pr-3 text-right"><button className="font-bold text-walkie-blue" onClick={() => setOpen(open === r.id ? null : r.id)}>Details</button>
                {canDecide && r.status !== "REWARD_GRANTED" && <button className="ml-3 font-bold text-emerald-700" onClick={() => decide(r.id, "approve")}>Approve</button>}
                {canDecide && r.status !== "REJECTED" && <button className="ml-3 font-bold text-rose-700" onClick={() => decide(r.id, "reject")}>Reject</button>}</td>
            </tr>
            {open === r.id && <tr key={r.id + "d"} className="bg-walkie-light/60"><td colSpan={7} className="p-3">
              {r.reasons ? <><p className="font-bold">Signals</p><ul className="mt-1 list-disc pl-5">{r.reasons.length ? r.reasons.map((x) => <li key={x.code}>{REASON[x.code] ?? x.code} <span className="text-walkie-muted">(+{x.weight}{x.detail ? ` · ${x.detail}` : ""})</span></li>) : <li>No risk signals</li>}</ul>
                <p className="mt-2 font-bold">History</p><ul className="mt-1 space-y-0.5">{r.history?.map((h, i) => <li key={i} className="text-walkie-muted">{new Date(h.at).toLocaleString()} · {h.by} → <b>{h.status}</b>{h.note ? ` — ${h.note}` : ""}</li>)}</ul></> : <p className="text-walkie-muted">Signal details and history are visible to admins only.</p>}
              {r.appealText && <p className="mt-2"><b>Full appeal:</b> {r.appealText}</p>}
              <p className="mt-2 text-[11px] text-walkie-muted">A shared network alone never rejects a referral. Approving grants both rewards once (idempotent); rejecting a rewarded referral revokes its VIP credits.</p>
            </td></tr>}
          </Fragment>)}</tbody>
        </table>
        {d && !d.rows.length && <p className="p-6 text-center text-walkie-muted">Nothing here.</p>}
      </div>
    </div>
  );
}
