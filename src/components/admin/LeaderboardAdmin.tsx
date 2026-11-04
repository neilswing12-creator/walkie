"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "../ui/Toast";

type Data = {
  period: string;
  analytics: { optedIn: number; participants: number; flagged: number; disqualified: number; openDisputes: number; cheers7d: number; duels: Record<string, number>; settled: { period: string; users: number; coins: number }[] };
  rows: { rank: number; userId: string; name: string; email: string; public: boolean; country: string | null; score: number; flags: string[]; disqualified: { id: string; reason: string } | null }[];
  disqualifications: { id: string; user: string; email: string; period: string | null; reason: string; createdAt: string }[];
  disputes: { id: string; user: string; email: string; text: string; period: string | null; createdAt: string }[];
};

export function LeaderboardAdmin({ canAct }: { canAct: boolean }) {
  const toast = useToast();
  const [period, setPeriod] = useState("week"); const [board, setBoard] = useState("overall"); const [flagged, setFlagged] = useState(false);
  const [d, setD] = useState<Data | null>(null);
  const load = useCallback(() => api<Data>(`/api/admin/leaderboard?period=${period}&board=${board}${flagged ? "&flagged=1" : ""}`).then(setD).catch((e) => toast("error", e.message)), [period, board, flagged, toast]);
  useEffect(() => { load(); }, [load]);
  const act = async (body: object, msg: string) => { try { await api("/api/admin/leaderboard", { body }); toast("success", msg); load(); } catch (e: any) { toast("error", e.message); } };
  const a = d?.analytics;
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Leaderboards</h1>
      <p className="text-[13px] text-walkie-muted">Scores are computed server-side from verified activity. Nothing is removed automatically — review flags, then disqualify for a period (reversible) and the user can request a review. Scoring rules, periods, scopes, rewards and resets live in <Link href="/admin/settings" className="underline">Settings → Leaderboard</Link>; challenges (incl. team mode) in <Link href="/admin/catalog/challenges" className="underline">Challenges</Link>.</p>
      {a && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {[["Public opt-ins", a.optedIn], ["Participants (this week)", a.participants], ["Flagged (top 100)", a.flagged], ["Disqualified", a.disqualified], ["Open disputes", a.openDisputes], ["Cheers (7d)", a.cheers7d], ["Active duels", a.duels.ACTIVE ?? 0]].map(([l, v]) => <div key={l as string} className="card p-3"><p className="text-[11px] font-bold text-walkie-muted">{l}</p><p className="font-display text-xl font-semibold">{v}</p></div>)}
      </div>}
      {a && <div className="card mt-2 p-3 text-[13px]"><p className="font-bold">Settled periods</p><p className="text-walkie-muted">{a.settled.length ? a.settled.map((s) => `${s.period}: ${s.users} users · ${s.coins} coins`).join("  ·  ") : "None yet — the cron job settles each finished week and month."}</p>
        {canAct && <div className="mt-2 flex flex-wrap gap-2"><button className="btn-soft !min-h-0 !py-1.5 text-[12px]" onClick={() => { const p = prompt("Settle which period? e.g. W:2026-10-26 or M:2026-10"); if (p) act({ action: "settle", period: p }, "Settled"); }}>Settle a period…</button></div>}</div>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {["day", "week", "month", "all"].map((p) => <button key={p} onClick={() => setPeriod(p)} className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${period === p ? "bg-walkie-blue text-white" : "bg-white"}`}>{p}</button>)}
        <span className="mx-1 text-walkie-muted">·</span>
        {["overall", "walk", "run", "bike", "steps"].map((b) => <button key={b} onClick={() => setBoard(b)} className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${board === b ? "bg-walkie-ink text-white" : "bg-white"}`}>{b}</button>)}
        <label className="ml-2 flex items-center gap-1.5 text-[12px] font-bold"><input type="checkbox" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} /> flagged only</label>
        <span className="ml-auto text-[12px] text-walkie-muted">{d?.period}</span>
      </div>
      <div className="card mt-2 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="text-[11px] uppercase text-walkie-muted"><tr><th className="p-3">#</th><th>User</th><th>Public</th><th>Score</th><th>Review hints</th><th className="pr-3 text-right">Actions</th></tr></thead>
          <tbody>{d?.rows.map((r) => (
            <tr key={r.userId} className="border-t border-walkie-gray/70 align-top">
              <td className="p-3 font-bold">{r.rank}</td>
              <td className="py-3"><Link href={`/admin/users?q=${encodeURIComponent(r.email)}`} className="font-bold hover:underline">{r.name}</Link><p className="text-walkie-muted">{r.email}{r.country ? ` · ${r.country}` : ""}</p></td>
              <td className="py-3">{r.public ? "yes" : "friends only"}</td>
              <td className="py-3 font-display font-semibold">{r.score.toLocaleString()}</td>
              <td className="py-3">{r.disqualified && <span className="mr-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">on hold: {r.disqualified.reason}</span>}{r.flags.map((f) => <span key={f} className="mr-1 inline-block rounded-full bg-butter px-2 py-0.5 text-[11px] font-bold text-amber-900">{f.replace(/_/g, " ").toLowerCase()}</span>)}{!r.flags.length && !r.disqualified && <span className="text-walkie-muted">—</span>}</td>
              <td className="py-3 pr-3 text-right">
                {canAct && <button className="font-bold text-walkie-blue" onClick={() => act({ action: "recompute", userId: r.userId }, "Recomputed")}>Recompute</button>}
                {canAct && !r.disqualified && <button className="ml-3 font-bold text-rose-700" onClick={() => { const reason = prompt("Reason (shown to staff; user sees a neutral notice)"); if (!reason) return; const all = confirm("Hold on ALL public boards until lifted? Cancel = this period only."); act({ action: "disqualify", userId: r.userId, period: all ? null : d!.period, reason }, "Entry on hold"); }}>Hold entry</button>}
                {canAct && r.disqualified && <button className="ml-3 font-bold text-emerald-700" onClick={() => act({ action: "lift", id: r.disqualified!.id }, "Lifted")}>Lift</button>}
              </td>
            </tr>))}</tbody>
        </table>
        {d && !d.rows.length && <p className="p-6 text-center text-walkie-muted">No scores for this board yet.</p>}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-4"><h2 className="font-display text-lg font-semibold">Disputes</h2>
          {d?.disputes.length ? <ul className="mt-2 space-y-3">{d.disputes.map((x) => <li key={x.id} className="rounded-2xl bg-walkie-light p-3 text-[13px]"><p className="font-bold">{x.user} <span className="font-normal text-walkie-muted">{x.email} · {x.period ?? "all"}</span></p><p className="mt-1">“{x.text}”</p>
            {canAct && <div className="mt-2 flex gap-3"><button className="font-bold text-emerald-700" onClick={() => { const r = prompt("Response to the user"); if (r) act({ action: "resolveDispute", id: x.id, accept: true, response: r }, "Accepted & lifted"); }}>Accept</button><button className="font-bold text-rose-700" onClick={() => { const r = prompt("Response to the user"); if (r) act({ action: "resolveDispute", id: x.id, accept: false, response: r }, "Rejected"); }}>Reject</button></div>}</li>)}</ul> : <p className="mt-2 text-[13px] text-walkie-muted">No open disputes.</p>}
        </section>
        <section className="card p-4"><h2 className="font-display text-lg font-semibold">Active holds</h2>
          {d?.disqualifications.length ? <ul className="mt-2 divide-y divide-walkie-gray/70 text-[13px]">{d.disqualifications.map((x) => <li key={x.id} className="flex items-center gap-2 py-2"><span className="flex-1"><b>{x.user}</b> · {x.period ?? "all boards"} — {x.reason}</span>{canAct && <button className="font-bold text-emerald-700" onClick={() => act({ action: "lift", id: x.id }, "Lifted")}>Lift</button>}</li>)}</ul> : <p className="mt-2 text-[13px] text-walkie-muted">None.</p>}
        </section>
      </div>
    </div>
  );
}
