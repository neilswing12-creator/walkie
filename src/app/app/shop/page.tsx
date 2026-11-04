import { getCurrentUser } from "@/lib/auth/session";
import { getShopState, getCatalog } from "@/lib/queries/shop";
import { getEconomy } from "@/lib/settings";
import { ShopClient } from "@/components/shop/ShopClient";
export const metadata = { title: "Pet shop" };
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = (await getCurrentUser())!;
  const [state, catalog, eco, sp] = await Promise.all([getShopState(user.id), getCatalog(user), getEconomy(), searchParams]);
  return <ShopClient initial={state} catalog={catalog} expansionCosts={eco.shopExpansionCost} openMarket={sp.tab === "market"} />;
}
