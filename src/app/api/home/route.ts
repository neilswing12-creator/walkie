import { handler, ok } from "@/lib/api";
import { getHomeData } from "@/lib/queries/home";
export const GET = handler(async ({ user }) => ok(await getHomeData(user)), { allowSuspended: true });
