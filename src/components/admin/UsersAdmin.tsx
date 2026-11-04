"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { Sheet } from "../ui/Sheet";
import { useToast } from "../ui/Toast";
import { Loading } from "../ui/States";

type U = { id: string; email: string; name: string; username: string | null; role: string; status: string; createdAt: string; lastActiveAt: string | null; emailVerified: string | null; subscriptions: { status: string }[] };
const RANK: Record<string, number> = { USER: 0, SUPPORT: 1, MODERATOR: 2, ADMIN: 3, OWNER: 4 };
export function UsersAdmin({ myRole, myId }: { myRole: string; myId: string }) {
  const toast = useToast();
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [role, setRole] = useState(""); const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: U[]; count: number; pages: number } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const load = useCallback(() => { const p = new URLSearchParams({ page: String(page), ...(q ? { q } : {}), ...(status ? { status } : {}), ...(role ? { role } : {}) }); api<any>(`/api/admin/users?${p}`).then(setData).catch((e) => toast("error", e.message)); }, [page, q, status, role, toast]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { setDetail(null); if (sel) api(`/api/admin/users/${sel}`).then(setDetail).catch((e) => toast("error", e.message)); }, [sel, toast]);
  const act = async (body: Record<string, unknown>) => { try { await api(`/api/admin/users/${sel}`, { method: "PATCH", body }); toast("success", "Updated"); load(); setSel(null); } catch (e: any) { toast("error", e.message); } };
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl font-semibold">Users {data && <span className="text-walkie-muted">({data.count})</span>}</h1>{myRole === "ADMIN" && <a className="btn-soft min-h-[40px]" href="/api/admin/users/export">Export CSV</a>}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input className="input min-h-[42px] max-w-xs" placeholder="Search name, email, username" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input min-h-[42px] w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Any status</option>{["ACTIVE", "SUSPENDED", "BANNED"].map((s) => <option key={s}>{s}</option>)}</select>
        <select className="input min-h-[42px] w-40" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">Any role</option>{Object.keys(RANK).map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      {!data ? <Loading /> : (
        <div className="card mt-4 overflow-x-auto"><table className="w-full text-left text-[13px]"><thead className="border-b text-[11px] uppercase text-walkie-muted"><tr>{["Name", "Email", "Role", "Status", "Plan", "Joined", "Last active"].map((h) => <th key={h} className="px-3 py-2.5">{h}</th>)}</tr></thead>
          <tbody>{data.rows.map((u) => <tr key={u.id} onClick={() => setSel(u.id)} className="cursor-pointer border-b border-walkie-light/60 hover:bg-walkie-light/60"><td className="px-3 py-2.5 font-bold">{u.name}</td><td className="px-3">{u.email}{!u.emailVerified && <span className="ml-1 text-amber-600">•</span>}</td><td className="px-3">{u.role}</td><td className="px-3"><span className={`chip ${u.status === "ACTIVE" ? "bg-mint text-emerald-800" : u.status === "BANNED" ? "bg-rose-100 text-rose-700" : "bg-butter text-amber-800"}`}>{u.status}</span></td><td className="px-3">{u.subscriptions[0]?.status ?? "Free"}</td><td className="px-3">{u.createdAt.slice(0, 10)}</td><td className="px-3">{u.lastActiveAt?.slice(0, 10) ?? "—"}</td></tr>)}</tbody></table>
          <div className="flex items-center justify-between p-3 text-[13px] font-bold"><button className="btn-soft min-h-[34px]" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button><span>Page {page} / {Math.max(1, data.pages)}</span><button className="btn-soft min-h-[34px]" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></div>
        </div>
      )}
      <Sheet open={!!sel} onClose={() => setSel(null)} title={detail?.user?.name ?? "User"} wide>
        {!detail ? <Loading /> : (
          <div className="space-y-4 text-[14px]">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-4 shadow-card sm:grid-cols-3">
              <p><b>Email</b><br />{detail.user.email}</p><p><b>Role</b><br />{detail.user.role}</p><p><b>Status</b><br />{detail.user.status}{detail.user.statusReason ? ` — ${detail.user.statusReason}` : ""}</p>
              <p><b>Coins</b><br />{detail.user.wallet?.coins ?? 0}</p><p><b>Level</b><br />{detail.user.wallet?.level ?? 1}</p><p><b>Streak</b><br />{detail.user.streak?.current ?? 0} (best {detail.user.streak?.longest ?? 0})</p>
              <p><b>Pets</b><br />{detail.user._count.pets}</p><p><b>Activities</b><br />{detail.user._count.activities}</p>
              {detail.activity ? <p><b>Distance</b><br />{((detail.activity._sum.distanceM ?? 0) / 1000).toFixed(1)} km</p> : <p className="text-walkie-muted">Activity data: moderators+</p>}
            </div>
            <div><p className="label">Subscriptions</p>{detail.user.subscriptions.length ? detail.user.subscriptions.map((s: any) => <p key={s.id}>{s.provider} · {s.planKey} · <b>{s.status}</b> · until {s.currentPeriodEnd?.slice(0, 10) ?? "—"}</p>) : <p className="text-walkie-muted">Free</p>}</div>
            <div><p className="label">Recent ledger</p><div className="max-h-40 overflow-y-auto rounded-2xl bg-white p-3 text-[12px] shadow-card">{detail.ledger.map((l: any) => <p key={l.id} className="flex justify-between"><span>{l.reason}</span><span className={l.coins < 0 ? "text-rose-600" : "text-emerald-700"}>{l.coins > 0 ? "+" : ""}{l.coins} · {l.createdAt.slice(0, 16).replace("T", " ")}</span></p>)}</div></div>
            {sel !== myId && RANK[myRole] >= 2 && (
              <div className="flex flex-wrap gap-2">
                {detail.user.status !== "ACTIVE" && <button className="btn-soft" onClick={() => act({ status: "ACTIVE" })}>Restore</button>}
                {detail.user.status !== "SUSPENDED" && <button className="btn-soft" onClick={() => { const reason = prompt("Reason for suspension?") ?? undefined; act({ status: "SUSPENDED", reason }); }}>Suspend</button>}
                {detail.user.status !== "BANNED" && <button className="btn-danger" onClick={() => { const reason = prompt("Reason for ban?"); if (reason) act({ status: "BANNED", reason, confirmPassword: prompt("Confirm your password to ban") ?? "" }); }}>Ban</button>}
                {RANK[myRole] >= 3 && <select className="input min-h-[44px] w-44" value={detail.user.role} onChange={(e) => { const confirmPassword = prompt("Confirm your password to change roles") ?? ""; act({ role: e.target.value, confirmPassword }); }}>{Object.keys(RANK).map((r) => <option key={r}>{r}</option>)}</select>}
                {RANK[myRole] >= 3 && <button className="btn-soft" onClick={async () => { const amount = Number(prompt("Coin adjustment (e.g. 100 or -50)")); const reason = prompt("Reason?"); if (!amount || !reason) return; const confirmPassword = prompt("Confirm your password") ?? ""; try { await api(`/api/admin/users/${sel}/coins`, { body: { amount, reason, confirmPassword } }); toast("success", "Adjusted"); setSel(null); } catch (e: any) { toast("error", e.message); } }}>Adjust coins</button>}
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
