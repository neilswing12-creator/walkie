import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ACTIVITY_META, FAMILY_META, typesOfFamily, type ActivityFamily, type ActivityType } from "@/lib/constants";
import { formatDuration, formatPace, formatSpeed } from "@/lib/fitness";
import { dist, distUnit } from "@/lib/format";
import { addDays, dateKey, weekDays } from "@/lib/dates";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/States";

export const metadata = { title: "History" };
const FAMS = ["walk", "run", "bike", "other"] as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ family?: string; from?: string; to?: string; page?: string }> }) {
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  const units = (profile?.units ?? "metric") as "metric" | "imperial";
  const family = (FAMS as readonly string[]).includes(sp.family ?? "") ? (sp.family as ActivityFamily) : undefined;
  const valid = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
  const from = valid(sp.from), to = valid(sp.to);
  const page = Math.max(1, Number(sp.page) || 1);
  const where = {
    userId: user.id, status: { not: "DELETED" },
    ...(family ? { type: { in: typesOfFamily(family) as string[] } } : {}),
    ...(from || to ? { startedAt: { ...(from ? { gte: new Date(from + "T00:00:00Z") } : {}), ...(to ? { lt: new Date(addDays(to, 1) + "T00:00:00Z") } : {}) } } : {}),
  };
  const today = dateKey(new Date(), user.timezone);
  const weekStart = new Date(weekDays(today)[0] + "T00:00:00Z");
  const monthStart = new Date(today.slice(0, 8) + "01T00:00:00Z");
  const [items, count, weekAgg, monthAgg] = await Promise.all([
    db.activity.findMany({ where, orderBy: { startedAt: "desc" }, skip: (page - 1) * 20, take: 20 }),
    db.activity.count({ where }),
    db.activity.groupBy({ by: ["type"], where: { userId: user.id, status: "COMPLETED", startedAt: { gte: weekStart } }, _sum: { distanceM: true, durationSec: true, points: true }, _count: true }),
    db.activity.groupBy({ by: ["type"], where: { userId: user.id, status: "COMPLETED", startedAt: { gte: monthStart } }, _sum: { distanceM: true, durationSec: true, points: true }, _count: true }),
  ]);
  const tot = (rows: typeof weekAgg) => ({ n: rows.reduce((t, r) => t + r._count, 0), m: rows.reduce((t, r) => t + (r._sum.distanceM ?? 0), 0), s: rows.reduce((t, r) => t + (r._sum.durationSec ?? 0), 0), p: rows.reduce((t, r) => t + (r._sum.points ?? 0), 0) });
  const w = tot(weekAgg), mo = tot(monthAgg);
  const qs = (o: Record<string, string | undefined>) => "?" + new URLSearchParams(Object.entries({ family, from, to, ...o }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <div className="px-4 pt-[calc(14px+var(--safe-top))]">
      <div className="flex items-center gap-3"><Link href="/app/insights" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card" aria-label="Back"><Icon name="back" size={20} /></Link><h1 className="font-display text-[28px] font-semibold">History</h1></div>
      <section className="mt-4 grid grid-cols-2 gap-3">
        {[["This week", w], ["This month", mo]].map(([l, t]) => { const x = t as typeof w; return (
          <div key={l as string} className="card p-4"><p className="eyebrow">{l as string}</p><p className="mt-1 font-display text-2xl font-semibold tabular">{dist(x.m, units, 1)} <span className="text-[13px] text-walkie-muted">{distUnit(units)}</span></p><p className="text-[12px] font-bold text-walkie-muted">{x.n} activities · {formatDuration(x.s)} · {x.p.toLocaleString()} pts</p></div>
        ); })}
      </section>
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        <Link href={qs({ family: undefined, page: undefined })} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold ${!family ? "bg-walkie-ink text-white" : "bg-white text-walkie-slate shadow-card"}`}>All</Link>
        {FAMS.map((f) => <Link key={f} href={qs({ family: f, page: undefined })} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold ${family === f ? "text-white" : "bg-white text-walkie-slate shadow-card"}`} style={family === f ? { background: FAMILY_META[f].color } : undefined}>{FAMILY_META[f].label}</Link>)}
      </div>
      <form className="mt-3 flex items-end gap-2" action="/app/history">
        {family && <input type="hidden" name="family" value={family} />}
        <label className="min-w-0 flex-1"><span className="label">From</span><input type="date" name="from" defaultValue={from} className="input min-h-[42px] w-full min-w-0" /></label>
        <label className="min-w-0 flex-1"><span className="label">To</span><input type="date" name="to" defaultValue={to} className="input min-h-[42px] w-full min-w-0" /></label>
        <button className="btn-soft min-h-[42px] shrink-0 px-4">Filter</button>
      </form>
      {items.length === 0 ? <div className="card mt-4"><EmptyState title={family || from ? "Nothing matches" : "No activities yet"} body={family || from ? "Try another filter." : "Your walks, runs and rides will appear here."} mood="greet" action={<Link href="/app/activity/track" className="btn-primary">Start an adventure</Link>} /></div> : (
        <div className="card mt-4 divide-y divide-walkie-light">
          {items.map((a) => { const m = ACTIVITY_META[a.type as ActivityType] ?? ACTIVITY_META.FREE_WORKOUT; const fm = FAMILY_META[m.family]; return (
            <Link key={a.id} href={`/app/activity/${a.id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-walkie-light/60">
              <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: fm.tint, color: fm.color }}><Icon name={m.icon} size={22} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{a.title || m.label}{a.status === "FLAGGED" && <span className="chip ml-2 bg-butter text-amber-800">No reward</span>}{((a.records as string[]) ?? []).length > 0 && <span className="ml-1">🏆</span>}</p>
                <p className="text-[12px] font-semibold text-walkie-muted">{a.startedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: user.timezone })} · {formatDuration(a.durationSec)}{a.distanceM > 0 ? m.family === "bike" ? ` · ${formatSpeed(a.avgSpeedMps, units)} ${units === "imperial" ? "mph" : "km/h"}` : ` · ${formatPace(a.avgPaceSecKm, units)}/${distUnit(units)}` : ""}</p>
              </div>
              <div className="text-right"><p className="font-display text-lg font-semibold tabular">{a.distanceM > 0 ? `${dist(a.distanceM, units, 2)} ${distUnit(units)}` : `${Math.round(a.durationSec / 60)} min`}</p>{a.points > 0 && <p className="text-[12px] font-bold" style={{ color: fm.color }}>+{a.points} pts</p>}</div>
            </Link>
          ); })}
        </div>
      )}
      {count > 20 && (
        <div className="mt-4 flex justify-between">
          {page > 1 ? <Link className="btn-soft" href={qs({ page: String(page - 1) })}>Newer</Link> : <span />}
          {page * 20 < count ? <Link className="btn-soft" href={qs({ page: String(page + 1) })}>Older</Link> : <span />}
        </div>
      )}
    </div>
  );
}
