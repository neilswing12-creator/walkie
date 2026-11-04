import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { buildAuthUrl, type Provider } from "@/lib/auth/oauth";
import { env } from "@/lib/env";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (provider !== "google" && provider !== "apple") return NextResponse.redirect(`${env.appUrl}/login?error=provider`);
  try {
    const { url, state, verifier } = buildAuthUrl(provider as Provider);
    const jar = await cookies();
    // Apple posts back cross-site (form_post), so its state cookie must be SameSite=None.
    jar.set(`oauth_${provider}`, JSON.stringify({ state, verifier }), { httpOnly: true, secure: env.isProd || provider === "apple", sameSite: provider === "apple" ? "none" : "lax", path: "/", maxAge: 600 });
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(`${env.appUrl}/login?error=oauth_unconfigured`);
  }
}
