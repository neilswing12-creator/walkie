import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/States";
import { timeAgo } from "@/lib/format";
import { MarkRead } from "@/components/social/MarkRead";
export const metadata = { title: "Notifications" };
const ICON: Record<string, string> = { REWARD: "coin", MISSION: "target", PET: "paw", FRIEND: "users", CHALLENGE: "trophy", SUBSCRIPTION: "star", SYSTEM: "info", ACHIEVEMENT: "medal" };
export default async function Page() {
  const user = (await getCurrentUser())!;
  const list = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div className="px-4 pt-[calc(14px+var(--safe-top))]">
      <div className="flex items-center gap-3"><Link href="/app" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card" aria-label="Back"><Icon name="back" size={20} /></Link><h1 className="flex-1 font-display text-[28px] font-semibold">Notifications</h1>{list.some((n) => !n.readAt) && <MarkRead />}</div>
      {list.length === 0 ? <div className="card mt-4"><EmptyState title="All quiet" body="Rewards, new pets and friend requests will show up here." mood="sleep" /></div> : (
        <div className="card mt-4 divide-y divide-walkie-light">
          {list.map((n) => {
            const inner = (<><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${n.readAt ? "bg-walkie-light text-walkie-muted" : "bg-walkie-pale text-walkie-blue"}`}><Icon name={ICON[n.type] ?? "bell"} size={20} /></span><div className="min-w-0 flex-1"><p className={`text-[15px] ${n.readAt ? "font-semibold" : "font-extrabold"}`}>{n.title}</p><p className="text-[13px] text-walkie-muted">{n.body}</p><p className="mt-0.5 text-[11px] font-bold text-walkie-muted">{timeAgo(n.createdAt)}</p></div>{!n.readAt && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-walkie-blue" />}</>);
            return n.link ? <Link key={n.id} href={n.link} className="flex gap-3 px-4 py-3.5">{inner}</Link> : <div key={n.id} className="flex gap-3 px-4 py-3.5">{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}
