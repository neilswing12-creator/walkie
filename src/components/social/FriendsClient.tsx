"use client";
import Link from "next/link";
import { AppIcon } from "../ui/AppIcon";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { Icon } from "../ui/Icon";
import { PetArt } from "../mascot/PetArt";
import { EmptyState, Loading, ErrorState } from "../ui/States";
import { useToast } from "../ui/Toast";
import { num } from "@/lib/format";

type Friend = { id: string; status: string; incoming: boolean; user: { id: string; name: string; username: string | null; petSpecies: string }; week: { minutes: number; distanceM: number } | null };
type Board = { rows: { id: string; name: string; score: number; rank: number; me: boolean }[]; optedIn: boolean };
const METRICS = [["steps", "Steps"], ["walk", "Walk"], ["run", "Run"], ["pets", "Pets"]] as const;

export function FriendsClient() {
  const toast = useToast();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [handle, setHandle] = useState("");
  const [metric, setMetric] = useState<(typeof METRICS)[number][0]>("steps");
  const [scope, setScope] = useState<"friends" | "global">("friends");
  const [board, setBoard] = useState<Board | null>(null);
  const load = useCallback(() => api<Friend[]>("/api/friends").then(setFriends).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const respond = async (id: string, action: "accept" | "decline") => { try { await api(`/api/friends/${id}`, { method: "PATCH", body: { action } }); load(); } catch (e: any) { toast("error", e.message); } };
  const fmt = (n: number) => (metric === "walk" || metric === "run" ? `${(n / 1000).toFixed(1)} km` : num(n));

  return (
    <div className="px-4 pt-[calc(14px+var(--safe-top))]">
      <div className="flex items-center gap-3"><Link href="/app/explore" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card" aria-label="Back"><Icon name="back" size={20} /></Link><h1 className="font-display text-[28px] font-semibold">Friends</h1></div>
      <form className="card mt-4 flex gap-2 p-3" onSubmit={async (e) => { e.preventDefault(); try { const r = await api<{ message: string }>("/api/friends", { body: { handle } }); toast("success", r.message); setHandle(""); load(); } catch (er: any) { toast("error", er.message); } }}>
        <input className="input" placeholder="@username or email" value={handle} onChange={(e) => setHandle(e.target.value)} aria-label="Add a friend" />
        <button className="btn-primary shrink-0" disabled={handle.length < 3}>Add</button>
      </form>
      <button className="btn-soft mt-2 w-full" onClick={async () => { const url = `${location.origin}/signup`; const text = "Walk with me on Walkie! 🐾"; try { if (navigator.share) await navigator.share({ title: "Walkie", text, url }); else { await navigator.clipboard.writeText(`${text} ${url}`); toast("success", "Invite link copied"); } } catch { /* cancelled */ } }}><Icon name="share" size={18} />Invite friends</button>

      {err ? <ErrorState message={err} retry={load} /> : !friends ? <Loading /> : friends.length === 0 ? <div className="card mt-4"><EmptyState title="Walks are better together" body="Add friends by username to compare weekly totals and visit each other's pet shops." mood="greet" /></div> : (
        <div className="card mt-4 divide-y divide-walkie-light">
          {friends.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <PetArt species={f.user.petSpecies} size={44} mood="sit" />
              <div className="min-w-0 flex-1"><p className="font-bold">{f.user.name}</p><p className="text-[12px] text-walkie-muted">{f.status === "PENDING" ? (f.incoming ? "Wants to be friends" : "Request sent") : f.week ? `${f.week.minutes} min · ${(f.week.distanceM / 1000).toFixed(1)} km this week` : "Activity is private"}</p></div>
              {f.status === "PENDING" && f.incoming ? <div className="flex gap-1.5"><button className="btn-primary min-h-[34px] px-3 text-sm" onClick={() => respond(f.id, "accept")}>Accept</button><button className="btn-soft min-h-[34px] px-3 text-sm" onClick={() => respond(f.id, "decline")}>×</button></div>
                : f.status === "ACCEPTED" ? <Link href={`/app/friends/${f.user.id}/shop`} className="btn-soft min-h-[34px] px-3 text-sm">Visit shop</Link> : null}
            </div>
          ))}
        </div>
      )}

      <Link href="/app/leaderboard" className="card mt-6 flex items-center gap-3 overflow-hidden bg-gradient-to-r from-[#3E4E86] to-[#6B8FD6] p-4 text-white">
        <AppIcon name="podium" size={48} />
        <span className="flex-1"><span className="block font-display text-lg font-semibold">Leaderboards & challenges</span><span className="block text-[12px] text-white/80">Podiums, friendly duels and weekly rewards for every pace</span></span>
        <Icon name="chevron" size={18} />
      </Link>
    </div>
  );
}
