/** Map providers per platform — shared by server (validation), admin UI and client. Capabilities reflect real SDKs. */
export const MAP_PLATFORMS = ["web", "ios", "android"] as const;
export type MapPlatform = (typeof MAP_PLATFORMS)[number];
export const MAP_PROVIDERS = ["google", "apple", "open"] as const;
export type MapProvider = (typeof MAP_PROVIDERS)[number];

export type Capability = { supported: boolean; how: string; note?: string };
export const CAPABILITIES: Record<MapPlatform, Record<MapProvider, Capability>> = {
  web: {
    google: { supported: true, how: "Google Maps JavaScript API" },
    apple: { supported: true, how: "Apple MapKit JS", note: "Apple's official web SDK — works in modern browsers; needs a MapKit JS key (Apple Developer account)." },
    open: { supported: true, how: "MapLibre GL + open map tiles (OpenFreeMap by default, or your own style URL)" },
  },
  ios: {
    google: { supported: true, how: "Google Maps SDK for iOS (native, via @capacitor/google-maps)", note: "Falls back to the Google Maps JavaScript API inside the app if the native SDK can't start." },
    apple: { supported: true, how: "Apple MapKit JS inside the app's web view", note: "This is Apple Maps via Apple's official JavaScript SDK — not the native MapKit framework. Native MapKit would need a custom Swift plugin and an app update." },
    open: { supported: true, how: "MapLibre GL + open map tiles" },
  },
  android: {
    google: { supported: true, how: "Google Maps SDK for Android (native, via @capacitor/google-maps)", note: "Falls back to the Google Maps JavaScript API inside the app if the native SDK can't start." },
    apple: { supported: false, how: "Not available", note: "Apple doesn't offer a native Apple Maps / MapKit SDK for Android. Running MapKit JS in an Android app isn't an Apple-supported integration, so Walkie doesn't offer it." },
    open: { supported: true, how: "MapLibre GL + open map tiles" },
  },
};

/** Ordered list per platform = enabled providers in priority order (first available wins; never a disabled one). Empty = no maps. */
export type MapsSettings = Record<MapPlatform, MapProvider[]> & { googleNativeSdk: boolean };
export const MAPS_DEFAULTS: MapsSettings = { web: ["open"], ios: ["open"], android: ["open"], googleNativeSdk: true };
export const OPEN_STYLE_DEFAULT = "https://tiles.openfreemap.org/styles/liberty";

export type ProviderStatus = { provider: MapProvider; ready: boolean; reason?: string };
export type MapsClientConfig = {
  platform: MapPlatform; version: string; providers: ProviderStatus[];
  google?: { jsKey?: string; nativeKey?: string; useNative: boolean }; apple?: { tokenUrl: string }; open?: { styleUrl: string };
};
