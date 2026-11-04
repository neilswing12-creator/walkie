import { handler, ok } from "@/lib/api";
import { regenerateCode } from "@/lib/referrals/service";
export const POST = handler(async ({ user }) => ok({ code: await regenerateCode(user.id) }), { rate: { limit: 3, windowMs: 86400000, key: "ref-regen" } });
