import { handler, ok } from "@/lib/api";
import { getPetCollection } from "@/lib/queries/pets";
export const GET = handler(async ({ user }) => ok(await getPetCollection(user)), { allowSuspended: true });
