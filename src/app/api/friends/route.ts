import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { userContext } from "@/lib/context";
import { lastNDays } from "@/lib/dates";

export const GET = handler(async ({ user }) => {
  const ctx = await userContext(user);
  const rows = await db.friendship.findMany({
    where: { OR: [{ requesterId: user.id }, { addresseeId: user.id }], status: { in: ["PENDING", "ACCEPTED"] } },
    include: { requester: { include: { profile: true, pets: { take: 1, include: { species: true } } } }, addressee: { include: { profile: true, pets: { take: 1, include: { species: true } } } } },
    orderBy: { updatedAt: "desc" },
  });
  const week = lastNDays(ctx.today, 7);
  const friendUserIds = rows.filter((r) => r.status === "ACCEPTED").map((r) => (r.requesterId === user.id ? r.addresseeId : r.requesterId));
  const summaries = await db.dailySummary.groupBy({ by: ["userId"], where: { userId: { in: friendUserIds }, date: { in: week } }, _sum: { activeMinutes: true, walkDistanceM: true, runDistanceM: true } });
  return ok(rows.map((r) => {
    const other = r.requesterId === user.id ? r.addressee : r.requester;
    const s = summaries.find((x) => x.userId === other.id);
    const showActivity = r.status === "ACCEPTED" && other.profile?.activityVisibility !== "PRIVATE";
    return {
      id: r.id, status: r.status, incoming: r.addresseeId === user.id,
      user: { id: other.id, name: other.name, username: other.username, avatarUrl: other.avatarUrl, petSpecies: other.pets[0]?.species.key ?? "husky" },
      week: showActivity && s ? { minutes: s._sum.activeMinutes ?? 0, distanceM: (s._sum.walkDistanceM ?? 0) + (s._sum.runDistanceM ?? 0) } : null,
    };
  }));
});

export const POST = handler(async ({ req, user }) => {
  const { handle } = await body(req, z.object({ handle: z.string().trim().min(3).max(200) }));
  const h = handle.replace(/^@/, "").toLowerCase();
  const target = await db.user.findFirst({ where: { OR: [{ username: h }, { email: h }], status: "ACTIVE" }, include: { profile: true } });
  // Same response whether or not the user exists or accepts requests → no account enumeration.
  const generic = ok({ message: "If that person can receive requests, they'll see yours." });
  if (!target || target.id === user.id || target.profile?.allowFriendRequests === false) return generic;
  const existing = await db.friendship.findFirst({ where: { OR: [{ requesterId: user.id, addresseeId: target.id }, { requesterId: target.id, addresseeId: user.id }] } });
  if (existing?.status === "BLOCKED") return generic;
  if (existing?.status === "ACCEPTED") throw new ApiError(409, "You're already friends");
  if (existing && existing.addresseeId === user.id && existing.status === "PENDING") {
    await db.friendship.update({ where: { id: existing.id }, data: { status: "ACCEPTED" } });
    return ok({ message: "You're now friends!" });
  }
  if (existing) await db.friendship.update({ where: { id: existing.id }, data: { status: "PENDING", requesterId: user.id, addresseeId: target.id } });
  else await db.friendship.create({ data: { requesterId: user.id, addresseeId: target.id } });
  await notify(target.id, { type: "FRIEND", title: "New friend request", body: `${user.name} wants to walk with you.`, link: "/app/friends" });
  return generic;
}, { rate: { limit: 20, windowMs: 3600000, key: "friend-req" } });
