import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
export const metadata = { title: "Audit log" };
export default async function Page() {
  if (!hasRole(await getCurrentUser(), "ADMIN")) redirect("/admin");
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { actor: { select: { email: true } } } });
  return (<div><h1 className="font-display text-3xl font-semibold">Audit log</h1><div className="card mt-4 overflow-x-auto"><table className="w-full text-left text-[13px]"><tbody>{logs.map((l) => <tr key={l.id} className="border-b border-walkie-light/60"><td className="whitespace-nowrap px-3 py-2">{l.createdAt.toISOString().slice(0, 19).replace("T", " ")}</td><td className="px-3">{l.actor.email}</td><td className="px-3 font-bold">{l.action}</td><td className="px-3">{l.targetType}:{l.targetId}</td><td className="px-3 text-walkie-muted">{l.meta ? JSON.stringify(l.meta).slice(0, 120) : ""}</td></tr>)}</tbody></table>{logs.length === 0 && <p className="p-6 text-center text-sm text-walkie-muted">No admin actions yet.</p>}</div></div>);
}
