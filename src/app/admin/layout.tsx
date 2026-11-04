import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getSessionContext, hasRole, staffSessionStale } from "@/lib/auth/session";
import { AdminNav } from "@/components/admin/AdminNav";
export const metadata: Metadata = { title: { default: "Admin", template: "%s · Walkie Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!hasRole(user, "SUPPORT")) redirect("/app");
  const sc = await getSessionContext();
  if (sc && staffSessionStale(sc.session)) redirect("/login?next=/admin&reason=reauth"); // staff sessions are short-lived
  return (
    <div className="min-h-dvh bg-walkie-light lg:grid lg:grid-cols-[240px_1fr]">
      <AdminNav role={user.role} name={user.name} />
      <main className="min-w-0 px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}
