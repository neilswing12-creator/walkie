import { handler, ok } from "@/lib/api";
import { getAdminStats } from "@/lib/queries/admin";
export const GET = handler(async () => ok(await getAdminStats()), { role: "SUPPORT" });
