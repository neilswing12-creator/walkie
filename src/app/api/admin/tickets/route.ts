import { z } from "zod";
import { handler, ok, query } from "@/lib/api";
import { db } from "@/lib/db";
export const GET = handler(async ({ req }) => {
  const q = query(req, z.object({ status: z.enum(["OPEN", "PENDING", "RESOLVED"]).optional() }));
  return ok(await db.supportTicket.findMany({ where: q.status ? { status: q.status } : {}, orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { id: true, name: true } } } }));
}, { role: "SUPPORT" });
