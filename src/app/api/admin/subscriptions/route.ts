import { handler, ok } from "@/lib/api";
import { db } from "@/lib/db";
export const GET = handler(async () => {
  const [subs, events] = await Promise.all([
    db.subscription.findMany({ orderBy: { updatedAt: "desc" }, take: 200, include: { user: { select: { id: true, email: true, name: true } } } }),
    db.paymentEvent.findMany({ orderBy: { processedAt: "desc" }, take: 100 }),
  ]);
  return ok({ subs, events });
}, { role: "ADMIN" });
