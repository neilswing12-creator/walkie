import { z } from "zod";
import { handler, ok, body } from "@/lib/api";
import { db } from "@/lib/db";
import { getShopState } from "@/lib/queries/shop";
export const GET = handler(async ({ user }) => ok(await getShopState(user.id)), { allowSuspended: true });
export const PATCH = handler(async ({ req, user }) => {
  const { name } = await body(req, z.object({ name: z.string().trim().min(1).max(32) }));
  await db.shopLayout.update({ where: { userId: user.id }, data: { name } });
  return ok({ name });
});
