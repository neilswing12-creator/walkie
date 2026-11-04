import { redirect } from "next/navigation";
import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { SETTING_DEFAULTS, getSetting, type SettingKey } from "@/lib/settings";
import { integrationStatus } from "@/lib/env";
import { SettingsEditor } from "@/components/admin/SettingsEditor";
export const metadata = { title: "Settings" };
export default async function Page() {
  if (!hasRole(await getCurrentUser(), "ADMIN")) redirect("/admin");
  const keys = Object.keys(SETTING_DEFAULTS) as SettingKey[];
  const values = Object.fromEntries(await Promise.all(keys.map(async (k) => [k, await getSetting(k)])));
  return <SettingsEditor values={values} integrations={integrationStatus()} />;
}
