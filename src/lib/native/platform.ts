"use client";
/** Runtime platform detection without bundling native code into the web build path. */
export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const c = (window as any).Capacitor;
  return !!c?.isNativePlatform?.();
}
export function platform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  return ((window as any).Capacitor?.getPlatform?.() as "ios" | "android" | "web") ?? "web";
}
