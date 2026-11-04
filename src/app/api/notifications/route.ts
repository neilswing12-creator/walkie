import { handler, ok } from "@/lib/api";
import { db } from "@/lib/db";
export const GET = handler(async ({ user }) => ok(await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 })), { allowSuspended: true });
