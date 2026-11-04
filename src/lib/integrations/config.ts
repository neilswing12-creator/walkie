/**
 * Runtime integration config: keys an OWNER sets in the admin panel override the server's environment variables.
 *
 * Security model
 *  · Values are encrypted at rest with AES-256-GCM. The key comes from CONFIG_ENCRYPTION_KEY (server env only — never in
 *    the database, so a database dump alone can't reveal any secret). Without it, editing is disabled.
 *  · Only keys in REGISTRY can be set — infrastructure secrets (database URL, session/cron/signal secrets, the encryption
 *    key itself, APP_URL) are deliberately not editable from the web.
 *  · Secret values are write-only: no API ever returns them; the admin UI only learns "set / not set / where from".
 *  · Every change is audited by key name (never by value) and needs OWNER role + password re-entry (see the API route).
 *
 * Reads stay synchronous (`cfg(name)`) — decrypted values live in a process-wide overlay loaded at boot
 * (instrumentation.ts), refreshed right after each save and re-checked in the background every 30 s.
 */
import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type FieldDef = { key: string; label: string; secret: boolean; multiline?: boolean; placeholder?: string; check?: (v: string) => string | null };
export type GroupDef = { id: string; title: string; help: string; fields: FieldDef[] };

const pem = (v: string) => (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(v.replace(/\\n/g, "\n")) ? null : "Paste the whole .p8 key, including the BEGIN/END lines");
const url = (v: string) => { try { const u = new URL(v); return u.protocol === "https:" ? null : "Must be an https:// URL"; } catch { return "Must be a valid URL"; } };
const prefix = (...p: string[]) => (v: string) => (p.some((x) => v.startsWith(x)) ? null : `Should start with ${p.join(" or ")}`);
const json = (v: string) => { try { const j = JSON.parse(v); return j && j.private_key && j.client_email ? null : "Must be the Firebase service-account JSON (with private_key and client_email)"; } catch { return "Must be valid JSON"; } };
const email = (v: string) => (/^[^<>]{0,60}<?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/.test(v) ? null : 'Use an address like Walkie <hello@walkie.run>');

export const REGISTRY: GroupDef[] = [
  { id: "paymongo", title: "PayMongo (GCash, Maya, cards, QR Ph)", help: "Dashboard → Developers. Webhook URL: https://walkie.run/api/webhooks/paymongo", fields: [
    { key: "PAYMONGO_SECRET_KEY", label: "Secret key", secret: true, placeholder: "sk_live_…", check: prefix("sk_live_", "sk_test_") },
    { key: "PAYMONGO_WEBHOOK_SECRET", label: "Webhook signing secret", secret: true, placeholder: "whsk_…", check: prefix("whsk_") },
    { key: "PAYMONGO_PAYMENT_METHODS", label: "Payment methods", secret: false, placeholder: "gcash,paymaya,card,qrph", check: (v) => (/^[a-z_]+(,[a-z_]+)*$/.test(v.replace(/\s/g, "")) ? null : "Comma-separated method names") },
  ] },
  { id: "stripe", title: "Stripe (cards, outside the Philippines)", help: "Webhook URL: https://walkie.run/api/webhooks/stripe · price IDs are set per plan under Plans.", fields: [
    { key: "STRIPE_SECRET_KEY", label: "Secret key", secret: true, placeholder: "sk_live_…", check: prefix("sk_live_", "sk_test_", "rk_live_", "rk_test_") },
    { key: "STRIPE_WEBHOOK_SECRET", label: "Webhook signing secret", secret: true, placeholder: "whsec_…", check: prefix("whsec_") },
  ] },
  { id: "revenuecat", title: "RevenueCat (App Store & Google Play)", help: "Webhook URL: https://walkie.run/api/webhooks/revenuecat", fields: [
    { key: "REVENUECAT_WEBHOOK_AUTH", label: "Webhook authorization header", secret: true },
    { key: "REVENUECAT_SECRET_API_KEY", label: "Secret API key", secret: true, placeholder: "sk_…" },
  ] },
  { id: "email", title: "Email (Resend)", help: "Verification, password reset and support emails.", fields: [
    { key: "RESEND_API_KEY", label: "API key", secret: true, placeholder: "re_…", check: prefix("re_") },
    { key: "EMAIL_FROM", label: "From address", secret: false, placeholder: "Walkie <hello@walkie.run>", check: email },
  ] },
  { id: "google", title: "Google sign-in", help: "Authorised redirect URI: https://walkie.run/api/auth/oauth/google/callback", fields: [
    { key: "GOOGLE_CLIENT_ID", label: "Client ID", secret: false, placeholder: "….apps.googleusercontent.com" },
    { key: "GOOGLE_CLIENT_SECRET", label: "Client secret", secret: true },
  ] },
  { id: "apple", title: "Sign in with Apple", help: "Return URL: https://walkie.run/api/auth/oauth/apple/callback", fields: [
    { key: "APPLE_CLIENT_ID", label: "Services ID", secret: false, placeholder: "run.walkie.web" },
    { key: "APPLE_TEAM_ID", label: "Team ID", secret: false },
    { key: "APPLE_KEY_ID", label: "Key ID", secret: false },
    { key: "APPLE_PRIVATE_KEY", label: "Private key (.p8)", secret: true, multiline: true, check: pem },
  ] },
  { id: "maps", title: "Maps", help: "Provider order per platform is set on the Maps page. Restrict Google keys in Google Cloud Console.", fields: [
    { key: "GOOGLE_MAPS_WEB_KEY", label: "Google Maps web key", secret: true, placeholder: "AIza…", check: prefix("AIza") },
    { key: "GOOGLE_MAPS_IOS_KEY", label: "Google Maps iOS key", secret: true, placeholder: "AIza…", check: prefix("AIza") },
    { key: "GOOGLE_MAPS_ANDROID_KEY", label: "Google Maps Android key", secret: true, placeholder: "AIza…", check: prefix("AIza") },
    { key: "APPLE_MAPKIT_TEAM_ID", label: "MapKit team ID", secret: false },
    { key: "APPLE_MAPKIT_KEY_ID", label: "MapKit key ID", secret: false },
    { key: "APPLE_MAPKIT_PRIVATE_KEY", label: "MapKit private key (.p8)", secret: true, multiline: true, check: pem },
    { key: "MAP_STYLE_URL", label: "Open map style URL", secret: false, placeholder: "https://tiles.openfreemap.org/styles/liberty", check: url },
  ] },
  { id: "push", title: "Push notifications (Firebase)", help: "Firebase → Project settings → Service accounts → Generate key.", fields: [
    { key: "FCM_SERVICE_ACCOUNT_JSON", label: "Service-account JSON", secret: true, multiline: true, check: json },
  ] },
  { id: "analytics", title: "Analytics (PostHog)", help: "Optional forwarding of first-party, property-sanitised events.", fields: [
    { key: "POSTHOG_API_KEY", label: "Project API key", secret: true, placeholder: "phc_…" },
    { key: "POSTHOG_HOST", label: "Host", secret: false, placeholder: "https://us.i.posthog.com", check: url },
  ] },
  { id: "ads", title: "Rewarded ads", help: "Also gated by the Ads flag and setting.", fields: [
    { key: "ADS_PROVIDER", label: "Provider", secret: false, placeholder: "admob" },
    { key: "ADS_PUBLISHER_ID", label: "Publisher ID", secret: false },
  ] },
];
export const FIELDS = new Map(REGISTRY.flatMap((g) => g.fields.map((f) => [f.key, f] as const)));

