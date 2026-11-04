"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Field } from "./fields";
import { Sheet } from "../ui/Sheet";
import { api } from "@/lib/client/api";
import { useToast } from "../ui/Toast";
import { BadgeArt } from "../badges/BadgeArt";

type Row = Record<string, any>;
export function CatalogEditor({ resource, config, rows }: { resource: string; config: { label: string; columns: string[]; fields: Field[]; folder?: "pets" | "items"; preview?: "badge" }; rows: Row[] }) {
  const router = useRouter();
  const toast = useToast();
  const [edit, setEdit] = useState<Row | null>(null);
  const [q, setQ] = useState("");
  const blank = Object.fromEntries(config.fields.map((f) => [f.name, f.type === "bool" ? (f.name === "enabled") : f.type === "number" ? (f.nullable ? null : 0) : f.type === "list" ? [] : f.nullable ? null : ""]));
  const list = rows.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  async function save() {
    if (!edit) return;
    const data: Row = {};
    for (const f of config.fields) {
      let v = edit[f.name];
      if (f.type === "number") v = v === "" || v == null ? (f.nullable ? null : 0) : Number(v);
      if (f.type === "date") v = v ? new Date(v).toISOString() : f.nullable ? null : undefined;
      if ((f.type === "select" || f.type === "text" || f.type === "color" || f.type === "image") && f.nullable && v === "") v = null;
      if (v !== undefined) data[f.name] = v;
    }
    try {
      if (edit.id ?? (edit.__existing && edit.key)) await api(`/api/admin/catalog/${resource}/${edit.id ?? edit.key}`, { method: "PATCH", body: data });
      else await api(`/api/admin/catalog/${resource}`, { body: data });
      toast("success", "Saved"); setEdit(null); router.refresh();
    } catch (e: any) { toast("error", e.message); }
  }
  async function remove() {
    if (!edit?.id || !confirm("Delete permanently?")) return;
    try { await api(`/api/admin/catalog/${resource}/${edit.id}`, { method: "DELETE" }); setEdit(null); router.refresh(); } catch (e: any) { toast("error", e.message); }
  }
  const fmt = (v: any) => (typeof v === "boolean" ? (v ? "✓" : "—") : v == null ? "—" : typeof v === "string" && /^\d{4}-\d\d-\d\dT/.test(v) ? v.slice(0, 10) : String(v));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl font-semibold">{config.label}</h1><div className="flex gap-2"><input className="input min-h-[40px] w-56" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />{resource !== "activities" && <button className="btn-primary min-h-[40px]" onClick={() => setEdit({ ...blank })}>New</button>}</div></div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-walkie-light text-[11px] uppercase tracking-wide text-walkie-muted"><tr>{config.columns.map((c) => <th key={c} className="px-3 py-2.5 font-extrabold">{c}</th>)}</tr></thead>
          <tbody>{list.map((r) => <tr key={r.id ?? r.key} onClick={() => setEdit({ ...r, __existing: true })} className="cursor-pointer border-b border-walkie-light/60 hover:bg-walkie-light/60">{config.columns.map((c) => <td key={c} className="whitespace-nowrap px-3 py-2.5 font-semibold">{fmt(r[c])}</td>)}</tr>)}</tbody>
        </table>
        {list.length === 0 && <p className="p-6 text-center text-sm text-walkie-muted">Nothing here yet.</p>}
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Edit ${edit.key ?? ""}` : `New ${config.label.toLowerCase()}`} wide footer={<div className="flex gap-2">{edit?.id && <button className="btn-danger" onClick={remove}>Delete</button>}<span className="flex-1" /><button className="btn-soft" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" onClick={save}>Save</button></div>}>
        {edit && config.preview === "badge" && <div className="mb-4 flex items-center justify-center gap-6 rounded-3xl bg-white p-4 shadow-card"><BadgeArt rarity={edit.rarity} art={edit.art} imageUrl={edit.imageUrl} size={120} /><BadgeArt rarity={edit.rarity} art={edit.art} imageUrl={edit.imageUrl} size={80} locked still /><span className="text-[12px] font-bold text-walkie-muted">Live preview<br />(unlocked / locked)</span></div>}
        {edit && <div className="grid gap-3 sm:grid-cols-2">{config.fields.map((f) => <FieldInput key={f.name} f={f} value={edit[f.name]} onChange={(v) => setEdit({ ...edit, [f.name]: v })} folder={config.folder} />)}</div>}
      </Sheet>
    </div>
  );
}

function FieldInput({ f, value, onChange, folder }: { f: Field; value: any; onChange: (v: any) => void; folder?: "pets" | "items" }) {
  const toast = useToast();
  const label = <span className="label">{f.label ?? f.name}</span>;
  if (f.type === "bool") return <label className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold shadow-card"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-walkie-blue" />{f.label ?? f.name}</label>;
  if (f.type === "select") return <label className="block">{label}<select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>{f.nullable && <option value="">—</option>}{f.options!.map((o) => <option key={o}>{o}</option>)}</select></label>;
  if (f.type === "textarea") return <label className="block sm:col-span-2">{label}<textarea className="input py-3" rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
  if (f.type === "list") return <label className="block sm:col-span-2">{label}<textarea className="input py-3" rows={4} value={(value ?? []).join("\n")} onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} /></label>;
  if (f.type === "json") return <JsonField label={f.label ?? f.name} value={value} onChange={onChange} />;
  if (f.type === "date") return <label className="block">{label}<input type="date" className="input" value={value ? String(value).slice(0, 10) : ""} onChange={(e) => onChange(e.target.value || null)} /></label>;
  if (f.type === "color") return <label className="block">{label}<div className="flex gap-2"><input type="color" className="h-12 w-14 rounded-xl" value={value || "#6B8FD6"} onChange={(e) => onChange(e.target.value.toUpperCase())} /><input className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></div></label>;
  if (f.type === "image") return (
    <label className="block sm:col-span-2">{label}<div className="flex items-center gap-3">{value && <img src={value} alt="" className="h-12 w-12 rounded-xl object-cover" />}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="text-sm" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const form = new FormData(); form.append("file", file); form.append("folder", folder ?? "items"); try { const r = await api<{ url: string }>("/api/admin/upload", { form }); onChange(r.url); } catch (er: any) { toast("error", er.message); } }} />{value && <button type="button" className="text-[13px] font-bold text-rose-600" onClick={() => onChange(null)}>Remove</button>}</div></label>
  );
  return <label className="block">{label}<input className="input" type={f.type === "number" ? "number" : "text"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function JsonField({ label, value, onChange }: { label: string; value: any; onChange: (v: any) => void }) {
  const [text, setText] = useState(value ? JSON.stringify(value) : "");
  const [bad, setBad] = useState(false);
  return <label className="block sm:col-span-2"><span className="label">{label}</span><input className={`input font-mono text-[13px] ${bad ? "border-rose-400" : ""}`} value={text} onChange={(e) => { setText(e.target.value); try { onChange(e.target.value ? JSON.parse(e.target.value) : null); setBad(false); } catch { setBad(true); } }} /><span className="mt-1 block text-[11px] text-walkie-muted">poses: idle, walk, run, bike, sit, sleep, jump, celebrate, happy, greet, discover, interact · scenes: meadow, path, town, park, forest, hills, mountain, summit, globe, aurora, track, finish, road, sunrise, countryside, night, snow, hearts, shop, beach</span></label>;
}
