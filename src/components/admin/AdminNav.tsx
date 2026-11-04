"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Walkie } from "../mascot/Walkie";
const LINKS: [string, string, string][] = [
  ["/admin", "Dashboard", "SUPPORT"], ["/admin/users", "Users", "SUPPORT"], ["/admin/tickets", "Support", "SUPPORT"],
  ["/admin/catalog/activities", "Activities & rewards", "ADMIN"], ["/admin/catalog/pets", "Pets", "ADMIN"], ["/admin/catalog/items", "Shop items", "ADMIN"], ["/admin/catalog/missions", "Missions", "ADMIN"], ["/admin/catalog/challenges", "Challenges", "ADMIN"], ["/admin/catalog/achievements", "Badges", "ADMIN"],
  ["/admin/achievements", "Badge analytics", "ADMIN"], ["/admin/referrals", "Referrals", "MODERATOR"], ["/admin/leaderboard", "Leaderboards", "MODERATOR"], ["/admin/subscriptions", "Subscriptions", "ADMIN"], ["/admin/catalog/plans", "Plans", "ADMIN"], ["/admin/catalog/ads", "Ads", "ADMIN"], ["/admin/catalog/flags", "Feature flags", "ADMIN"], ["/admin/settings", "Settings", "ADMIN"], ["/admin/maps", "Maps & Location", "ADMIN"], ["/admin/audit", "Audit log", "ADMIN"], ["/admin/security", "Security", "ADMIN"],
];
const RANK: Record<string, number> = { USER: 0, SUPPORT: 1, MODERATOR: 2, ADMIN: 3, OWNER: 4 };
export function AdminNav({ role, name }: { role: string; name: string }) {
  const path = usePathname();
  const links = LINKS.filter(([, , min]) => RANK[role] >= RANK[min]);
  return (
    <aside className="border-b border-walkie-gray bg-white lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-2 px-4 py-3 lg:py-5"><Walkie size={38} mood="sit" title="" /><div><p className="font-display font-semibold leading-none">Walkie Admin</p><p className="text-[11px] font-bold text-walkie-muted">{name} · {role.toLowerCase()}</p></div></div>
      <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible" aria-label="Admin">
        {links.map(([h, l]) => { const a = h === "/admin" ? path === h : path.startsWith(h); return <Link key={h} href={h} className={`shrink-0 rounded-xl px-3 py-2 text-[14px] font-bold ${a ? "bg-walkie-pale text-walkie-blue" : "text-walkie-slate hover:bg-walkie-light"}`}>{l}</Link>; })}
        <Link href="/app" className="shrink-0 rounded-xl px-3 py-2 text-[14px] font-bold text-walkie-muted hover:bg-walkie-light lg:mt-4">← Back to app</Link>
      </nav>
    </aside>
  );
}
