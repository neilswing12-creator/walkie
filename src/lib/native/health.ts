"use client";
/**
 * Apple Health (HealthKit) / Google Health Connect bridge via @capgo/capacitor-health.
 * Reads daily step totals for the last 7 days and posts them to /api/health/sync.
 * Only runs inside the native app — browsers have no access to these stores.
 */
import { isNative, platform } from "./platform";
import { api } from "../client/api";

export function healthAvailable() { return isNative(); }

export async function syncHealth(): Promise<{ accepted: number } | { error: string }> {
  if (!isNative()) return { error: "Health sync works in the Walkie iOS and Android apps." };
  try {
    const { Health } = await import("@capgo/capacitor-health");
    const avail = await Health.isAvailable();
    if (!avail.available) return { error: platform() === "android" ? "Install or update Health Connect to sync steps." : "Health data isn't available on this device." };
    await Health.requestAuthorization({ read: ["steps"], write: [] });
    const days: { date: string; steps: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - i);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      const res = await Health.readSamples({ dataType: "steps", startDate: start.toISOString(), endDate: end.toISOString(), limit: 10000 });
      const steps = Math.round((res.samples ?? []).reduce((t: number, s: { value: number }) => t + (s.value ?? 0), 0));
      const date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
      days.push({ date, steps });
    }
    return await api<{ accepted: number }>("/api/health/sync", { body: { source: platform() === "ios" ? "HEALTHKIT" : "HEALTH_CONNECT", days } });
  } catch (e: any) {
    return { error: e?.message ?? "Couldn't read health data" };
  }
}
