import { z } from "zod";
import { handler, ok, query } from "@/lib/api";
import { db } from "@/lib/db";
import { ROLES, USER_STATUSES } from "@/lib/constants";

export const GET = handler(async ({ req }) => {
  const q = query(req, z.object({ q: z.string().max(100).optional(), status: z.enum(USER_STATUSES).optional(), role: z.enum(ROLES).optional(), page: z.coerce.number().int().min(1).default(1) }));
  const where = {
    ...(q.q ? { OR: [{ email: { contains: q.q } }, { name: { contains: q.q } }, { username: { contains: q.q } }] } : {}),
    ...(q.status ? { status: q.status } : {}), ...(q.role ? { role: q.role } : {}),
  };
  const [rows, count] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * 25, take: 25, select: { id: true, email: true, name: true, username: true, role: true, status: true, createdAt: true, lastActiveAt: true, emailVerified: true, subscriptions: { select: { status: true }, take: 1, orderBy: { updatedAt: "desc" } } } }),
    db.user.count({ where }),
  ]);
  return ok({ rows, count, page: q.page, pages: Math.ceil(count / 25) });
}, { role: "SUPPORT" });
