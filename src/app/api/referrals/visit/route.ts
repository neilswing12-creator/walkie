import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
/** Invite link handler: remembers a valid code for 30 days (httpOnly cookie), then starts onboarding. */
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const res = NextResponse.redirect(`${env.appUrl}/welcome`, 303);
  if (!rateLimit(`ref-visit:${ip}`, 60, 3600000).ok) return res;
  const u = code ? await db.user.findUnique({ where: { referralCode: code }, select: { status: true } }) : null;
  if (u?.status === "ACTIVE") res.cookies.set("walkie_ref", code, { httpOnly: true, sameSite: "lax", secure: env.isProd, path: "/", maxAge: 30 * 86400 });
  return res;
}
