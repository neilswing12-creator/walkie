import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { refreshConfig } from "@/lib/integrations/config";
/** Which social sign-in buttons to show. Booleans only — never exposes client IDs or secrets. */
export const dynamic = "force-dynamic";
export async function GET() {
  await refreshConfig();
  return NextResponse.json({ data: { google: !!(env.google.clientId && env.google.clientSecret), apple: !!(env.apple.clientId && env.apple.teamId && env.apple.keyId && env.apple.privateKey) } }, { headers: { "Cache-Control": "public, max-age=30" } });
}
