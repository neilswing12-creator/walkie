import { getCurrentUser } from "@/lib/auth/session";
import { getBadgeCollection } from "@/lib/queries/badges";
import { BadgesClient } from "@/components/badges/BadgesClient";
export const metadata = { title: "My Achievements" };
export default async function Page() {
  const user = (await getCurrentUser())!;
  return <BadgesClient data={await getBadgeCollection(user.id)} userName={user.name.split(" ")[0]} />;
}
