import { handler, ok } from "@/lib/api";
import { db } from "@/lib/db";
export const GET = handler(async () => ok(await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { actor: { select: { name: true, email: true } } } })), { role: "ADMIN" });
