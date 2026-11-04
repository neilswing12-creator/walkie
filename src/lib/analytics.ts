/**
 * Privacy-conscious analytics. Events are stored first-party; optionally forwarded to PostHog.
 * Health metrics, GPS coordinates and free text are stripped before storage/forwarding.
 */
import "server-only";
import { db } from "./db";
import { env } from "./env";

const BLOCKED_KEYS = /lat|lng|lon|coord|route|point|location|gps|weight|height|heart|calorie|step|pace|email|name|password|token|note|message/i;

export function sanitizeProps(props: Record<string, unknown> = {}) {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (BLOCKED_KEYS.test(k)) continue;
    if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else if (typeof v === "string" && v.length <= 64) out[k] = v;
  }
  return out;
}

export async function track(name: string, userId?: string | null, props?: Record<string, unknown>) {
  const clean = sanitizeProps(props);
  try {
    await db.analyticsEvent.create({ data: { name, userId: userId ?? null, props: clean } });
    if (env.posthog.key) {
      fetch(`${env.posthog.host}/capture/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ api_key: env.posthog.key, event: name, distinct_id: userId ?? "anonymous", properties: clean }),
      }).catch(() => {});
    }
  } catch (e) {
    console.warn("[analytics] failed", name);
  }
}
