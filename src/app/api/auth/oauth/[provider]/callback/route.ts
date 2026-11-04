import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, type Provider } from "@/lib/auth/oauth";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { createUserWithSetup } from "@/lib/auth/account";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/auth/crypto";
import { track } from "@/lib/analytics";
import { onSignup, processReferral } from "@/lib/referrals/service";

async function handle(req: NextRequest, provider: string, code: string | null, state: string | null, appleUser?: string | null) {
  const fail = (e: string) => NextResponse.redirect(`${env.appUrl}/login?error=${e}`, 303);
  if ((provider !== "google" && provider !== "apple") || !code || !state) return fail("oauth");
  const jar = await cookies();
  const raw = jar.get(`oauth_${provider}`)?.value;
  jar.delete(`oauth_${provider}`);
  if (!raw) return fail("oauth_state");
  const saved = JSON.parse(raw) as { state: string; verifier: string };
  if (!safeEqual(saved.state, state)) return fail("oauth_state");
  try {
    const id = await exchangeCode(provider as Provider, code, saved.verifier);
    let account = await db.oAuthAccount.findUnique({ where: { provider_providerAccountId: { provider, providerAccountId: id.providerAccountId } }, include: { user: true } });
    let userId = account?.userId;
    if (!userId) {
      const byEmail = id.email ? await db.user.findUnique({ where: { email: id.email.toLowerCase() } }) : null;
      if (byEmail && !id.emailVerified) return fail("oauth_unverified");
      let name = id.name;
      if (!name && appleUser) try { const u = JSON.parse(appleUser); name = [u?.name?.firstName, u?.name?.lastName].filter(Boolean).join(" "); } catch {}
      // Pre-account-takeover guard: if someone registered this email with a password but never verified it, the verified
      // provider identity proves ownership — the unverified password and any sessions created with it are discarded.
      if (byEmail && !byEmail.emailVerified) {
        await db.user.update({ where: { id: byEmail.id }, data: { passwordHash: null, emailVerified: new Date() } });
        await db.session.deleteMany({ where: { userId: byEmail.id } });
      }
      const user = byEmail ?? (await createUserWithSetup({ email: id.email, name: name || id.email.split("@")[0], emailVerified: id.emailVerified ? new Date() : null, avatarUrl: id.picture }));
      await db.oAuthAccount.create({ data: { provider, providerAccountId: id.providerAccountId, userId: user.id } });
      userId = user.id;
      if (!byEmail) { await track("signup", user.id, { method: provider }); await onSignup(user.id, jar.get("walkie_ref")?.value); jar.delete("walkie_ref"); }
    }
    const user = account?.user ?? (await db.user.findUniqueOrThrow({ where: { id: userId } }));
    if (user.status === "BANNED" || user.status === "DELETED") return fail("account_unavailable");
    await createSession(user.id);
    if (id.emailVerified) processReferral(user.id).catch(() => {});
    return NextResponse.redirect(`${env.appUrl}/app`, 303);
  } catch (e) {
    console.error("[oauth]", provider, e instanceof Error ? e.message : e);
    return fail("oauth");
  }
  void req;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  return handle(req, provider, req.nextUrl.searchParams.get("code"), req.nextUrl.searchParams.get("state"));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const f = await req.formData();
  return handle(req, provider, f.get("code") as string | null, f.get("state") as string | null, f.get("user") as string | null);
}
