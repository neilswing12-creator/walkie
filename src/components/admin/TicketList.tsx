"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { useToast } from "../ui/Toast";
export function TicketList({ tickets }: { tickets: { id: string; email: string; subject: string; message: string; status: string; adminNote: string | null; createdAt: string }[] }) {
  const router = useRouter(); const toast = useToast();
  const set = async (id: string, data: object) => { try { await api(`/api/admin/tickets/${id}`, { method: "PATCH", body: data }); router.refresh(); } catch (e: any) { toast("error", e.message); } };
  return (
    <div><h1 className="font-display text-3xl font-semibold">Support requests</h1>
      {tickets.length === 0 && <p className="card mt-4 p-6 text-center text-sm text-walkie-muted">No tickets yet.</p>}
      <div className="mt-4 space-y-3">{tickets.map((t) => (
        <div key={t.id} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-display text-lg font-semibold">{t.subject}</p><select className="rounded-xl bg-walkie-light px-3 py-1.5 text-[13px] font-bold" value={t.status} onChange={(e) => set(t.id, { status: e.target.value })}>{["OPEN", "PENDING", "RESOLVED"].map((s) => <option key={s}>{s}</option>)}</select></div>
          <p className="text-[12px] text-walkie-muted"><a className="font-bold text-walkie-blue" href={`mailto:${t.email}?subject=Re: ${encodeURIComponent(t.subject)}`}>{t.email}</a> · {new Date(t.createdAt).toLocaleString()}</p>
          <p className="mt-2 whitespace-pre-wrap text-[14px]">{t.message}</p>
          <textarea className="input mt-3 py-2 text-[13px]" rows={2} placeholder="Internal note" defaultValue={t.adminNote ?? ""} onBlur={(e) => e.target.value !== (t.adminNote ?? "") && set(t.id, { adminNote: e.target.value })} />
        </div>))}</div>
    </div>
  );
}
