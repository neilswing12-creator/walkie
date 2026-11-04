import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { LeaderboardAdmin } from "@/components/admin/LeaderboardAdmin";
export const metadata = { title: "Leaderboards" };
export default async function Page() {
  const u = await getCurrentUser();
  if (!hasRole(u, "MODERATOR")) redirect("/admin");
  return <LeaderboardAdmin canAct={hasRole(u, "ADMIN")} />;
}
