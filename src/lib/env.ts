/** Central, server-only view of configuration and which integrations are live. */
import "server-only";
import { cfg } from "./integrations/config";

/** Infrastructure values come from the environment only; integration keys may be overridden in admin (see config.ts). */
const sys = (k: string) => { const x = process.env[k]; return x && x.trim() !== "" ? x : undefined; };
const v = cfg;

export const env = {
  appUrl: (sys("APP_URL") ?? "http://localhost:3000").replace(/\/$/, ""),
  isProd: process.env.NODE_ENV === "production",
  sessionSecret: sys("SESSION_SECRET"),
  get google() { return { clientId: v("GOOGLE_CLIENT_ID"), clientSecret: v("GOOGLE_CLIENT_SECRET") }; },
  get apple() { return { clientId: v("APPLE_CLIENT_ID"), teamId: v("APPLE_TEAM_ID"), keyId: v("APPLE_KEY_ID"), privateKey: v("APPLE_PRIVATE_KEY")?.replace(/\\n/g, "\n") }; },
  get resend() { return { apiKey: v("RESEND_API_KEY"), from: v("EMAIL_FROM") ?? "Walkie <hello@walkie.run>" }; },
  get stripe() { return { secretKey: v("STRIPE_SECRET_KEY"), webhookSecret: v("STRIPE_WEBHOOK_SECRET") }; },
  get paymongo() { return { secretKey: v("PAYMONGO_SECRET_KEY"), webhookSecret: v("PAYMONGO_WEBHOOK_SECRET"), methods: (v("PAYMONGO_PAYMENT_METHODS") ?? "gcash,paymaya,card,qrph").split(",").map((s) => s.trim()).filter(Boolean) }; },
  get revenuecat() { return { webhookAuth: v("REVENUECAT_WEBHOOK_AUTH"), apiKey: v("REVENUECAT_SECRET_API_KEY") }; },
  get posthog() { return { key: v("POSTHOG_API_KEY"), host: v("POSTHOG_HOST") ?? "https://us.i.posthog.com" }; },
  get fcm() { return { serverKeyJson: v("FCM_SERVICE_ACCOUNT_JSON") }; },
  get ads() { return { provider: v("ADS_PROVIDER"), publisherId: v("ADS_PUBLISHER_ID") }; },
  cronSecret: sys("CRON_SECRET"),
};

export function integrationStatus() {
  return {
    googleAuth: !!(env.google.clientId && env.google.clientSecret),
    appleAuth: !!(env.apple.clientId && env.apple.teamId && env.apple.keyId && env.apple.privateKey),
    email: !!env.resend.apiKey,
    stripe: !!(env.stripe.secretKey && env.stripe.webhookSecret),
    revenuecat: !!env.revenuecat.webhookAuth,
    analytics: !!env.posthog.key,
    push: !!env.fcm.serverKeyJson,
    ads: !!(env.ads.provider && env.ads.publisherId),
    googleMaps: !!(v("GOOGLE_MAPS_WEB_KEY") || v("GOOGLE_MAPS_IOS_KEY") || v("GOOGLE_MAPS_ANDROID_KEY")),
    appleMaps: !!(v("APPLE_MAPKIT_TEAM_ID") && v("APPLE_MAPKIT_KEY_ID") && v("APPLE_MAPKIT_PRIVATE_KEY")),
    paymongo: !!(env.paymongo.secretKey && env.paymongo.webhookSecret),
  };
}
