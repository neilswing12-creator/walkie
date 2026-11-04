import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata = { title: "Security" };
export const dynamic = "force-dynamic";
const LABEL: Record<string, string> = { "auth.login_failed": "Failed logins", "auth.login_throttled": "Login rate-limit hits", "admin.forbidden": "Blocked admin attempts", "payment.webhook_invalid": "Forged / invalid payment webhooks", "payment.verification_failed": "Payment verification failures" };
const ALERT: Record<string, number> = { "auth.login_failed": 100, "auth.login_throttled": 20, "admin.forbidden": 5, "payment.webhook_invalid": 3, "payment.verification_failed": 1 };

export default async function Page() {
  if (!hasRole(await getCurrentUser(), "ADMIN")) redirect("/admin");
  const day = new Date(Date.now() - 86400000), week = new Date(Date.now() - 7 * 86400000);
  const [d1, d7, recent, roleChanges] = await Promise.all([
    db.securityEvent.groupBy({ by: ["kind"], where: { createdAt: { gte: day } }, _count: true }),
    db.securityEvent.groupBy({ by: ["kind"], where: { createdAt: { gte: week } }, _count: true }),
    db.securityEvent.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
    db.auditLog.findMany({ where: { action: { in: ["user.role", "user.status.banned", "user.coins_adjust", "settings.referrals", "settings.leaderboard", "settings.economy"] } }, orderBy: { createdAt: "desc" }, take: 20, include: { actor: { select: { name: true, role: true } } } }),
  ]);
  const n = (rows: typeof d1, k: string) => rows.find((r) => r.kind === k)?._count ?? 0;
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Security monitoring</h1>
      <p className="text-[13px] text-walkie-muted">Events store a hashed IP and user id only — never passwords, tokens or raw IPs. Kept 180 days. See docs/SECURITY.md for the incident response plan.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {Object.keys(LABEL).map((k) => { const v = n(d1, k), hot = v >= ALERT[k]; return (
          <div key={k} className={`card p-3 ${hot ? "ring-2 ring-rose-400" : ""}`}><p className="text-[11px] font-bold text-walkie-muted">{LABEL[k]}</p><p className="font-display text-xl font-semibold">{v} <span className="text-[12px] text-walkie-muted">/24h</span></p><p className="text-[11px] text-walkie-muted">{n(d7, k)} in 7 days{hot ? " · above alert threshold" : ""}</p></div>); })}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card overflow-x-auto p-4"><h2 className="font-display text-lg font-semibold">Recent events</h2>
          <table className="mt-2 w-full text-left text-[12px]"><thead className="text-walkie-muted"><tr><th>When</th><th>Event</th><th>User</th><th>Network</th><th>Details</th></tr></thead>
            <tbody>{recent.map((e) => <tr key={e.id} className="border-t border-walkie-gray/60"><td className="py-1.5">{e.createdAt.toLocaleString()}</td><td>{LABEL[e.kind] ?? e.kind}</td><td className="font-mono">{e.userId?.slice(-6) ?? "—"}</td><td className="font-mono">{e.ipHash?.slice(0, 8) ?? "—"}</td><td className="text-walkie-muted">{e.meta ? JSON.stringify(e.meta).slice(0, 60) : ""}</td></tr>)}</tbody></table>
          {!recent.length && <p className="mt-2 text-[13px] text-walkie-muted">No events yet.</p>}
        </section>
        <section className="card p-4"><h2 className="font-display text-lg font-semibold">Privileged changes</h2>
          <ul className="mt-2 space-y-1 text-[12px]">{roleChanges.map((a) => <li key={a.id}><b>{a.actor.name}</b> ({a.actor.role.toLowerCase()}) · {a.action} · {a.createdAt.toLocaleString()}</li>)}</ul>
          {!roleChanges.length && <p className="mt-2 text-[13px] text-walkie-muted">None yet.</p>}
        </section>
      </div>
    </div>
  );
}
