import { z } from "zod";
import { publicHandler, ok, body } from "@/lib/api";
import { track } from "@/lib/analytics";
const ALLOWED = ["screen_view", "start_activity_tapped", "pet_viewed", "shop_build_opened", "plus_viewed", "share_tapped", "cta_clicked"] as const;
export const POST = publicHandler(async ({ req, user }) => {
  const { name, props } = await body(req, z.object({ name: z.enum(ALLOWED), props: z.record(z.union([z.string(), z.number(), z.boolean()])).optional() }));
  await track(name, user?.id, props);
  return ok({});
}, { rate: { limit: 120, windowMs: 60000, key: "analytics" } });
