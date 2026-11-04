/**
 * Push notifications via Firebase Cloud Messaging HTTP v1 (covers Android, and iOS via APNs key uploaded to Firebase).
 * Requires FCM_SERVICE_ACCOUNT_JSON. Without it, push is a no-op and in-app notifications still work.
 */
import "server-only";
import { SignJWT, importPKCS8 } from "jose";
import { db } from "../db";
import { env } from "../env";

let cached: { token: string; exp: number } | null = null;

async function accessToken(sa: { client_email: string; private_key: string }) {
  if (cached && cached.exp > Date.now() + 60000) return cached.token;
  const key = await importPKCS8(sa.private_key, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256" }).setIssuer(sa.client_email).setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt().setExpirationTime("1h").sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

export async function sendPush(userId: string, title: string, body: string, link?: string) {
  if (!env.fcm.serverKeyJson) return { sent: 0, configured: false };
  const sa = JSON.parse(env.fcm.serverKeyJson) as { project_id: string; client_email: string; private_key: string };
  const tokens = await db.pushToken.findMany({ where: { userId } });
  if (!tokens.length) return { sent: 0, configured: true };
  const at = await accessToken(sa);
  let sent = 0;
  for (const t of tokens) {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST", headers: { authorization: `Bearer ${at}`, "content-type": "application/json" },
      body: JSON.stringify({ message: { token: t.token, notification: { title, body }, data: link ? { link } : undefined } }),
    });
    if (res.ok) sent++;
    else if (res.status === 404 || res.status === 400) await db.pushToken.delete({ where: { id: t.id } }).catch(() => {});
  }
  return { sent, configured: true };
}
