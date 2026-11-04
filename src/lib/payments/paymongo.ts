/**
 * PayMongo (Philippines): hosted Checkout Sessions for GCash, Maya, cards, QR Ph, GrabPay.
 * Sold as prepaid Walkie Plus passes (30 / 365 days) — PayMongo's e-wallets don't support recurring billing.
 * Trust model: the server creates the order (price from the DB), the signed webhook is the only thing that grants access,
 * and the paid amount/currency/order id are re-checked against PayMongo's API before granting.
 */
import "server-only";
import { createHmac } from "node:crypto";
import { env } from "../env";
import { safeEqual } from "../auth/crypto";

const API = (process.env.PAYMONGO_API_BASE || "https://api.paymongo.com/v1").replace(/\/$/, ""); // override only for local tests
const auth = () => `Basic ${Buffer.from(`${env.paymongo.secretKey}:`).toString("base64")}`;

/** Paymongo-Signature: t=<ts>,te=<test sig>,li=<live sig>; sig = HMAC-SHA256(secret, `${t}.${rawBody}`). 5-minute replay window. */
export function verifyPaymongoSignature(raw: string, header: string | null, livemode: boolean, secret = env.paymongo.webhookSecret, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => { const i = p.indexOf("="); return [p.slice(0, i).trim(), p.slice(i + 1).trim()]; }));
  const t = Number(parts.t);
  if (!t || Math.abs(now / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest("hex");
  const got = livemode ? parts.li : parts.te;
  return !!got && safeEqual(got, expected);
}

export async function createPaymongoCheckout(o: { orderId: string; userId: string; email: string; name: string; planName: string; amount: number; days: number }) {
  const res = await fetch(`${API}/checkout_sessions`, {
    method: "POST",
    headers: { authorization: auth(), "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ data: { attributes: {
      line_items: [{ name: `${o.planName} (${o.days} days)`, amount: o.amount, currency: "PHP", quantity: 1 }],
      payment_method_types: env.paymongo.methods,
      reference_number: o.orderId,
      description: `Walkie Plus pass · ${o.days} days`,
      send_email_receipt: true,
      show_description: true,
      show_line_items: true,
      billing: { email: o.email, name: o.name.slice(0, 60) },
      success_url: `${env.appUrl}/app/plus?status=success&provider=paymongo`,
      cancel_url: `${env.appUrl}/app/plus?status=cancelled`,
      metadata: { orderId: o.orderId, userId: o.userId },
    } } }),
  });
  const j = (await res.json().catch(() => null)) as { data?: { id: string; attributes: { checkout_url: string } }; errors?: { detail: string }[] } | null;
  if (!res.ok || !j?.data) throw new Error(`PayMongo checkout failed (${res.status}) ${j?.errors?.[0]?.detail ?? ""}`.trim());
  return { id: j.data.id, url: j.data.attributes.checkout_url };
}

export type PaymongoPayment = { id: string; attributes: { amount: number; currency: string; status: string } };
/** Server-to-server re-check of a checkout session (never trust the webhook body alone for amounts). */
export async function retrievePaymongoCheckout(id: string) {
  const res = await fetch(`${API}/checkout_sessions/${encodeURIComponent(id)}`, { headers: { authorization: auth(), accept: "application/json" } });
  if (!res.ok) return null;
  const j = (await res.json()) as { data?: { id: string; attributes: { reference_number?: string; payments?: PaymongoPayment[]; line_items?: { amount: number; currency: string }[] } } };
  return j.data ?? null;
}
