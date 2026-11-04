import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { ReferralsAdmin } from "@/components/admin/ReferralsAdmin";
export const metadata = { title: "Referrals" };
export default async function Page() {
  const u = await getCurrentUser();
  if (!hasRole(u, "MODERATOR")) redirect("/admin");
  return <ReferralsAdmin canDecide={hasRole(u, "ADMIN")} />;
}
