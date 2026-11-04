import { Suspense } from "react";
import { Tracker } from "@/components/activity/Tracker";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
export const metadata = { title: "Activity" };
export default async function Page() {
  const user = (await getCurrentUser())!;
  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  const pet = profile?.activePetId ? await db.pet.findUnique({ where: { id: profile.activePetId } }) : null;
  return <Suspense><Tracker units={(profile?.units as "metric" | "imperial") ?? "metric"} weightKg={profile?.weightKg ?? null} userName={user.name.split(" ")[0]} petName={pet?.nickname ?? "Walkie"} /></Suspense>;
}
