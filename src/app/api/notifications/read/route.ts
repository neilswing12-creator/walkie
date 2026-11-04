import { z } from "zod";
import { handler, ok, body } from "@/lib/api";
import { db } from "@/lib/db";
export const POST = handler(async ({ req, user }) => {
  const { ids } = await body(req, z.object({ ids: z.array(z.string()).max(100).optional() }));
  await db.notification.updateMany({ where: { userId: user.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
  return ok({});
}, { allowSuspended: true });
