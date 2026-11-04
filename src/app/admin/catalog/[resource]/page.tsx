import { notFound, redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { RESOURCES, isResource } from "@/lib/admin-resources";
import { ADMIN_RESOURCES } from "@/components/admin/fields";
import { CatalogEditor } from "@/components/admin/CatalogEditor";
export default async function Page({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!isResource(resource)) notFound();
  if (!hasRole(await getCurrentUser(), "ADMIN")) redirect("/admin");
  const r = RESOURCES[resource];
  const rows = await (r.delegate() as any).findMany({ orderBy: r.orderBy, take: 500 });
  return <CatalogEditor resource={resource} config={ADMIN_RESOURCES[resource]} rows={JSON.parse(JSON.stringify(rows))} />;
}
