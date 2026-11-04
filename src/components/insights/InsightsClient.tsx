import Link from "next/link";
import { MyWalkie } from "../mascot/MyWalkie";
import type { InsightsData } from "@/lib/queries/insights";
import { formatDuration, formatPace } from "@/lib/fitness";
import { dist, distUnit, num, dayLetter } from "@/lib/format";
import { Icon } from "../ui/Icon";
import { Walkie } from "../mascot/Walkie";
import { EmptyState } from "../ui/States";

function delta(cur: number, prev: number) {
  if (!prev) return cur > 0 ? { text: "New!", up: true } : null;
  const p = Math.round(((cur - prev) / prev) * 100);
  return { text: `${p >= 0 ? "↑" : "↓"} ${Math.abs(p)}%`, up: p >= 0 };
}

function Bars({ values, labels, highlightLast, color = "#6B8FD6", format }: { values: number[]; labels: string[]; highlightLast?: boolean; color?: string; format: (n: number) => string }) {
  const max = Math.max(1, ...values);
  const dense = values.length > 10;
  return (
    <div className="mt-4">
      <div className={`flex h-36 items-end ${dense ? "gap-[3px]" : "gap-2"}`}>
        {values.map((v, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end" title={`${labels[i]}: ${format(v)}`}>
            <div className={`w-full ${dense ? "rounded-[5px]" : "rounded-[12px]"} transition-all duration-700`} style={{ height: `${Math.max(4, (v / max) * 100)}%`, background: highlightLast && i === values.length - 1 ? color : v > 0 ? `${color}66` : "#D9E0E8" }} />
          </div>
        ))}
      </div>
      <div className={`mt-1.5 flex ${dense ? "gap-[3px]" : "gap-2"}`}>
        {labels.map((l, i) => <span key={i} className="flex-1 text-center text-[10px] font-extrabold text-walkie-muted">{dense ? (i % 5 === 0 || i === labels.length - 1 ? l : "") : l}</span>)}
      </div>
    </div>
  );
}

