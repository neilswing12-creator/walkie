/** Google and Apple sign-in (OIDC authorization-code flow with PKCE + state, ID tokens verified against provider JWKS). */
import "server-only";
import { createRemoteJWKSet, jwtVerify, SignJWT, importPKCS8 } from "jose";
import { createHash } from "node:crypto";
import { env } from "../env";
import { randomToken } from "./crypto";
import { ApiError } from "../api-error";

export type Provider = "google" | "apple";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export const redirectUri = (p: Provider) => `${env.appUrl}/api/auth/oauth/${p}/callback`;

export function buildAuthUrl(p: Provider) {
  const state = randomToken(16);
  const verifier = randomToken(32);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  if (p === "google") {
    if (!env.google.clientId) throw new ApiError(503, "Google sign-in isn't configured", "oauth_unconfigured");
    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.search = new URLSearchParams({ client_id: env.google.clientId, redirect_uri: redirectUri(p), response_type: "code", scope: "openid email profile", state, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account" }).toString();
    return { url: u.toString(), state, verifier };
  }
  if (!env.apple.clientId) throw new ApiError(503, "Apple sign-in isn't configured", "oauth_unconfigured");
  const u = new URL("https://appleid.apple.com/auth/authorize");
  u.search = new URLSearchParams({ client_id: env.apple.clientId, redirect_uri: redirectUri(p), response_type: "code", response_mode: "form_post", scope: "name email", state }).toString();
  return { url: u.toString(), state, verifier };
}

async function appleClientSecret() {
  const key = await importPKCS8(env.apple.privateKey!, "ES256");
  return new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: env.apple.keyId! }).setIssuer(env.apple.teamId!)
    .setAudience("https://appleid.apple.com").setSubject(env.apple.clientId!).setIssuedAt().setExpirationTime("5m").sign(key);
}

export interface OAuthIdentity { providerAccountId: string; email: string; emailVerified: boolean; name?: string; picture?: string }

export async function exchangeCode(p: Provider, code: string, verifier: string): Promise<OAuthIdentity> {
  if (p === "google") {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: env.google.clientId!, client_secret: env.google.clientSecret!, redirect_uri: redirectUri(p), grant_type: "authorization_code", code_verifier: verifier }),
    });
    const j = (await res.json()) as { id_token?: string };
    if (!j.id_token) throw new ApiError(400, "Google sign-in failed");
    const { payload } = await jwtVerify(j.id_token, GOOGLE_JWKS, { issuer: ["https://accounts.google.com", "accounts.google.com"], audience: env.google.clientId });
    return { providerAccountId: String(payload.sub), email: String(payload.email), emailVerified: payload.email_verified === true, name: payload.name as string | undefined, picture: payload.picture as string | undefined };
  }
  const res = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: env.apple.clientId!, client_secret: await appleClientSecret(), redirect_uri: redirectUri(p), grant_type: "authorization_code" }),
  });
  const j = (await res.json()) as { id_token?: string };
  if (!j.id_token) throw new ApiError(400, "Apple sign-in failed");
  const { payload } = await jwtVerify(j.id_token, APPLE_JWKS, { issuer: "https://appleid.apple.com", audience: env.apple.clientId });
  return { providerAccountId: String(payload.sub), email: String(payload.email), emailVerified: payload.email_verified === true || payload.email_verified === "true" };
}
