import { db } from "@/lib/db";
import { TicketList } from "@/components/admin/TicketList";
export const metadata = { title: "Support" };
export default async function Page() {
  const t = await db.supportTicket.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200 });
  return <TicketList tickets={JSON.parse(JSON.stringify(t))} />;
}
