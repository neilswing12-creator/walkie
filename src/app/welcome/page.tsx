import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Onboarding } from "@/components/onboarding/Onboarding";
export const metadata: Metadata = { title: "Welcome", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";
/** First-time experience. Completed users go straight to the app; it never repeats. */
export default async function Page() {
  const user = await getCurrentUser();
  if (user) {
    const p = await db.profile.findUnique({ where: { userId: user.id }, select: { onboardedAt: true } });
    if (p?.onboardedAt) redirect("/app");
  }
  return <Onboarding authed={!!user} userName={user?.name.split(" ")[0] ?? null} />;
}
