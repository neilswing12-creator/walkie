import "server-only";
import { SignJWT, importPKCS8 } from "jose";
import { db } from "../db";
import { env } from "../env";
import { getSetting } from "../settings";
import { CAPABILITIES, MAPS_DEFAULTS, OPEN_STYLE_DEFAULT, type MapPlatform, type MapsClientConfig, type MapsSettings, type ProviderStatus } from "./types";

const k = (n: string) => { const v = process.env[n]; return v && v.trim() ? v.trim() : undefined; };
export const mapKeys = () => ({
  googleWeb: k("GOOGLE_MAPS_WEB_KEY"), googleIos: k("GOOGLE_MAPS_IOS_KEY"), googleAndroid: k("GOOGLE_MAPS_ANDROID_KEY"),
  appleTeam: k("APPLE_MAPKIT_TEAM_ID"), appleKeyId: k("APPLE_MAPKIT_KEY_ID"), applePrivateKey: k("APPLE_MAPKIT_PRIVATE_KEY")?.replace(/\\n/g, "\n"),
  openStyle: k("MAP_STYLE_URL") ?? k("NEXT_PUBLIC_MAP_STYLE_URL") ?? OPEN_STYLE_DEFAULT,
});

export async function mapsSettings(): Promise<MapsSettings> {
  return { ...MAPS_DEFAULTS, ...((await getSetting("maps")) as Partial<MapsSettings>) };
}

/** What each enabled provider needs to actually work on this platform (credentials + capability). */
export function providerStatus(platform: MapPlatform, s: MapsSettings): ProviderStatus[] {
  const keys = mapKeys();
  return (s[platform] ?? []).map((provider) => {
    const cap = CAPABILITIES[platform][provider];
    if (!cap?.supported) return { provider, ready: false, reason: "Not supported on this platform" };
    if (provider === "google") {
      const native = platform !== "web" && s.googleNativeSdk && (platform === "ios" ? keys.googleIos : keys.googleAndroid);
      return keys.googleWeb || native ? { provider, ready: true } : { provider, ready: false, reason: `Missing ${platform === "web" ? "GOOGLE_MAPS_WEB_KEY" : `GOOGLE_MAPS_WEB_KEY or GOOGLE_MAPS_${platform.toUpperCase()}_KEY`}` };
    }
    if (provider === "apple") return keys.appleTeam && keys.appleKeyId && keys.applePrivateKey ? { provider, ready: true } : { provider, ready: false, reason: "Missing APPLE_MAPKIT_TEAM_ID / APPLE_MAPKIT_KEY_ID / APPLE_MAPKIT_PRIVATE_KEY" };
    return { provider, ready: true };
  });
}

export async function clientConfig(platform: MapPlatform): Promise<MapsClientConfig> {
  const s = await mapsSettings();
  const row = await db.appSetting.findUnique({ where: { key: "maps" }, select: { updatedAt: true } });
  const providers = providerStatus(platform, s);
  const keys = mapKeys();
  const on = (p: string) => providers.some((x) => x.provider === p && x.ready);
  return {
    platform, version: (row?.updatedAt ?? new Date(0)).toISOString(), providers,
    // browser/app map keys are public by design — restrict them in Google Cloud (HTTP referrer walkie.run, iOS bundle id, Android package + SHA-1)
    ...(on("google") ? { google: { jsKey: keys.googleWeb, nativeKey: platform === "ios" ? keys.googleIos : platform === "android" ? keys.googleAndroid : undefined, useNative: platform !== "web" && s.googleNativeSdk } } : {}),
    ...(on("apple") ? { apple: { tokenUrl: "/api/maps/apple-token" } } : {}),
    ...(on("open") ? { open: { styleUrl: keys.openStyle } } : {}),
  };
}

/** Short-lived MapKit JS token (ES256), bound to our origin so a leaked token can't be reused elsewhere. */
export async function appleMapkitToken() {
  const keys = mapKeys();
  if (!keys.appleTeam || !keys.appleKeyId || !keys.applePrivateKey) return null;
  const key = await importPKCS8(keys.applePrivateKey, "ES256");
  return new SignJWT({ origin: env.appUrl }).setProtectedHeader({ alg: "ES256", kid: keys.appleKeyId, typ: "JWT" }).setIssuer(keys.appleTeam).setIssuedAt().setExpirationTime("30m").sign(key);
}
