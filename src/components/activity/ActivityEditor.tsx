"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "../ui/Toast";
import { Sheet } from "../ui/Sheet";

export function ActivityEditor({ id, title, note, shared, shareUrl }: { id: string; title: string; note: string; shared: boolean; shareUrl: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [t, setT] = useState(title);
  const [n, setN] = useState(note);
  const [del, setDel] = useState(false);
  const dirty = t !== title || n !== note;
  return (
    <section className="card space-y-3 p-5">
      <h2 className="font-display text-lg font-semibold">Details</h2>
      <label className="block"><span className="label">Title</span><input className="input" maxLength={80} placeholder="Morning walk with Walkie" value={t} onChange={(e) => setT(e.target.value)} /></label>
      <label className="block"><span className="label">Notes</span><textarea className="input py-3" rows={3} maxLength={500} placeholder="How did it feel?" value={n} onChange={(e) => setN(e.target.value)} /></label>
      <button className="btn-primary w-full" disabled={!dirty} onClick={async () => { try { await api(`/api/activities/${id}`, { method: "PATCH", body: { title: t || null, note: n || null } }); toast("success", "Saved"); router.refresh(); } catch (e: any) { toast("error", e.message); } }}>Save</button>
      {shared && shareUrl && (
        <div className="flex items-center gap-2 rounded-2xl bg-walkie-pale px-3 py-2 text-[13px]"><span className="flex-1 font-semibold text-walkie-slate">Public link is on</span><button className="font-bold text-walkie-blue" onClick={() => navigator.clipboard.writeText(location.origin + shareUrl).then(() => toast("success", "Copied"))}>Copy</button><button className="font-bold text-rose-600" onClick={async () => { await api(`/api/activities/${id}/share`, { method: "DELETE" }); toast("success", "Link turned off"); router.refresh(); }}>Stop sharing</button></div>
      )}
      <button className="btn-danger w-full" onClick={() => setDel(true)}>Delete activity</button>
      <Sheet open={del} onClose={() => setDel(false)} title="Delete this activity?">
        <p className="text-sm text-walkie-muted">The activity and its route are removed. Points, coins and XP it earned are taken back so they can't be earned twice.</p>
        <div className="mt-4 grid gap-2"><button className="btn-danger" onClick={async () => { try { await api(`/api/activities/${id}`, { method: "DELETE" }); router.replace("/app/history"); router.refresh(); } catch (e: any) { toast("error", e.message); } }}>Delete</button><button className="btn-soft" onClick={() => setDel(false)}>Cancel</button></div>
      </Sheet>
    </section>
  );
}
