import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { MapsAdmin } from "@/components/admin/MapsAdmin";
export const metadata = { title: "Maps & Location" };
export default async function Page() {
  if (!hasRole(await getCurrentUser(), "ADMIN")) redirect("/admin");
  return <MapsAdmin />;
}
