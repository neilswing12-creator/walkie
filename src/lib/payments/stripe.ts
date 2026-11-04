/** Minimal Stripe REST client (no SDK) for web subscriptions. Entitlements change only via verified webhooks. */
import "server-only";
import { env } from "../env";
import { hmacSha256Hex, safeEqual } from "../auth/crypto";
import { ApiError } from "../api-error";

function form(obj: Record<string, string | number | boolean | undefined>, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out.append(prefix ? `${prefix}[${k}]` : k, String(v));
  return out;
}

async function stripe<T>(path: string, params: URLSearchParams): Promise<T> {
  if (!env.stripe.secretKey) throw new ApiError(503, "Payments aren't configured yet", "payments_unconfigured");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST", headers: { authorization: `Bearer ${env.stripe.secretKey}`, "content-type": "application/x-www-form-urlencoded" }, body: params,
  });
  const j = await res.json();
  if (!res.ok) throw new ApiError(502, j?.error?.message ?? "Payment provider error", "stripe_error");
  return j as T;
}

export async function createCheckoutSession(p: { userId: string; email: string; priceId: string; trialDays: number; customerId?: string | null }) {
  const params = form({
    mode: "subscription", "line_items[0][price]": p.priceId, "line_items[0][quantity]": 1,
    success_url: `${env.appUrl}/app/plus?status=success`, cancel_url: `${env.appUrl}/app/plus?status=cancelled`,
    client_reference_id: p.userId, "subscription_data[metadata][userId]": p.userId, "metadata[userId]": p.userId,
    ...(p.customerId ? { customer: p.customerId } : { customer_email: p.email }),
    ...(p.trialDays > 0 ? { "subscription_data[trial_period_days]": p.trialDays } : {}),
    allow_promotion_codes: true,
  });
  return stripe<{ id: string; url: string }>("checkout/sessions", params);
}

export async function createPortalSession(customerId: string) {
  return stripe<{ url: string }>("billing_portal/sessions", form({ customer: customerId, return_url: `${env.appUrl}/app/plus` }));
}

/** Verifies the Stripe-Signature header (t=…,v1=…) with a 5-minute tolerance. */
export function verifyStripeSignature(payload: string, header: string | null, secret = env.stripe.webhookSecret): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = hmacSha256Hex(secret, `${t}.${payload}`);
  return header.split(",").filter((s) => s.startsWith("v1=")).some((s) => safeEqual(s.slice(3), expected));
}

export function mapStripeStatus(s: string): string {
  switch (s) {
    case "trialing": return "TRIALING";
    case "active": return "ACTIVE";
    case "past_due": return "PAST_DUE";
    case "canceled": return "CANCELED";
    case "unpaid": case "incomplete_expired": return "EXPIRED";
    default: return "EXPIRED";
  }
}
