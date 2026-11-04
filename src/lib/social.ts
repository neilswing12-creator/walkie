import "server-only";
import { db } from "./db";

export async function areFriends(a: string, b: string) {
  if (a === b) return true;
  const f = await db.friendship.findFirst({ where: { status: "ACCEPTED", OR: [{ requesterId: a, addresseeId: b }, { requesterId: b, addresseeId: a }] } });
  return !!f;
}

export async function friendIds(userId: string) {
  const rows = await db.friendship.findMany({ where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] } });
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

export async function canSee(viewerId: string, ownerId: string, visibility: string) {
  if (viewerId === ownerId) return true;
  if (visibility === "PUBLIC") return true;
  if (visibility === "FRIENDS") return areFriends(viewerId, ownerId);
  return false;
}
