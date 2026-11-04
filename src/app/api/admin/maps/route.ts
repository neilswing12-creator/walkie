import { handler, ok } from "@/lib/api";
import { mapKeys, mapsSettings, providerStatus } from "@/lib/maps/server";
import { CAPABILITIES, MAP_PLATFORMS, MAP_PROVIDERS } from "@/lib/maps/types";
/** Admin view: settings + per-platform capability + credential readiness for every provider (keys themselves never returned). */
export const GET = handler(async () => {
  const s = await mapsSettings();
  const k = mapKeys();
  const all = { ...s, web: [...MAP_PROVIDERS], ios: [...MAP_PROVIDERS], android: [...MAP_PROVIDERS] };
  return ok({
    settings: s, capabilities: CAPABILITIES,
    readiness: Object.fromEntries(MAP_PLATFORMS.map((p) => [p, providerStatus(p, all)])),
    credentials: { googleWeb: !!k.googleWeb, googleIos: !!k.googleIos, googleAndroid: !!k.googleAndroid, appleMapkit: !!(k.appleTeam && k.appleKeyId && k.applePrivateKey), openStyle: k.openStyle },
  });
}, { role: "ADMIN" });
