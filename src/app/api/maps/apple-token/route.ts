import { z } from "zod";
import { handler, ok, query, ApiError } from "@/lib/api";
import { appleMapkitToken, mapsSettings } from "@/lib/maps/server";
/** MapKit JS authorization — only while the admin has Apple Maps enabled for the platform asking. */
export const GET = handler(async ({ req }) => {
  const { platform } = query(req, z.object({ platform: z.enum(["web", "ios"]).default("web") }));
  if (!(await mapsSettings())[platform].includes("apple")) throw new ApiError(403, "Apple Maps is turned off", "provider_disabled");
  const token = await appleMapkitToken();
  if (!token) throw new ApiError(503, "Apple Maps isn't configured", "provider_unconfigured");
  return ok({ token });
}, { allowSuspended: true, rate: { limit: 60, windowMs: 60000 } });
