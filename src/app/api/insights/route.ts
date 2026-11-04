import { handler, ok } from "@/lib/api";
import { getInsights } from "@/lib/queries/insights";
export const GET = handler(async ({ req, user }) => ok(await getInsights(user, req.nextUrl.searchParams.get("range") === "month" ? "month" : "week")), { allowSuspended: true });
