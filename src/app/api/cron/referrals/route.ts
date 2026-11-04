import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/auth/crypto";
import { processQualified, referralSettings } from "@/lib/referrals/service";
import { purgeExpiredSignals } from "@/lib/referrals/signals";
import { purgeExpired } from "@/lib/security-log";
/** Schedule hourly: releases delayed referrer rewards and purges expired IP signals. Authorization: Bearer CRON_SECRET */
export async function POST(req: NextRequest) {
  if (!env.cronSecret || !safeEqual(req.headers.get("authorization") ?? "", `Bearer ${env.cronSecret}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cfg = await referralSettings();
  const [released, purged, retention] = await Promise.all([processQualified(), purgeExpiredSignals(cfg.ipRetentionDays), purgeExpired()]);
  return NextResponse.json({ released, purged: purged.count, retention });
}
