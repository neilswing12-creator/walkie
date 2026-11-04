import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { db } from "@/lib/db";

/** GDPR-style export of everything we hold about the caller (including their private routes). */
export const GET = handler(async ({ user }) => {
  const data = await db.user.findUnique({
    where: { id: user.id },
    include: {
      profile: true, wallet: true, streak: true, activities: { include: { route: true } }, dailySummaries: true,
      pets: { include: { species: { select: { key: true, name: true } }, accessories: true } }, inventory: { include: { item: { select: { key: true, name: true } } } },
      shopLayout: { include: { placements: true } }, ledger: true, dailyClaims: true, achievements: true, missionProgress: true,
      notifications: true, subscriptions: true, sentRequests: true, receivedRequests: true, challenges: true,
    },
  });
  const { passwordHash, ...safe } = data!;
  void passwordHash;
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), ...safe }, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="walkie-export-${new Date().toISOString().slice(0, 10)}.json"` },
  });
}, { allowSuspended: true, rate: { limit: 5, windowMs: 3600000, key: "export" } });
