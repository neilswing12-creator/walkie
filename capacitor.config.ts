import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The native shells load the deployed Walkie web app (server-rendered Next.js + API) and add
 * native capabilities: GPS, HealthKit / Health Connect, push. Set CAP_SERVER_URL to your deployment.
 * See docs/MOBILE.md for HealthKit entitlements, Android permissions and store submission notes.
 */
const config: CapacitorConfig = {
  appId: "run.walkie.app",
  appName: "Walkie",
  webDir: "native-shell", // offline fallback only — the app itself is served from server.url (never bundle public/ or uploads)
  server: {
    url: process.env.CAP_SERVER_URL ?? "https://walkie.run/app",
    cleartext: false,
    allowNavigation: ["walkie.run", "*.walkie.run"],
  },
  ios: { contentInset: "always", limitsNavigationsToAppBoundDomains: true },
  android: { allowMixedContent: false },
  plugins: {
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
