import { handler, ok, body, ApiError } from "@/lib/api";
import { RESOURCES, isResource } from "@/lib/admin-resources";
import { audit } from "@/lib/audit";

export const GET = handler<{ resource: string }>(async ({ params }) => {
  if (!isResource(params.resource)) throw new ApiError(404, "Unknown resource");
  const r = RESOURCES[params.resource];
  return ok(await (r.delegate() as any).findMany({ orderBy: r.orderBy, take: 500 }));
}, { role: "ADMIN" });

export const POST = handler<{ resource: string }>(async ({ req, params, user }) => {
  if (!isResource(params.resource)) throw new ApiError(404, "Unknown resource");
  const r = RESOURCES[params.resource];
  if ((r as any).noCreate) throw new ApiError(400, "New entries can't be created for this resource");
  const data = await body(req, r.schema);
  try {
    const created = await (r.delegate() as any).create({ data });
    await audit(user.id, `${params.resource}.create`, params.resource, created.id ?? created.key, { key: (data as any).key });
    return ok(created);
  } catch (e: any) {
    if (e?.code === "P2002") throw new ApiError(409, "That key is already used");
    throw e;
  }
}, { role: "ADMIN" });
