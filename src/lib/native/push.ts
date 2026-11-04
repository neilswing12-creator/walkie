"use client";
/** Registers for push on native platforms after explicit user consent. */
import { isNative, platform } from "./platform";
import { api } from "../client/api";

export async function enablePush(): Promise<{ ok: boolean; message: string }> {
  if (!isNative()) return { ok: false, message: "Push notifications are available in the mobile app. In-app notifications still work here." };
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return { ok: false, message: "Notifications are turned off in your device settings." };
  return new Promise((resolve) => {
    PushNotifications.addListener("registration", async (t) => { await api("/api/push/register", { body: { token: t.value, platform: platform() } }); resolve({ ok: true, message: "Push notifications on" }); });
    PushNotifications.addListener("registrationError", (e) => resolve({ ok: false, message: e.error }));
    PushNotifications.register();
  });
}
