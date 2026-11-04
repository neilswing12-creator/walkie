/** Route-handler wrapper: auth, role checks, CSRF origin check, rate limits, zod validation, uniform errors. */
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type output } from "zod";
import { getCurrentUser, getSessionContext, staffSessionStale, hasRole, type CurrentUser } from "./auth/session";
import { rateLimit } from "./rate-limit";
import { env } from "./env";
import type { Role } from "./constants";

import { ApiError } from "./api-error";
export { ApiError };

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json({ ok: true, data }, init);
export const fail = (status: number, message: string, code = "error", extra?: Record<string, unknown>) =>
  NextResponse.json({ ok: false, error: { code, message, ...extra } }, { status });

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

function originAllowed(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return true;
  if (req.headers.get("authorization")?.startsWith("Bearer ")) return true; // token clients aren't CSRF-able
  const origin = req.headers.get("origin");
  if (!origin) return !env.isProd; // server-to-server / curl in dev
  const allowed = new Set([new URL(env.appUrl).origin, req.nextUrl.origin, "capacitor://localhost", "https://localhost"]);
  return allowed.has(origin);
}

type Ctx<P> = { req: NextRequest; params: P; user: CurrentUser; ip: string };
type PublicCtx<P> = { req: NextRequest; params: P; user: CurrentUser | null; ip: string };

interface Options {
  role?: Role;
  rate?: { limit: number; windowMs: number; key?: string };
  allowSuspended?: boolean;
}

function wrap<P>(fn: (ctx: any) => Promise<Response>, opts: Options & { public?: boolean }) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    try {
      if (!originAllowed(req)) return fail(403, "Cross-site request blocked", "csrf");
      const ip = clientIp(req);
      const user = await getCurrentUser();
      if (!opts.public) {
        if (!user) return fail(401, "Please sign in", "unauthorized");
        if (user.status === "SUSPENDED" && !opts.allowSuspended && req.method !== "GET") return fail(403, "Your account is suspended", "suspended");
        if (opts.role && !hasRole(user, opts.role)) { if (opts.role !== "USER") await (await import("./security-log")).securityEvent("admin.forbidden", user.id, { path: req.nextUrl.pathname.slice(0, 80), role: user.role }); return fail(403, "You don't have access to this", "forbidden"); }
        if (opts.role && opts.role !== "USER") { const sc = await getSessionContext(); if (sc && staffSessionStale(sc.session)) return fail(401, "For security, please sign in again to use admin tools", "reauth_required"); }
      }
      if (opts.rate) {
        const key = `${opts.rate.key ?? req.nextUrl.pathname}:${user?.id ?? ip}`;
        const r = rateLimit(key, opts.rate.limit, opts.rate.windowMs);
        if (!r.ok) return fail(429, "Too many requests — slow down a little", "rate_limited", { retryAfter: r.retryAfter });
      }
      const params = (await ctx.params) as P;
      return await fn({ req, params, user, ip });
    } catch (e) {
      if (e instanceof ApiError) return fail(e.status, e.message, e.code);
      if (e instanceof ZodError) return fail(400, e.issues[0]?.message ?? "Invalid input", "validation", { issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
      const code = (e as { code?: string })?.code, msg = e instanceof Error ? e.message : String(e);
      if (code === "P2002") return fail(409, "That was already done", "conflict"); // unique constraint = a concurrent duplicate lost the race
      if (code === "P2034" || code === "P2028" || /Socket timeout|database is locked|Transaction already closed/i.test(msg)) return fail(503, "We're a little busy — please try again", "busy");
      // never log query arguments (Prisma messages can echo them) — first line + error code only
      console.error("[api]", req.method, req.nextUrl.pathname, code ?? "", msg.split("\n").find((l) => l.trim() && !/invocation|^\s*[{}]/.test(l))?.slice(0, 200) ?? "error");
      return fail(500, "Something went wrong on our side", "server_error");
    }
  };
}

/** Authenticated route. */
export function handler<P = Record<string, string>>(fn: (ctx: Ctx<P>) => Promise<Response>, opts: Options = {}) {
  return wrap<P>(fn, opts);
}

/** Public route — user may be null. */
export function publicHandler<P = Record<string, string>>(fn: (ctx: PublicCtx<P>) => Promise<Response>, opts: Omit<Options, "role"> = {}) {
  return wrap<P>(fn, { ...opts, public: true });
}

export async function body<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<output<S>> {
  let json: unknown;
  const MAX = 2 * 1024 * 1024; // JSON bodies (GPS tracks are the largest) — oversized payloads never reach the validator
  if (Number(req.headers.get("content-length") ?? 0) > MAX) throw new ApiError(413, "Request is too large", "too_large");
  try {
    const text = await req.text();
    if (text.length > MAX) throw new ApiError(413, "Request is too large", "too_large");
    json = JSON.parse(text);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(400, "Request body must be JSON", "bad_json");
  }
  return schema.parse(json);
}

export function query<S extends ZodTypeAny>(req: NextRequest, schema: S): output<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}
