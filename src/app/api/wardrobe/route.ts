import { handler, ok } from "@/lib/api";
import { getWardrobe } from "@/lib/game/wardrobe";
export const GET = handler(async ({ user }) => ok(await getWardrobe(user.id)));
