import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/auth/crypto";
import { settleDue } from "@/lib/leaderboard/service";
import { settleDuels } from "@/lib/leaderboard/duels";
/** Schedule hourly: settles finished weeks/months (rewards once) and expired friendly challenges. Authorization: Bearer CRON_SECRET */
export async function POST(req: NextRequest) {
  if (!env.cronSecret || !safeEqual(req.headers.get("authorization") ?? "", `Bearer ${env.cronSecret}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [periods, duels] = await Promise.all([settleDue(), settleDuels()]);
  return NextResponse.json({ periods, duels });
}
