"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { isNative } from "@/lib/native/platform";
import { Icon } from "../ui/Icon";
import { PetArt } from "../mascot/PetArt";
import { Loading } from "../ui/States";
import { useToast } from "../ui/Toast";

type Plans = { plans: { key: string; name: string; description: string; priceCents: number; currency: string; interval: string; trialDays: number; features: string[]; purchasable: boolean; paymongoAmount: number | null }[]; subscription: { status: string; provider: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; active: boolean } | null; providers: { stripe: boolean; revenuecat: boolean; paymongo: boolean }; entitlement: { plus: boolean; source: string | null; trialEndsAt: string | null } };

function Inner() {
  const toast = useToast();
  const sp = useSearchParams();
  const [d, setD] = useState<Plans | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<Plans>("/api/plans").then(setD).catch((e) => toast("error", e.message)); }, [toast]);
  useEffect(() => { if (sp.get("status") === "success") toast("success", "Thanks! Your membership activates as soon as payment is confirmed."); }, [sp, toast]);
  if (!d) return <Loading />;
  const sub = d.subscription;
  const price = (c: number, cur: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur.toUpperCase() }).format(c / 100);
  return (
    <>
      <section className="card mt-4 overflow-hidden text-center">
        <div className="bg-gradient-to-b from-lavender/80 to-white px-6 pt-6"><div className="flex justify-center -space-x-8"><PetArt species="raccoon" size={120} mood="happy" /><PetArt species="husky" size={140} mood="celebrate" accessories={[{ key: "acc_crown", color: "#E2B64A" }]} /></div></div>
        <div className="p-6 pt-2">
          <h1 className="font-display text-[28px] font-semibold">Walkie Plus</h1>
          <p className="text-[14px] text-walkie-muted">Extra cozy extras. Walking & running tracking is always free.</p>
          {!sub?.active && d.entitlement.source === "trial" && d.entitlement.trialEndsAt && <p className="mt-3 rounded-2xl bg-mint/70 px-4 py-2 text-[13px] font-bold text-emerald-800">VIP trial active · until {new Date(d.entitlement.trialEndsAt).toLocaleDateString(undefined, { dateStyle: "medium" })} · <Link href="/app/invite" className="underline">earn more days</Link></p>}
          {sub?.active && <p className="mt-3 rounded-2xl bg-mint/70 px-4 py-2 text-[13px] font-bold text-emerald-800">You're a Plus member{sub.currentPeriodEnd ? ` · ${sub.cancelAtPeriodEnd || sub.provider === "PAYMONGO" ? "active until" : "renews"} ${new Date(sub.currentPeriodEnd).toLocaleDateString()}` : ""}{sub.status === "PAST_DUE" ? " · payment issue — please update your billing" : ""}</p>}
        </div>
      </section>
      <ul className="card mt-3 space-y-2.5 p-5">{(d.plans[0]?.features ?? []).map((f) => <li key={f} className="flex items-center gap-2.5 text-[14px] font-semibold"><span className="grid h-6 w-6 place-items-center rounded-full bg-walkie-pale text-walkie-blue"><Icon name="check" size={14} strokeWidth={3} /></span>{f}</li>)}</ul>
      {!sub?.active && (
        <div className="mt-3 grid gap-2.5">
          {d.plans.map((p) => (
            <button key={p.key} disabled={busy || !p.purchasable || isNative()} onClick={async () => { setBusy(true); try { const r = await api<{ url: string }>("/api/billing/checkout", { body: { planKey: p.key } }); location.href = r.url; } catch (e: any) { toast("error", e.message); setBusy(false); } }} className="card flex items-center gap-3 p-4 text-left transition enabled:active:scale-[.99] disabled:opacity-70">
              <div className="flex-1"><p className="font-display text-lg font-semibold">{p.name}</p><p className="text-[12px] text-walkie-muted">{p.description}{p.trialDays ? ` · ${p.trialDays}-day free trial` : ""}</p></div>
              <p className="font-display text-lg font-semibold">{price(p.priceCents, p.currency)}<span className="text-[12px] text-walkie-muted">/{p.interval === "year" ? "yr" : "mo"}</span></p>
            </button>
          ))}
          {!isNative() && d.providers.paymongo && d.plans.some((p) => p.paymongoAmount) && (
            <div className="card p-4">
              <p className="font-display text-[16px] font-semibold">Pay with GCash, Maya or card</p>
              <p className="text-[12px] text-walkie-muted">Prepaid Plus pass via PayMongo — no auto-renew. Passes stack if you already have Plus.</p>
              <div className="mt-2 grid gap-2">{d.plans.filter((p) => p.paymongoAmount).map((p) => (
                <button key={p.key} disabled={busy} onClick={async () => { setBusy(true); try { const r = await api<{ url: string }>("/api/billing/paymongo", { body: { planKey: p.key } }); location.href = r.url; } catch (e: any) { toast("error", e.message); setBusy(false); } }} className="btn-soft flex w-full items-center justify-between">
                  <span>{p.interval === "year" ? "365-day pass" : "30-day pass"}</span><span className="font-display">₱{(p.paymongoAmount! / 100).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                </button>))}</div>
            </div>
          )}
          {isNative() ? <p className="text-center text-[12px] text-walkie-muted">In-app purchase via the App Store / Google Play is enabled once RevenueCat is configured in the native build.</p>
            : !d.providers.stripe && !d.providers.paymongo && <p className="rounded-2xl bg-butter/60 px-4 py-3 text-center text-[13px] font-semibold text-amber-900">Subscriptions aren't open yet — payments haven't been configured. Nothing will be charged.</p>}
        </div>
      )}
      <div className="mt-4 grid gap-2">
        {sub?.provider === "STRIPE" && <button className="btn-soft" onClick={async () => { try { const r = await api<{ url: string }>("/api/billing/portal", { method: "POST" }); location.href = r.url; } catch (e: any) { toast("error", e.message); } }}>Manage billing</button>}
        <button className="btn-ghost" onClick={async () => { try { const r = await api<{ plus: boolean }>("/api/billing/restore", { method: "POST" }); toast(r.plus ? "success" : "info", r.plus ? "Purchases restored!" : "No active purchases found"); } catch (e: any) { toast("error", e.message); } }}>Restore purchases</button>
      </div>
      <p className="mt-3 text-center text-[11px] text-walkie-muted">Cancel anytime. Membership status is confirmed with the payment provider. See <Link href="/terms" className="underline">Terms</Link>.</p>
    </>
  );
}

export function PlusClient() {
  return (
    <div className="px-4 pt-[calc(14px+var(--safe-top))]">
      <Link href="/app/profile" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card" aria-label="Back"><Icon name="back" size={20} /></Link>
      <Suspense fallback={<Loading />}><Inner /></Suspense>
    </div>
  );
}
