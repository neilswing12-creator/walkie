"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "../ui/Icon";
import { ActivityPicker } from "./ActivityPicker";

const tabs = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/explore", label: "Explore", icon: "compass" },
  { href: "/app/leaderboard", label: "Ranks", icon: "trophy" },
  null,
  { href: "/app/shop", label: "Shop", icon: "store" },
  { href: "/app/insights", label: "Insights", icon: "chart" },
  { href: "/app/profile", label: "Profile", icon: "user" },
] as const;

export function BottomNav() {
  const path = usePathname();
  const [pick, setPick] = useState(false);
  if (path.startsWith("/app/activity/track") || path.startsWith("/app/shop") || path.startsWith("/app/wardrobe") || /^\/app\/friends\/[^/]+\/shop/.test(path)) return null; // full-screen views
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-walkie-gray/60 bg-white/90 pb-[var(--safe-bottom)] backdrop-blur-xl" aria-label="Main">
        <ul className="mx-auto grid max-w-lg grid-cols-7 items-end px-1 pt-1.5">
          {tabs.map((t, i) =>
            t === null ? (
              <li key="start" className="flex justify-center">
                <button onClick={() => setPick(true)} className="focus-ring -mt-5 grid h-14 w-14 place-items-center rounded-full bg-walkie-blue text-white shadow-button transition active:scale-95" aria-label="Start activity">
                  <Icon name="plus" size={28} strokeWidth={2.6} />
                </button>
                <span className="sr-only">Start</span>
              </li>
            ) : (
              <li key={t.href}>
                {(() => {
                  const active = t.href === "/app" ? path === "/app" : path.startsWith(t.href);
                  return (
                    <Link href={t.href} className={`focus-ring flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10.5px] font-bold transition ${active ? "text-walkie-blue" : "text-walkie-muted hover:text-walkie-slate"}`} aria-current={active ? "page" : undefined}>
                      <Icon name={t.icon} size={24} strokeWidth={active ? 2.4 : 2} fill={active ? "rgba(107,143,214,.14)" : "none"} />
                      {t.label}
                    </Link>
                  );
                })()}
              </li>
            ),
          )}
        </ul>
      </nav>
      <ActivityPicker open={pick} onClose={() => setPick(false)} />
    </>
  );
}
