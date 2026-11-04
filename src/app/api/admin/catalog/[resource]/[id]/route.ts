import { handler, ok, body, ApiError } from "@/lib/api";
import { RESOURCES, isResource } from "@/lib/admin-resources";
import { audit } from "@/lib/audit";

type P = { resource: string; id: string };

export const PATCH = handler<P>(async ({ req, params, user }) => {
  if (!isResource(params.resource)) throw new ApiError(404, "Unknown resource");
  const r = RESOURCES[params.resource];
  const data = await body(req, (r.schema as any).partial());
  try {
    const updated = await (r.delegate() as any).update({ where: { [(r as any).idField ?? "id"]: params.id }, data });
    await audit(user.id, `${params.resource}.update`, params.resource, params.id, { fields: Object.keys(data) });
    return ok(updated);
  } catch (e: any) {
    if (e?.code === "P2025") throw new ApiError(404, "Not found");
    if (e?.code === "P2002") throw new ApiError(409, "That key is already used");
    throw e;
  }
}, { role: "ADMIN" });

export const DELETE = handler<P>(async ({ params, user }) => {
  if (!isResource(params.resource)) throw new ApiError(404, "Unknown resource");
  const r = RESOURCES[params.resource];
  const allowed = await r.canDelete(params.id);
  if (allowed !== true) throw new ApiError(400, allowed);
  await (r.delegate() as any).delete({ where: { [(r as any).idField ?? "id"]: params.id } });
  await audit(user.id, `${params.resource}.delete`, params.resource, params.id);
  return ok({});
}, { role: "ADMIN" });
