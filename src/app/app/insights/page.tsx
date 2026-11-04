import { getCurrentUser } from "@/lib/auth/session";
import { getInsights } from "@/lib/queries/insights";
import { InsightsClient } from "@/components/insights/InsightsClient";
export const metadata = { title: "Insights" };
export default async function Page({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const range = sp.range === "month" ? "month" : "week";
  return <InsightsClient data={await getInsights((await getCurrentUser())!, range)} />;
}
