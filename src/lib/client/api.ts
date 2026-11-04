"use client";
/** Typed fetch helper for client components. Throws ApiClientError with the server's friendly message. */
export class ApiClientError extends Error {
  constructor(public status: number, message: string, public code: string) { super(message); }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const needsDevice = /^\/api\/(auth\/(signup|login)|referrals)/.test(path);
  const install = needsDevice ? await (await import("./device")).getInstallToken() : null;
  const res = await fetch(path, {
    method: opts.method ?? (opts.body || opts.form ? "POST" : "GET"),
    headers: { ...(opts.form ? {} : opts.body ? { "content-type": "application/json" } : {}), ...(install ? { "x-walkie-install": install } : {}) },
    body: opts.form ?? (opts.body ? JSON.stringify(opts.body) : undefined),
    credentials: "same-origin",
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok || json?.ok === false) throw new ApiClientError(res.status, json?.error?.message ?? "Something went wrong. Please try again.", json?.error?.code ?? "error");
  return json?.data as T;
}

export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).slice(2) + Date.now().toString(36));
