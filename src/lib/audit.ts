import "server-only";
import { db } from "./db";

export function audit(actorId: string, action: string, targetType: string, targetId?: string | null, meta?: object) {
  return db.auditLog.create({ data: { actorId, action, targetType, targetId: targetId ?? null, meta: meta as any } });
}
