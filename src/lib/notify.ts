/** In-app notifications (always) + push/email when the user has consented and a provider is configured. */
import "server-only";
import { db, type Tx } from "./db";
import { sendPush } from "./integrations/push";

const PREF_FOR_TYPE: Record<string, "notifyMissions" | "notifyPets" | "notifyFriends" | null> = {
  MISSION: "notifyMissions", PET: "notifyPets", FRIEND: "notifyFriends", CHALLENGE: "notifyMissions",
  REWARD: null, ACHIEVEMENT: null, SUBSCRIPTION: null, SYSTEM: null,
};

export async function notify(userId: string, n: { type: string; title: string; body: string; link?: string }, tx: Tx = db) {
  const profile = await tx.profile.findUnique({ where: { userId } });
  const pref = PREF_FOR_TYPE[n.type];
  if (pref && profile && !profile[pref]) return null;
  const created = await tx.notification.create({ data: { userId, ...n } });
  if (profile?.notifyPush) sendPush(userId, n.title, n.body, n.link).catch(() => {});
  return created;
}
