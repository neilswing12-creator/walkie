import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getSetting } from "@/lib/settings";
import { BottomNav } from "@/components/app/BottomNav";
import { BadgeUnlockHost } from "@/components/badges/BadgeUnlockHost";
import { Walkie } from "@/components/mascot/Walkie";
import { WalkieAppearanceProvider } from "@/components/mascot/MyWalkie";
import { db } from "@/lib/db";

export const metadata: Metadata = { robots: { index: false, follow: false }, title: "App" };
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app");
  const maintenance = await getSetting("maintenance");
  if (maintenance.enabled && user.role === "USER") {
    return (
      <main className="grid min-h-dvh place-items-center p-8 text-center">
        <div><Walkie mood="sleep" size={180} /><h1 className="mt-2 font-display text-2xl font-semibold">Quick nap</h1><p className="mt-1 text-walkie-muted">{maintenance.message}</p></div>
      </main>
    );
  }
  const [profile, pet] = await Promise.all([
    db.profile.findUnique({ where: { userId: user.id }, select: { walkieLook: true, walkieFur: true } }),
    db.pet.findFirst({ where: { userId: user.id, species: { key: "husky" } }, select: { accessories: { select: { item: { select: { key: true, color: true } } } } } }),
  ]);
  const appearance = { look: profile?.walkieLook ?? "classic", fur: profile?.walkieFur ?? "classic", accessories: pet?.accessories.map((a) => ({ key: a.item.key, color: a.item.color })) ?? [] };
  return (
    <WalkieAppearanceProvider initial={appearance}>
    <div className="min-h-dvh bg-walkie-light">
      {user.status === "SUSPENDED" && <div className="bg-amber-50 px-4 py-2 text-center text-[13px] font-semibold text-amber-800">Your account is suspended — you can view your data but can't earn rewards. {user.statusReason ?? ""}</div>}
      <div className="pb-nav mx-auto max-w-lg">{children}</div>
      <BottomNav />
      <BadgeUnlockHost />
    </div>
    </WalkieAppearanceProvider>
  );
}
