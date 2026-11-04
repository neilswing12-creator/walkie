import "server-only";
import { db } from "../db";
import { env } from "../env";
import { ALLOWED_AD_SCREENS } from "../constants";
import { getSetting } from "../settings";
import { isPlus } from "../payments/entitlements";

/** Returns renderable placements for a screen, or a disabled state. Never returns ads for tracking screens. */
export async function adsForScreen(userId: string, screen: string) {
  if (!(ALLOWED_AD_SCREENS as readonly string[]).includes(screen)) return { enabled: false as const, reason: "not_allowed_on_screen" };
  const cfg = await getSetting("ads");
  if (!cfg.enabled || !env.ads.provider || !env.ads.publisherId) return { enabled: false as const, reason: "provider_not_configured" };
  const placements = await db.adPlacement.findMany({ where: { screen, enabled: true } });
  const plus = await isPlus(userId);
  return { enabled: true as const, provider: env.ads.provider, placements: placements.filter((p) => !(plus && p.hideForPlus)) };
}
