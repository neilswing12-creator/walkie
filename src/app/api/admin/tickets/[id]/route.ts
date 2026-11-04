import { z } from "zod";
import { handler, ok, body } from "@/lib/api";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
export const PATCH = handler<{ id: string }>(async ({ req, params, user }) => {
  const data = await body(req, z.object({ status: z.enum(["OPEN", "PENDING", "RESOLVED"]).optional(), adminNote: z.string().max(2000).optional() }));
  await db.supportTicket.update({ where: { id: params.id }, data });
  await audit(user.id, "ticket.update", "ticket", params.id, { status: data.status });
  return ok({});
}, { role: "SUPPORT" });
