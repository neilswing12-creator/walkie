import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { ACTIVITY_META, FAMILY_META, type ActivityType } from "@/lib/constants";
import { formatDuration, formatPace, formatSpeed } from "@/lib/fitness";
import { Walkie } from "@/components/mascot/Walkie";
import { RouteSvg } from "@/components/activity/RouteSvg";
import { haversine } from "@/lib/fitness";

export const dynamic = "force-dynamic";
async function load(shareId: string) {
  const a = await db.activity.findUnique({ where: { shareId }, include: { route: true, user: { select: { name: true, status: true } } } });
  if (!a || a.status !== "COMPLETED" || a.user.status !== "ACTIVE") return null;
  return a;
}
export async function generateMetadata({ params }: { params: Promise<{ shareId: string }> }): Promise<Metadata> {
  const a = await load((await params).shareId);
  if (!a) return { title: "Activity", robots: { index: false } };
  const m = ACTIVITY_META[a.type as ActivityType];
  return { title: `${(a.distanceM / 1000).toFixed(2)} km ${m.short.toLowerCase()} on Walkie`, description: "Walk, run, ride and grow a cozy pet shop with Walkie.", robots: { index: false, follow: true } };
}
export default async function Page({ params }: { params: Promise<{ shareId: string }> }) {
  const a = await load((await params).shareId);
  if (!a) notFound();
  const o = (a.shareOptions as { route?: boolean; name?: boolean; details?: boolean }) ?? {};
  const meta = ACTIVITY_META[a.type as ActivityType], fam = FAMILY_META[meta.family];
  let pts = ((a.route?.points as [number, number][]) ?? []).map((p) => [p[0], p[1]] as [number, number]);
  if (o.route && pts.length > 3) { const s = pts[0], e = pts[pts.length - 1]; pts = pts.filter((p) => haversine(p[0], p[1], s[0], s[1]) > 150 && haversine(p[0], p[1], e[0], e[1]) > 150); } else pts = [];
  return (
    <main className="min-h-dvh bg-gradient-to-b from-walkie-pale to-walkie-white px-4 py-10">
      <div className="card mx-auto max-w-md overflow-hidden">
        <div className="flex items-end justify-between px-6 pt-6" style={{ background: fam.tint }}>
          <div className="pb-6"><p className="font-display text-sm font-semibold text-walkie-slate">🐾 Walkie.run</p><h1 className="mt-1 font-display text-3xl font-semibold">{a.title || meta.label}</h1><p className="text-sm text-walkie-muted">{o.name ? `${a.user.name.split(" ")[0]} · ` : ""}{a.startedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p></div>
          <Walkie mood={meta.family === "bike" ? "bike" : "happy"} size={130} />
        </div>
        <div className="grid grid-cols-2 gap-4 p-6">
          {a.distanceM > 0 && <S l="Distance" v={`${(a.distanceM / 1000).toFixed(2)} km`} />}
          <S l="Time" v={formatDuration(a.durationSec)} />
          {o.details !== false && meta.family !== "bike" && a.avgPaceSecKm && <S l="Avg pace" v={`${formatPace(a.avgPaceSecKm)}/km`} />}
          {o.details !== false && meta.family === "bike" && a.avgSpeedMps && <S l="Avg speed" v={`${formatSpeed(a.avgSpeedMps)} km/h`} />}
          <S l="Walkie points" v={`+${a.points}`} />
        </div>
        {pts.length > 2 && <div className="px-6"><RouteSvg points={pts} height={200} /><p className="mt-1 text-center text-[11px] text-walkie-muted">Start and finish areas hidden for privacy</p></div>}
        <div className="p-6"><Link href="/signup" className="btn-primary w-full">Join Walkie — it's free</Link></div>
      </div>
    </main>
  );
}
const S = ({ l, v }: { l: string; v: string }) => <div><p className="text-[12px] font-bold text-walkie-muted">{l}</p><p className="font-display text-2xl font-semibold">{v}</p></div>;