export function InsightsClient({ data }: { data: InsightsData }) {
  const u = data.units;
  const labels = data.days.map((d) => (data.range === "week" ? dayLetter(d.date) : String(Number(d.date.slice(8)))));
  const stepsDelta = delta(data.totals.steps, data.previous.steps);
  const minDelta = delta(data.totals.minutes, data.previous.minutes);
  const grade = data.totals.goalDays >= (data.range === "week" ? 6 : 24) ? "A+" : data.totals.goalDays >= (data.range === "week" ? 4 : 16) ? "A" : data.totals.goalDays >= (data.range === "week" ? 2 : 8) ? "B" : data.totals.minutes > 0 ? "C" : "–";
  const empty = data.activityCount === 0 && data.totals.steps === 0;
  return (
    <div className="px-4 pt-[calc(14px+var(--safe-top))]">
      <div className="flex items-end justify-between"><h1 className="font-display text-[30px] font-semibold">Insights</h1><Link href="/app/history" className="text-sm font-bold text-walkie-blue">History</Link></div>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-white p-1 shadow-card">
        {(["week", "month"] as const).map((r) => <Link key={r} href={`/app/insights?range=${r}`} className={`rounded-full py-2 text-center text-[13px] font-extrabold ${data.range === r ? "bg-walkie-blue text-white" : "text-walkie-muted"}`}>{r === "week" ? "7 days" : "30 days"}</Link>)}
      </div>

      {empty ? (
        <div className="card mt-4"><EmptyState title="Your story starts with one walk" body="Charts, records and Walkie's report card appear after your first activity." mood="greet" action={<Link href="/app/activity/track?type=OUTDOOR_WALK" className="btn-primary">Start a walk</Link>} /></div>
      ) : (<>
        <section className="card mt-4 flex items-center gap-4 p-5">
          <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-[7px] border-walkie-blue font-display text-[34px] font-semibold text-walkie-slate">{grade}</div>
          <div>
            <span className="chip bg-walkie-blue text-white">Walkie report</span>
            <p className="mt-1.5 font-display text-lg font-semibold leading-tight">{data.totals.goalDays} goal day{data.totals.goalDays === 1 ? "" : "s"} {data.range === "week" ? "this week" : "this month"}</p>
            <p className="text-[13px] text-walkie-muted">{data.totals.minutes} active minutes · {data.totals.missions} missions</p>
          </div>
        </section>

        <section className="card mt-3 p-5">
          <div className="flex items-start justify-between"><div><p className="eyebrow">Steps</p><p className="font-display text-[30px] font-semibold leading-none tabular">{num(data.totals.steps)}</p></div>{stepsDelta && <span className={`chip ${stepsDelta.up ? "bg-mint text-emerald-700" : "bg-blush text-rose-600"}`}>{stepsDelta.text}</span>}</div>
          <Bars values={data.days.map((d) => d.steps)} labels={labels} highlightLast format={(n) => `${num(n)} steps`} />
        </section>

        <section className="mt-3 grid grid-cols-2 gap-3">
          <Tile label="Walked" value={dist(data.totals.walkM, u)} unit={distUnit(u)} icon="walk" />
          <Tile label="Ran" value={dist(data.totals.runM, u)} unit={distUnit(u)} icon="run" />
          <Tile label="Rode" value={dist(data.totals.bikeM, u)} unit={distUnit(u)} icon="bike" />
          <Tile label="Active" value={String(data.totals.minutes)} unit="min" icon="clock" badge={minDelta?.text} />
          <Tile label="Points" value={num(data.totals.points)} unit="pts" icon="paw" />
          <Tile label="Avg run pace" value={formatPace(data.avgRunPace, u)} unit={`/${distUnit(u)}`} icon="bolt" />
        </section>

        <section className="card mt-3 p-5">
          <p className="eyebrow">Distance</p>
          <Bars values={data.days.map((d) => d.walkM + d.runM + d.bikeM)} labels={labels} highlightLast color="#A08BE0" format={(n) => `${dist(n, u, 2)} ${distUnit(u)}`} />
          <div className="mt-3 flex gap-4 text-[12px] font-bold text-walkie-muted"><span>Walk {dist(data.totals.walkM, u)} {distUnit(u)}</span><span>Run {dist(data.totals.runM, u)} {distUnit(u)}</span><span>Ride {dist(data.totals.bikeM, u)} {distUnit(u)}</span></div>
        </section>

        {data.days.some((d) => d.runPace) && (
          <section className="card mt-3 p-5">
            <p className="eyebrow">Run pace (lower is faster)</p>
            <Bars values={data.days.map((d) => (d.runPace ? 1200 - Math.min(1100, d.runPace) : 0))} labels={labels} color="#5DBE9A" format={(n) => (n ? formatPace(1200 - n, u) : "no run")} />
          </section>
        )}

        <section className="card mt-3 p-5">
          <h2 className="font-display text-lg font-semibold">Personal records</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Rec label="Longest walk" value={data.records.longestWalkM ? `${dist(data.records.longestWalkM, u, 2)} ${distUnit(u)}` : "–"} />
            <Rec label="Longest run" value={data.records.longestRunM ? `${dist(data.records.longestRunM, u, 2)} ${distUnit(u)}` : "–"} />
            <Rec label="Fastest 1K+ pace" value={formatPace(data.records.fastest1k, u)} />
            <Rec label="Fastest 5K+ pace" value={formatPace(data.records.fastest5k, u)} />
            <Rec label="Longest ride" value={data.records.longestRideM ? `${dist(data.records.longestRideM, u, 2)} ${distUnit(u)}` : "–"} />
            <Rec label="Longest session" value={data.records.longestDurationSec ? formatDuration(data.records.longestDurationSec) : "–"} />
            <Rec label="Longest streak" value={`${data.streak.longest} days`} />
          </div>
        </section>
      </>)}

      <section className="mt-3 grid grid-cols-3 gap-3">
        <Mini icon="flame" label="Streak" value={`${data.streak.current}d`} />
        <Mini icon="paw" label="Pets" value={`${data.pets.count} · Lv${data.pets.totalLevels}`} />
        <Mini icon="store" label="Shop items" value={String(data.shop.items)} />
      </section>

      {!data.plus && (
        <Link href="/app/plus" className="card mt-3 flex items-center gap-3 overflow-hidden bg-gradient-to-r from-lavender/70 to-walkie-pale p-4">
          <MyWalkie mood="discover" size={70} />
          <div className="flex-1"><p className="font-display font-semibold">Deeper monthly reports</p><p className="text-[12px] text-walkie-muted">Walkie Plus adds trends and exclusive pets. Core tracking stays free.</p></div>
          <Icon name="chevron" size={18} />
        </Link>
      )}
      <div className="h-4" />
    </div>
  );
}
const Tile = ({ label, value, unit, icon, badge }: { label: string; value: string; unit: string; icon: string; badge?: string }) => (
  <div className="card p-4"><div className="flex items-center justify-between"><span className="text-[13px] font-bold text-walkie-muted">{label}</span>{badge ? <span className="chip bg-walkie-pale text-walkie-blue">{badge}</span> : <Icon name={icon} size={18} className="text-walkie-blue" />}</div><p className="mt-2 font-display text-[26px] font-semibold leading-none tabular">{value}<span className="ml-1 text-[12px] font-bold text-walkie-muted">{unit}</span></p></div>
);
const Rec = ({ label, value }: { label: string; value: string }) => <div className="rounded-2xl bg-walkie-light p-3"><p className="text-[11px] font-bold text-walkie-muted">{label}</p><p className="font-display text-lg font-semibold tabular">{value}</p></div>;
const Mini = ({ icon, label, value }: { icon: string; label: string; value: string }) => <div className="card p-3 text-center"><Icon name={icon} size={20} className="mx-auto text-walkie-blue" /><p className="mt-1 font-display text-[15px] font-semibold">{value}</p><p className="text-[11px] font-bold text-walkie-muted">{label}</p></div>;
