import { handler, ok } from "@/lib/api";
import { getBadgeCollection } from "@/lib/queries/badges";
export const GET = handler(async ({ user }) => ok(await getBadgeCollection(user.id)), { allowSuspended: true, rate: { limit: 60, windowMs: 60000 } });
