import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { BadgeArt } from "@/components/badges/BadgeArt";
import { Walkie } from "@/components/mascot/Walkie";
import { RarityBadge } from "@/components/ui/Rarity";
import type { BadgeArt as Art } from "@/lib/achievements/catalog";

export const dynamic = "force-dynamic";
const load = (shareId: string) => db.userAchievement.findUnique({ where: { shareId }, include: { achievement: true, user: { select: { name: true, status: true } } } });
export async function generateMetadata({ params }: { params: Promise<{ shareId: string }> }): Promise<Metadata> {
  const r = await load((await params).shareId);
  return r ? { title: `${r.achievement.title} — a Walkie badge`, description: r.achievement.description, robots: { index: false, follow: true } } : { title: "Badge", robots: { index: false } };
}
export default async function Page({ params }: { params: Promise<{ shareId: string }> }) {
  const r = await load((await params).shareId);
  if (!r || r.user.status !== "ACTIVE") notFound();
  const a = r.achievement;
  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-b from-walkie-pale to-walkie-white px-4 py-10">
      <div className="card w-full max-w-sm p-6 text-center">
        <p className="font-display text-sm font-semibold text-walkie-slate">🐾 Walkie.run</p>
        <div className="mx-auto mt-2 w-fit"><BadgeArt rarity={a.rarity} art={a.art as Art | null} imageUrl={a.imageUrl} size={200} /></div>
        <RarityBadge rarity={a.rarity} />
        <h1 className="mt-2 font-display text-3xl font-semibold">{a.title}</h1>
        <p className="mt-1 text-walkie-muted">{a.description}</p>
        <p className="mt-2 text-[13px] font-bold text-walkie-slate">Earned by {r.user.name.split(" ")[0]} · {r.unlockedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        <div className="mt-4 flex items-center gap-2 rounded-3xl bg-walkie-pale p-3 text-left"><Walkie mood="celebrate" size={60} /><p className="font-display font-semibold">Want badges like this? Walk, run & ride with me!</p></div>
        <Link href="/signup" className="btn-primary mt-4 w-full">Join Walkie — it's free</Link>
      </div>
    </main>
  );
}
