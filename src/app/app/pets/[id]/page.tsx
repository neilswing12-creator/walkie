import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getPetDetail } from "@/lib/queries/pets";
import { PetDetailClient } from "@/components/pets/PetDetailClient";
export const metadata = { title: "Pet" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getPetDetail((await getCurrentUser())!, id);
  if (!d) notFound();
  return <PetDetailClient d={d} />;
}
