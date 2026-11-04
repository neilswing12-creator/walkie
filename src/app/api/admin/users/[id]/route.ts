import { z } from "zod";
import { handler, ok, body, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { hasRole, requireReauth } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { ROLES, ROLE_RANK } from "@/lib/constants";
import { notify } from "@/lib/notify";

export const GET = handler<{ id: string }>(async ({ params, user }) => {
  const u = await db.user.findUnique({
    where: { id: params.id },
    include: { wallet: true, streak: true, subscriptions: { orderBy: { updatedAt: "desc" } }, tickets: { orderBy: { createdAt: "desc" }, take: 10 }, _count: { select: { pets: true, activities: true, achievements: true } } },
  });
  if (!u) throw new ApiError(404, "User not found");
  const { passwordHash, ...safe } = u;
  void passwordHash;
  // Activity aggregates only for moderators+; precise routes are never exposed in the admin panel.
  const activity = hasRole(user, "MODERATOR")
    ? await db.activity.aggregate({ where: { userId: u.id, status: "COMPLETED" }, _sum: { distanceM: true, durationSec: true }, _max: { startedAt: true } })
    : null;
  const ledger = await db.ledgerEntry.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 20 });
  return ok({ user: safe, activity, ledger });
}, { role: "SUPPORT" });

const schema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]).optional(), role: z.enum(ROLES).optional(), reason: z.string().max(300).optional(), confirmPassword: z.string().max(200).optional() });

export const PATCH = handler<{ id: string }>(async ({ req, params, user }) => {
  const input = await body(req, schema);
  if (params.id === user.id) throw new ApiError(400, "You can't change your own status or role");
  const target = await db.user.findUnique({ where: { id: params.id } });
  if (!target) throw new ApiError(404, "User not found");
  // least privilege: admins manage support/moderator roles; only owners create or change admins/owners
  if (input.role && !hasRole(user, "ADMIN")) throw new ApiError(403, "Only admins can change roles");
  if (input.role && (hasRole(target, "ADMIN") || ["ADMIN", "OWNER"].includes(input.role)) && !hasRole(user, "OWNER")) throw new ApiError(403, "Only the owner can grant or change admin access");
  if (hasRole(target, "ADMIN") && !hasRole(user, "OWNER")) throw new ApiError(403, "Only the owner can change admin accounts");
  if (input.role && target.role === "OWNER" && input.role !== "OWNER" && (await db.user.count({ where: { role: "OWNER" } })) <= 1) throw new ApiError(400, "Can't demote the last owner");
  if (input.role || input.status === "BANNED") await requireReauth(user, input.confirmPassword); // step-up for privilege changes and bans
  await db.user.update({ where: { id: target.id }, data: { status: input.status, role: input.role, statusReason: input.status ? input.reason ?? null : undefined } });
  if (input.role && ROLE_RANK[input.role] < ROLE_RANK[target.role as keyof typeof ROLE_RANK]) await db.session.deleteMany({ where: { userId: target.id } }); // demotions take effect immediately
  // Banned users are signed out everywhere; suspended users keep read-only access.
  if (input.status === "BANNED") await db.session.deleteMany({ where: { userId: target.id } });
  if (input.status === "SUSPENDED") await notify(target.id, { type: "SYSTEM", title: "Account suspended", body: input.reason ?? "Contact support for details." });
  await audit(user.id, input.role ? "user.role" : `user.status.${input.status?.toLowerCase()}`, "user", target.id, { role: input.role, status: input.status, reason: input.reason, previous: { role: target.role, status: target.status } });
  return ok({});
}, { role: "MODERATOR" });
