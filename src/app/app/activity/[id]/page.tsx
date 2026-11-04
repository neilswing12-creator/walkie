import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatPace } from "@/lib/fitness";
import { CompletionCard } from "@/components/activity/CompletionCard";
import { ActivityEditor } from "@/components/activity/ActivityEditor";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Activity" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const [a, profile] = await Promise.all([db.activity.findFirst({ where: { id, userId: user.id, status: { not: "DELETED" } }, include: { route: true } }), db.profile.findUnique({ where: { userId: user.id } })]);
  if (!a) notFound();
  const units = (profile?.units ?? "metric") as "metric" | "imperial";
  const pts = ((a.route?.points as [number, number, number, number | null][]) ?? []).map((p) => [p[0], p[1]] as [number, number]);
  const splits = (a.splits as { km: number; sec: number }[] | null) ?? [];
  const fastest = splits.length ? Math.min(...splits.map((s) => s.sec)) : 0;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="absolute left-4 right-4 top-[calc(10px+var(--safe-top))] z-10 flex justify-end"><Link href="/app/history" className="grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow-card" aria-label="Close"><Icon name="close" size={20} /></Link></div>
      <CompletionCard d={{
        activity: { id: a.id, type: a.type, title: a.title, startedAt: a.startedAt.toISOString(), distanceM: a.distanceM, durationSec: a.durationSec, avgPaceSecKm: a.avgPaceSecKm, avgSpeedMps: a.avgSpeedMps, maxSpeedMps: a.maxSpeedMps, calories: a.calories, estimatedSteps: a.estimatedSteps, elevationGainM: a.elevationGainM, points: a.points, coinsAwarded: a.coinsAwarded, xpAwarded: a.xpAwarded, records: (a.records as string[]) ?? [], status: a.status, flagReason: a.flagReason },
        route: pts, userName: user.name.split(" ")[0], units,
      }} />
      <div className="space-y-3 px-4 pb-8">
        {splits.length > 0 && (
          <section className="card p-5">
            <h2 className="font-display text-lg font-semibold">Splits</h2>
            <div className="mt-3 space-y-2">{splits.map((s) => (
              <div key={s.km} className="flex items-center gap-3 text-sm"><span className="w-10 font-bold text-walkie-muted">km {s.km}</span><div className="h-3 flex-1 overflow-hidden rounded-full bg-walkie-pale"><div className={`h-full rounded-full ${s.sec === fastest ? "bg-walkie-blue" : "bg-walkie-soft"}`} style={{ width: `${Math.min(100, (fastest / s.sec) * 100)}%` }} /></div><span className="w-14 text-right font-display font-semibold tabular">{formatPace(s.sec)}</span></div>
            ))}</div>
          </section>
        )}
        <ActivityEditor id={a.id} title={a.title ?? ""} note={a.note ?? ""} shared={!!a.shareId} shareUrl={a.shareId ? `/s/${a.shareId}` : null} />
        <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-walkie-muted"><Icon name="lock" size={12} /> Your route is private unless you share it</p>
      </div>
    </div>
  );
}
