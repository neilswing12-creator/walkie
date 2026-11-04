"use client";
/**
 * Integrations — set API keys from the admin panel (OWNER only, password re-entry, encrypted at rest).
 * Saved secrets are never sent back to the browser: a secret field only shows whether it's set and where from.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { useToast } from "../ui/Toast";
import { Sheet } from "../ui/Sheet";

type Field = { key: string; label: string; secret: boolean; multiline: boolean; placeholder: string; source: "admin" | "env" | null; value: string | null; updatedAt: string | null; unreadable: boolean };
type Group = { id: string; title: string; help: string; fields: Field[] };
type View = { canEdit: boolean; isOwner: boolean; encryptionReady: boolean; status: Record<string, boolean>; groups: Group[] };
const LIVE: Record<string, string> = { paymongo: "paymongo", stripe: "stripe", revenuecat: "revenuecat", email: "email", google: "googleAuth", apple: "appleAuth", push: "push", analytics: "analytics", ads: "ads" };

function Source({ f }: { f: Field }) {
  if (f.unreadable) return <span className="chip bg-rose-50 text-rose-700">Can’t decrypt — re-enter</span>;
  if (f.source === "admin") return <span className="chip bg-mint text-emerald-800">● Saved here{f.updatedAt ? ` · ${new Date(f.updatedAt).toLocaleDateString()}` : ""}</span>;
  if (f.source === "env") return <span className="chip bg-walkie-pale text-walkie-blue">● From server file</span>;
  return <span className="chip bg-walkie-light text-walkie-muted">○ Not set</span>;
}

export function IntegrationsEditor() {
  const toast = useToast();
  const [v, setV] = useState<View | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string | null>>({});
  const [confirm, setConfirm] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => api<View>("/api/admin/integrations").then(setV).catch((e) => toast("error", e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pending = useMemo(() => Object.keys(draft).length, [draft]);

  async function save() {
    setBusy(true);
    try {
      const r = await api<View>("/api/admin/integrations", { method: "PUT", body: { changes: draft, confirmPassword: pw || undefined } });
      setV(r); setDraft({}); setConfirm(false); setPw(""); toast("success", "Integration keys saved — live within a few seconds");
    } catch (e: any) { toast("error", e.message); } finally { setBusy(false); }
  }

  if (!v) return <div className="card p-5"><p className="font-display font-semibold">Integrations</p><p className="mt-2 text-sm text-walkie-muted">Loading…</p></div>;
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-lg font-semibold">Integrations & API keys</p>
          <p className="text-[12px] text-walkie-muted">Keys saved here are encrypted (AES-256-GCM) and override the server file. Saved secrets can be replaced or cleared, never viewed.</p>
        </div>
        <Link href="/admin/maps" className="chip bg-walkie-pale text-walkie-blue">Maps provider order →</Link>
      </div>
      {!v.encryptionReady && <p className="mt-3 rounded-2xl bg-butter/60 px-3 py-2 text-[13px] font-semibold text-amber-900">Editing is off until <code>CONFIG_ENCRYPTION_KEY</code> is set on the server (keys are only ever stored encrypted).</p>}
      {v.encryptionReady && !v.isOwner && <p className="mt-3 rounded-2xl bg-walkie-light px-3 py-2 text-[13px] font-semibold text-walkie-slate">Only the owner can change integration keys. You can see what’s connected.</p>}

      <div className="mt-4 grid gap-2">
        {v.groups.map((g) => {
          const live = g.id === "maps" ? v.status.googleMaps || v.status.appleMaps : !!v.status[LIVE[g.id]];
          const dirty = g.fields.some((f) => f.key in draft);
          return (
            <div key={g.id} className="rounded-3xl border border-walkie-gray/70">
              <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(open === g.id ? null : g.id)} aria-expanded={open === g.id}>
                <span className={`h-2.5 w-2.5 rounded-full ${live ? "bg-emerald-500" : "bg-walkie-gray"}`} aria-hidden />
                <span className="flex-1 font-bold">{g.title}</span>
                {dirty && <span className="chip bg-butter text-amber-900">edited</span>}
                <span className="text-[12px] font-bold text-walkie-muted">{live ? "Connected" : "Not connected"}</span>
                <span className={`transition ${open === g.id ? "rotate-90" : ""}`} aria-hidden>›</span>
              </button>
              {open === g.id && (
                <div className="grid gap-3 border-t border-walkie-gray/60 px-4 pb-4 pt-3">
                  <p className="text-[12px] text-walkie-muted">{g.help}</p>
                  {g.fields.map((f) => {
                    const val = draft[f.key];
                    const editing = f.key in draft && val !== null;
                    const disabled = !v.canEdit;
                    return (
                      <div key={f.key}>
                        <div className="mb-1 flex flex-wrap items-center gap-2"><span className="label mb-0">{f.label}</span><code className="text-[10.5px] text-walkie-muted">{f.key}</code><Source f={f} />{val === null && <span className="chip bg-rose-50 text-rose-700">will be cleared</span>}</div>
                        {f.secret && !editing ? (
                          <div className="flex flex-wrap gap-2">
                            <div className="input flex flex-1 items-center text-walkie-muted">{f.source ? "•••••••••••••• (hidden)" : "—"}</div>
                            <button className="btn-soft min-h-[44px] px-4" disabled={disabled} onClick={() => setDraft({ ...draft, [f.key]: "" })}>{f.source ? "Replace" : "Add"}</button>
                            {f.source === "admin" && val !== null && <button className="btn-ghost min-h-[44px] px-3 text-rose-600" disabled={disabled} onClick={() => setDraft({ ...draft, [f.key]: null })}>Clear</button>}
                            {f.key in draft && <button className="btn-ghost min-h-[44px] px-3" onClick={() => { const d = { ...draft }; delete d[f.key]; setDraft(d); }}>Undo</button>}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {f.multiline
                              ? <textarea className="input min-h-[110px] flex-1 font-mono text-[12px]" autoComplete="off" spellCheck={false} disabled={disabled} placeholder={f.placeholder} value={val ?? (f.secret ? "" : f.value ?? "")} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                              : <input className="input flex-1 font-mono text-[13px]" type={f.secret ? "password" : "text"} autoComplete="new-password" spellCheck={false} disabled={disabled} placeholder={f.placeholder} value={val ?? (f.secret ? "" : f.value ?? "")} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />}
                            {!f.secret && f.source === "admin" && <button className="btn-ghost min-h-[44px] px-3 text-rose-600" disabled={disabled} onClick={() => setDraft({ ...draft, [f.key]: null })}>Clear</button>}
                            {f.key in draft && <button className="btn-ghost min-h-[44px] px-3" onClick={() => { const d = { ...draft }; delete d[f.key]; setDraft(d); }}>Undo</button>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {v.canEdit && (
        <div className="mt-4 flex items-center gap-3">
          <button className="btn-primary" disabled={!pending} onClick={() => setConfirm(true)}>Save {pending ? `${pending} change${pending > 1 ? "s" : ""}` : "changes"}</button>
          {pending > 0 && <button className="btn-ghost" onClick={() => setDraft({})}>Discard</button>}
          <p className="text-[12px] text-walkie-muted">“Clear” removes the key saved here and falls back to the server file.</p>
        </div>
      )}
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Confirm it’s you">
        <p className="text-sm text-walkie-muted">Changing payment, sign-in or email keys affects every user. Enter your password to save {pending} change{pending > 1 ? "s" : ""}.</p>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="mt-3 grid gap-2">
          <input className="input" type="password" autoComplete="current-password" placeholder="Your password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
          <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save keys"}</button>
          <button type="button" className="btn-soft" onClick={() => setConfirm(false)}>Cancel</button>
        </form>
      </Sheet>
    </div>
  );
}
