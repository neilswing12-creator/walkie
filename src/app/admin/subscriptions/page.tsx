import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { integrationStatus } from "@/lib/env";
export const metadata = { title: "Subscriptions" };
export default async function Page() {
  if (!hasRole(await getCurrentUser(), "ADMIN")) redirect("/admin");
  const [subs, events, by] = await Promise.all([
    db.subscription.findMany({ orderBy: { updatedAt: "desc" }, take: 200, include: { user: { select: { email: true } } } }),
    db.paymentEvent.findMany({ orderBy: { processedAt: "desc" }, take: 100 }),
    db.subscription.groupBy({ by: ["status"], _count: true }),
  ]);
  const s = integrationStatus();
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold">Subscriptions</h1>
      <div className="flex flex-wrap gap-2"><span className={`chip ${s.stripe ? "bg-mint text-emerald-800" : "bg-butter text-amber-800"}`}>Stripe {s.stripe ? "connected" : "not configured"}</span><span className={`chip ${s.revenuecat ? "bg-mint text-emerald-800" : "bg-butter text-amber-800"}`}>RevenueCat {s.revenuecat ? "connected" : "not configured"}</span>{by.map((b) => <span key={b.status} className="chip bg-walkie-pale text-walkie-blue">{b.status}: {b._count}</span>)}</div>
      <p className="text-[13px] text-walkie-muted">Status is written only by verified provider webhooks. Manage plans, prices and trials under <a className="font-bold text-walkie-blue" href="/admin/catalog/plans">Plans</a>.</p>
      <div className="card overflow-x-auto"><table className="w-full text-left text-[13px]"><thead className="border-b text-[11px] uppercase text-walkie-muted"><tr>{["User", "Provider", "Plan", "Status", "Period end", "Cancels"].map((h) => <th key={h} className="px-3 py-2.5">{h}</th>)}</tr></thead><tbody>{subs.map((x) => <tr key={x.id} className="border-b border-walkie-light/60"><td className="px-3 py-2">{x.user.email}</td><td className="px-3">{x.provider}</td><td className="px-3">{x.planKey}</td><td className="px-3 font-bold">{x.status}</td><td className="px-3">{x.currentPeriodEnd?.toISOString().slice(0, 10) ?? "—"}</td><td className="px-3">{x.cancelAtPeriodEnd ? "yes" : ""}</td></tr>)}</tbody></table>{subs.length === 0 && <p className="p-6 text-center text-sm text-walkie-muted">No subscriptions yet.</p>}</div>
      <h2 className="font-display text-xl font-semibold">Payment events</h2>
      <div className="card overflow-x-auto"><table className="w-full text-left text-[13px]"><tbody>{events.map((e) => <tr key={e.id} className="border-b border-walkie-light/60"><td className="px-3 py-2">{e.processedAt.toISOString().slice(0, 16).replace("T", " ")}</td><td className="px-3">{e.provider}</td><td className="px-3 font-bold">{e.type}</td><td className="px-3">{e.amountCents != null ? `$${(e.amountCents / 100).toFixed(2)}` : ""}</td></tr>)}</tbody></table>{events.length === 0 && <p className="p-6 text-center text-sm text-walkie-muted">No events received yet.</p>}</div>
    </div>
  );
}
