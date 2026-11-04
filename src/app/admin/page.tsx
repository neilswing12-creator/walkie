import { getAdminStats } from "@/lib/queries/admin";
export const metadata = { title: "Dashboard" };
const pct = (n: number | null) => (n == null ? "–" : `${(n * 100).toFixed(1)}%`);
const usd = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
export default async function Page() {
  const s = await getAdminStats();
  const Card = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => <div className="card p-4"><p className="text-[12px] font-bold text-walkie-muted">{label}</p><p className="mt-1 font-display text-[26px] font-semibold tabular">{typeof value === "number" ? value.toLocaleString() : value}</p>{sub && <p className="text-[11px] text-walkie-muted">{sub}</p>}</div>;
  const Spark = ({ data, color }: { data: { date: string; count: number }[]; color: string }) => { const max = Math.max(1, ...data.map((d) => d.count)); return <div className="mt-3 flex h-24 items-end gap-[3px]">{data.map((d) => <div key={d.date} title={`${d.date}: ${d.count}`} className="flex-1 rounded-t" style={{ height: `${Math.max(3, (d.count / max) * 100)}%`, background: color }} />)}</div>; };
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
      <section><h2 className="eyebrow mb-2">Users</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Card label="Total users" value={s.users.total} /><Card label="Active accounts" value={s.users.active} sub={`${s.users.suspended} suspended · ${s.users.banned} banned`} /><Card label="New (7d / 30d)" value={`${s.users.new7} / ${s.users.new30}`} />
        <Card label="DAU" value={s.users.dau} /><Card label="WAU" value={s.users.wau} /><Card label="MAU" value={s.users.mau} sub={`DAU/MAU ${pct(s.users.stickiness)}`} />
      </div></section>
      <section className="grid gap-3 md:grid-cols-2">
        <div className="card p-5"><p className="font-display font-semibold">Signups · 30 days</p><Spark data={s.series.signups} color="#6B8FD6" /></div>
        <div className="card p-5"><p className="font-display font-semibold">Activities · 30 days</p><Spark data={s.series.activities} color="#5DBE9A" /></div>
      </section>
      <section><h2 className="eyebrow mb-2">Fitness (30 days)</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Card label="Walks" value={s.activity.walks30} sub={`${s.activity.walkKm30.toFixed(1)} km`} /><Card label="Runs" value={s.activity.runs30} sub={`${s.activity.runKm30.toFixed(1)} km`} /><Card label="Total distance (all time)" value={`${s.activity.totalKm.toFixed(0)} km`} />
        <Card label="Activities (all time)" value={s.activity.totalActivities} /><Card label="Flagged (30d)" value={s.activity.flagged30} sub="Implausible speed etc." /><Card label="Pets collected" value={s.pets.total} sub={`${s.pets.perUser.toFixed(1)} per user`} />
      </div></section>
      <section><h2 className="eyebrow mb-2">Activity by sport (30 days)</h2>
        <div className="card overflow-x-auto"><table className="w-full text-left text-[13px]"><thead className="border-b text-[11px] uppercase text-walkie-muted"><tr>{["Sport", "Sessions", "Active users", "Avg distance", "Avg duration", "Points"].map((h) => <th key={h} className="px-3 py-2.5">{h}</th>)}</tr></thead>
          <tbody>{s.sports.map((r) => <tr key={r.family} className="border-b border-walkie-light/60"><td className="px-3 py-2.5 font-bold capitalize">{r.family}</td><td className="px-3 tabular">{r.sessions}</td><td className="px-3 tabular">{r.activeUsers}</td><td className="px-3 tabular">{r.avgDistanceKm.toFixed(2)} km</td><td className="px-3 tabular">{r.avgDurationMin.toFixed(1)} min</td><td className="px-3 tabular">{r.points.toLocaleString()}</td></tr>)}</tbody></table>
          <p className="px-3 py-2.5 text-[12px] text-walkie-muted">Rewards distributed (30d): {s.rewards30.points.toLocaleString()} points · {s.rewards30.coins.toLocaleString()} coins · {s.rewards30.xp.toLocaleString()} XP</p></div>
      </section>
      <section><h2 className="eyebrow mb-2">Revenue & retention</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Card label="Revenue (30d)" value={usd(s.revenue.last30Cents)} sub={`Stripe ${usd(s.revenue.byProvider.stripe)} · Stores ${usd(s.revenue.byProvider.revenuecat)}`} /><Card label="Active subscribers" value={s.subscriptions.active} sub={`${s.subscriptions.trialing} trialing · ${s.subscriptions.pastDue} past due`} />
        <Card label="Conversion" value={pct(s.subscriptions.conversion)} /><Card label="Churn (30d)" value={pct(s.subscriptions.churnRate)} sub={`${s.subscriptions.churned30} ended`} />
        <Card label="D1 retention" value={pct(s.retention.d1)} sub={`Cohort ${s.retention.cohortSize} (8–60d old, by last-active)`} /><Card label="D7 retention" value={pct(s.retention.d7)} />
      </div></section>
      <section className="grid gap-3 md:grid-cols-2">
        <div className="card p-5"><p className="font-display font-semibold">Conversion funnel</p>
          {[["Signed up", s.funnel.signups], ["First activity", s.funnel.firstActivity], ["3+ activities", s.funnel.threePlus], ["Subscribed", s.funnel.subscribers]].map(([l, v]) => <div key={l as string} className="mt-3"><div className="flex justify-between text-[13px] font-bold"><span>{l}</span><span className="tabular">{(v as number).toLocaleString()}</span></div><div className="mt-1 h-2.5 rounded-full bg-walkie-pale"><div className="h-full rounded-full bg-walkie-blue" style={{ width: `${s.funnel.signups ? ((v as number) / s.funnel.signups) * 100 : 0}%` }} /></div></div>)}
        </div>
        <div className="card p-5"><p className="font-display font-semibold">Ads (30 days)</p>
          {s.integrations.ads ? <div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div>Impressions <b>{s.ads.impressions}</b></div><div>Clicks <b>{s.ads.clicks}</b></div><div>Rewards <b>{s.ads.rewards}</b></div><div>Revenue <b>{usd(s.ads.revenueMicros / 10000)}</b></div></div> : <p className="mt-2 text-sm text-walkie-muted">No ad provider configured — ads are disabled and nothing is shown to users.</p>}
          <p className="mt-5 font-display font-semibold">Integrations</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(s.integrations).map(([k, v]) => <span key={k} className={`chip ${v ? "bg-mint text-emerald-800" : "bg-walkie-light text-walkie-muted"}`}>{v ? "●" : "○"} {k}</span>)}</div>
        </div>
      </section>
    </div>
  );
}