/* ── encryption ─────────────────────────────────────────────── */
function encKey(): Buffer | null {
  const raw = process.env.CONFIG_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 32) return null;
  return createHash("sha256").update(`walkie-config:${raw}`).digest(); // normalise any ≥32-char secret to 32 bytes
}
export const encryptionReady = () => !!encKey();
export function seal(plain: string, aad: string): string {
  const k = encKey(); if (!k) throw new Error("CONFIG_ENCRYPTION_KEY is not set");
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", k, iv); c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(":");
}
export function open(sealed: string, aad: string): string | null {
  const k = encKey(); if (!k) return null;
  const [v, iv, tag, ct] = sealed.split(":");
  if (v !== "v1" || !iv || !tag || !ct) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64url")); d.setAAD(Buffer.from(aad)); d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch { return null; } // wrong key or tampered row → treated as unset (and reported in admin)
}

/* ── live overlay ───────────────────────────────────────────── */
type Overlay = { values: Map<string, string>; meta: Map<string, { updatedAt: Date; ok: boolean }>; at: number; loading: Promise<void> | null };
const G = globalThis as unknown as { __walkieCfg?: Overlay };
const O: Overlay = (G.__walkieCfg ??= { values: new Map(), meta: new Map(), at: 0, loading: null });

export async function refreshConfig(force = false) {
  if (!force && Date.now() - O.at < 30000) return;
  if (O.loading && !force) return O.loading;
  O.loading = (async () => {
    try {
      const { db } = await import("../db");
      const rows = await db.integrationSecret.findMany();
      const values = new Map<string, string>(), meta = new Map<string, { updatedAt: Date; ok: boolean }>();
      for (const r of rows) {
        if (!FIELDS.has(r.key)) continue;
        const v = open(r.value, r.key);
        if (v != null) values.set(r.key, v);
        meta.set(r.key, { updatedAt: r.updatedAt, ok: v != null });
      }
      O.values = values; O.meta = meta; O.at = Date.now();
    } catch { O.at = Date.now() - 20000; /* DB not ready yet — retry soon, keep env values */ }
    finally { O.loading = null; }
  })();
  return O.loading;
}

/** Synchronous config read: admin-set value → environment variable → undefined. */
export function cfg(name: string): string | undefined {
  if (Date.now() - O.at > 30000 && !O.loading) void refreshConfig();
  const a = O.values.get(name);
  if (a != null && a !== "") return a;
  const e = process.env[name];
  return e && e.trim() !== "" ? e : undefined;
}
export const configSource = (name: string): "admin" | "env" | null =>
  O.values.get(name) ? "admin" : process.env[name]?.trim() ? "env" : null;
export const configMeta = (name: string) => O.meta.get(name) ?? null;
