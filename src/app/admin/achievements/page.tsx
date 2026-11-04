import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { BadgeArt } from "@/components/badges/BadgeArt";
import type { BadgeArt as Art } from "@/lib/achievements/catalog";

export const metadata = { title: "Badge analytics" };
export default async function Page() {
  if (!hasRole(await getCurrentUser(), "ADMIN")) redirect("/admin");
  const [defs, unlocks, users, ledger] = await Promise.all([
    db.achievement.findMany({ where: { enabled: true, archived: false } }),
    db.userAchievement.findMany({ select: { achievementId: true, userId: true, unlockedAt: true, user: { select: { createdAt: true } } } }),
    db.user.count({ where: { status: { not: "DELETED" } } }),
    db.ledgerEntry.aggregate({ where: { reason: "ACHIEVEMENT" }, _sum: { coins: true, xp: true }, _count: true }),
  ]);
  const by = new Map<string, { n: number; days: number }>();
  for (const u of unlocks) { const e = by.get(u.achievementId) ?? { n: 0, days: 0 }; e.n++; e.days += (u.unlockedAt.getTime() - u.user.createdAt.getTime()) / 86400000; by.set(u.achievementId, e); }
  const rows = defs.map((d) => ({ d, n: by.get(d.id)?.n ?? 0, avgDays: by.get(d.id)?.n ? by.get(d.id)!.days / by.get(d.id)!.n : null }));
  const most = [...rows].sort((a, b) => b.n - a.n).slice(0, 8);
  const rarest = [...rows].filter((r) => !r.d.startsAt).sort((a, b) => a.n - b.n).slice(0, 8);
  const perUser = new Map<string, number>(); for (const u of unlocks) perUser.set(u.userId, (perUser.get(u.userId) ?? 0) + 1);
  const engaged = perUser.size;
  const buckets = [["0%", 0, 0], ["1–10%", 0.0001, 0.1], ["10–25%", 0.1, 0.25], ["25–50%", 0.25, 0.5], ["50%+", 0.5, 2]] as const;
  const dist = buckets.map(([l, lo, hi]) => ({ l, n: l === "0%" ? users - engaged : [...perUser.values()].filter((c) => c / defs.length > lo && c / defs.length <= hi).length }));
  const completion = users && defs.length ? unlocks.length / (users * defs.length) : 0;
  const Card = ({ l, v, s }: { l: string; v: string | number; s?: string }) => <div className="card p-4"><p className="text-[12px] font-bold text-walkie-muted">{l}</p><p className="mt-1 font-display text-[26px] font-semibold tabular">{v}</p>{s && <p className="text-[11px] text-walkie-muted">{s}</p>}</div>;
  const List = ({ title, items }: { title: string; items: typeof rows }) => (
    <div className="card p-5"><p className="font-display font-semibold">{title}</p><ul className="mt-3 space-y-2">{items.map((r) => <li key={r.d.id} className="flex items-center gap-3 text-[13px]"><BadgeArt rarity={r.d.rarity} art={r.d.art as Art | null} imageUrl={r.d.imageUrl} size={34} still /><span className="flex-1 font-bold">{r.d.title}</span><span className="tabular">{r.n} · {users ? ((r.n / users) * 100).toFixed(1) : 0}%</span><span className="w-20 text-right text-walkie-muted">{r.avgDays != null ? `${r.avgDays.toFixed(1)}d avg` : "—"}</span></li>)}</ul></div>
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="font-display text-3xl font-semibold">Badge analytics</h1><Link href="/admin/catalog/achievements" className="btn-soft min-h-[40px]">Manage badges</Link></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card l="Active badges" v={defs.length} /><Card l="Total unlocks" v={unlocks.length} /><Card l="Users with a badge" v={`${users ? ((engaged / users) * 100).toFixed(1) : 0}%`} s={`${engaged} of ${users}`} />
        <Card l="Completion rate" v={`${(completion * 100).toFixed(2)}%`} s="unlocks ÷ (users × badges)" /><Card l="Rewards distributed" v={`${(ledger._sum.coins ?? 0).toLocaleString()} coins`} s={`${(ledger._sum.xp ?? 0).toLocaleString()} XP · ${ledger._count} grants`} />
      </div>
      <div className="grid gap-3 md:grid-cols-2"><List title="Most earned" items={most} /><List title="Rarest (non-seasonal)" items={rarest} /></div>
      <div className="card p-5"><p className="font-display font-semibold">Collection completion</p><div className="mt-3 flex h-28 items-end gap-3">{dist.map((b) => { const max = Math.max(1, ...dist.map((x) => x.n)); return <div key={b.l} className="flex flex-1 flex-col items-center gap-1"><span className="text-[12px] font-bold tabular">{b.n}</span><div className="w-full rounded-t-lg bg-walkie-blue" style={{ height: `${Math.max(4, (b.n / max) * 80)}px` }} /><span className="text-[11px] font-bold text-walkie-muted">{b.l}</span></div>; })}</div></div>
    </div>
  );
}
