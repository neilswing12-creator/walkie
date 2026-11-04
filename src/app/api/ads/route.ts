import { handler, ok } from "@/lib/api";
import { adsForScreen } from "@/lib/integrations/ads";
export const GET = handler(async ({ req, user }) => ok(await adsForScreen(user.id, req.nextUrl.searchParams.get("screen") ?? "")));
