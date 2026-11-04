/** Central, server-only view of configuration and which integrations are live. */
import "server-only";

const v = (k: string) => {
  const x = process.env[k];
  return x && x.trim() !== "" ? x : undefined;
};

export const env = {
  appUrl: (v("APP_URL") ?? "http://localhost:3000").replace(/\/$/, ""),
  isProd: process.env.NODE_ENV === "production",
  sessionSecret: v("SESSION_SECRET"),
  google: { clientId: v("GOOGLE_CLIENT_ID"), clientSecret: v("GOOGLE_CLIENT_SECRET") },
  apple: { clientId: v("APPLE_CLIENT_ID"), teamId: v("APPLE_TEAM_ID"), keyId: v("APPLE_KEY_ID"), privateKey: v("APPLE_PRIVATE_KEY")?.replace(/\\n/g, "\n") },
  resend: { apiKey: v("RESEND_API_KEY"), from: v("EMAIL_FROM") ?? "Walkie <hello@walkie.run>" },
  stripe: { secretKey: v("STRIPE_SECRET_KEY"), webhookSecret: v("STRIPE_WEBHOOK_SECRET") },
  paymongo: { secretKey: v("PAYMONGO_SECRET_KEY"), webhookSecret: v("PAYMONGO_WEBHOOK_SECRET"), methods: (v("PAYMONGO_PAYMENT_METHODS") ?? "gcash,paymaya,card,qrph").split(",").map((s) => s.trim()).filter(Boolean) },
  revenuecat: { webhookAuth: v("REVENUECAT_WEBHOOK_AUTH"), apiKey: v("REVENUECAT_SECRET_API_KEY") },
  posthog: { key: v("POSTHOG_API_KEY"), host: v("POSTHOG_HOST") ?? "https://us.i.posthog.com" },
  fcm: { serverKeyJson: v("FCM_SERVICE_ACCOUNT_JSON") },
  ads: { provider: v("ADS_PROVIDER"), publisherId: v("ADS_PUBLISHER_ID") },
  cronSecret: v("CRON_SECRET"),
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
    googleMaps: !!process.env.GOOGLE_MAPS_WEB_KEY || !!process.env.GOOGLE_MAPS_IOS_KEY || !!process.env.GOOGLE_MAPS_ANDROID_KEY,
    appleMaps: !!(process.env.APPLE_MAPKIT_TEAM_ID && process.env.APPLE_MAPKIT_KEY_ID && process.env.APPLE_MAPKIT_PRIVATE_KEY),
    paymongo: !!(env.paymongo.secretKey && env.paymongo.webhookSecret),
  };
}
