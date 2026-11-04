import { z } from "zod";
import { handler, ok, query } from "@/lib/api";
import { clientConfig } from "@/lib/maps/server";
/** Map provider configuration for the calling platform — read on app start, cached briefly, so admin changes apply without app updates. */
export const GET = handler(async ({ req }) => {
  const { platform } = query(req, z.object({ platform: z.enum(["web", "ios", "android"]).default("web") }));
  return ok(await clientConfig(platform));
}, { allowSuspended: true, rate: { limit: 120, windowMs: 60000 } });
