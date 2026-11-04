import { getCurrentUser } from "@/lib/auth/session";
import { getHomeData } from "@/lib/queries/home";
import { HomeClient } from "@/components/app/HomeClient";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = (await getCurrentUser())!;
  const data = await getHomeData(user);
  const profile = await db.profile.findUnique({ where: { userId: user.id }, select: { onboardedAt: true } });
  if (!profile?.onboardedAt) redirect("/welcome");
  return <HomeClient data={data} />;
}
