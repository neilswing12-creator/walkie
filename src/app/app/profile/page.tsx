import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { userContext } from "@/lib/context";
import { db } from "@/lib/db";
import { levelFromXp } from "@/lib/economy";
import { ProfileClient } from "@/components/profile/ProfileClient";
export const metadata = { title: "Profile" };
export default async function Page() {
  const user = (await getCurrentUser())!;
  const ctx = await userContext(user);
  const [wallet, pets, acts, ach, pet, syncs] = await Promise.all([
    db.wallet.findUnique({ where: { userId: user.id } }), db.pet.count({ where: { userId: user.id } }),
    db.activity.aggregate({ where: { userId: user.id, status: "COMPLETED" }, _sum: { distanceM: true }, _count: true }),
    db.userAchievement.count({ where: { userId: user.id } }),
    ctx.profile.activePetId ? db.pet.findUnique({ where: { id: ctx.profile.activePetId }, include: { species: true } }) : null,
    db.healthSync.findMany({ where: { userId: user.id } }),
  ]);
  const { passwordHash, ...u } = user;
  return <ProfileClient
    user={{ id: u.id, name: u.name, email: u.email, username: u.username, avatarUrl: u.avatarUrl, timezone: u.timezone, emailVerified: !!u.emailVerified, hasPassword: !!passwordHash, isStaff: hasRole(user, "SUPPORT") }}
    profile={JSON.parse(JSON.stringify(ctx.profile))} plus={ctx.plus}
    stats={{ level: levelFromXp(wallet?.xp ?? 0).level, coins: wallet?.coins ?? 0, pets, activities: acts._count, distanceM: acts._sum.distanceM ?? 0, achievements: ach, freezes: wallet?.streakFreezes ?? 0 }}
    petSpecies={pet?.species.key ?? "husky"} lastSync={syncs[0]?.lastSyncedAt?.toISOString() ?? null} />;
}
