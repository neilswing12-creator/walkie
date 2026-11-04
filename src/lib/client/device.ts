"use client";
/** Persists the server-issued install token (web: localStorage; native webview: same, survives app restarts). */
const KEY = "walkie.install";
let pending: Promise<string | null> | null = null;
export function getInstallToken(): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  try { const t = localStorage.getItem(KEY); if (t) return Promise.resolve(t); } catch { return Promise.resolve(null); }
  pending ??= fetch("/api/device/token").then((r) => r.json()).then((j) => { const t = j?.data?.token as string; try { localStorage.setItem(KEY, t); } catch {} return t; }).catch(() => null);
  return pending;
}
