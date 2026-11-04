import { handler, ok } from "@/lib/api";
import { getCatalog } from "@/lib/queries/shop";
export const GET = handler(async ({ user }) => ok(await getCatalog(user)), { allowSuspended: true });
