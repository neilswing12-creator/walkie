"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, uid } from "@/lib/client/api";
import { FURS, LOOKS, SLOT_LABEL, WARDROBE_BY_KEY, WARDROBE_TABS, type Slot } from "@/lib/wardrobe";
import { LivingWalkie, type Reaction } from "../mascot/LivingWalkie";
import { Walkie } from "../mascot/Walkie";
import { Icon, Coin } from "../ui/Icon";
import { AppIcon } from "../ui/AppIcon";
import { Sheet } from "../ui/Sheet";
import { Loading, ErrorState } from "../ui/States";
import { useToast } from "../ui/Toast";
import { ItemIcon } from "./ItemIcon";
import { useWalkieAppearance } from "../mascot/MyWalkie";

type Item = { id: string; key: string; name: string; description: string; slot: Slot; rarity: string; color: string | null; priceCoins: number; premium: boolean; owned: boolean; rewardOnly: boolean; available: boolean };
type Data = { petId: string; nickname: string; coins: number; plus: boolean; look: string; fur: string; equipped: Partial<Record<Slot, string>>; items: Item[]; savedLooks: { id: string; name: string; items: Record<string, string> }[] };
const RARITY_TINT: Record<string, string> = { COMMON: "from-[#F7F8FA] to-[#ECEFF4]", UNCOMMON: "from-[#EFFAF4] to-[#DDF2E6]", RARE: "from-[#EEF4FE] to-[#DCE8FB]", EPIC: "from-[#F4EFFE] to-[#E5DBFB]", LEGENDARY: "from-[#FFF7E3] to-[#FBE8B8]", MYTHICAL: "from-[#FDEFF7] to-[#E9E3FF]" };
const RARITY_DOT: Record<string, string> = { COMMON: "#AAB4C3", UNCOMMON: "#5DBE9A", RARE: "#6B8FD6", EPIC: "#9A7BE6", LEGENDARY: "#E2B64A", MYTHICAL: "#E98BB5" };
const LEFT: Slot[] = ["HEAD", "FACE", "NECK"], RIGHT: Slot[] = ["BODY", "BACK", "FEET"];
const SLOT_TAB: Record<Slot, string> = { HEAD: "HATS", FACE: "GLASSES", NECK: "NECK", BODY: "TOPS", BACK: "BACK", FEET: "SHOES" };

export function WardrobeClient() {
  const toast = useToast();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("HATS");
  const [preview, setPreview] = useState<Item | null>(null);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [gaze, setGaze] = useState<{ x: number; y: number } | null>(null);
  const [sheet, setSheet] = useState<null | "looks" | "save">(null);
  const [lookName, setLookName] = useState("");
  const [busy, setBusy] = useState(false);
  const slotRefs = useRef<Partial<Record<Slot, HTMLButtonElement | null>>>({});
  const n = useRef(0);
  const react = (kind: Reaction["kind"]) => setReaction({ kind, id: ++n.current });

  const { set: setAppearance } = useWalkieAppearance();
  const load = useCallback(() => api<Data>("/api/wardrobe").then(setD).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const e = { ...(d?.equipped ?? {}) };
    if (preview) e[preview.slot] = preview.key;
    return e;
  }, [d?.equipped, preview]);
  const accessories = useMemo(() => Object.values(shown).filter(Boolean).map((k) => ({ key: k as string, color: d?.items.find((i) => i.key === k)?.color ?? WARDROBE_BY_KEY[k as string]?.color })), [shown, d?.items]);
  useEffect(() => { // keep every other screen's Walkie in sync with what's actually saved
    if (!d) return;
    setAppearance({ look: d.look, fur: d.fur, accessories: Object.values(d.equipped).filter(Boolean).map((k) => ({ key: k as string, color: d.items.find((i) => i.key === k)?.color ?? null })) });
  }, [d?.equipped, d?.look, d?.fur]); // eslint-disable-line react-hooks/exhaustive-deps
  const byKey = useMemo(() => new Map((d?.items ?? []).map((i) => [i.key, i])), [d?.items]);

  if (err) return <ErrorState message={err} retry={load} />;
  if (!d) return <Loading label="Opening the wardrobe…" />;

  const lookAt = (slot: Slot) => { const el = slotRefs.current[slot]; if (el) { const r = el.getBoundingClientRect(); setGaze({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); } };
  const save = async (set: Partial<Record<Slot, string | null>>, prev: Data["equipped"]) => {
    try { const r = await api<{ equipped: Data["equipped"] }>("/api/wardrobe/outfit", { body: { set } }); setD((x) => x && { ...x, equipped: r.equipped }); }
    catch (e: any) { setD((x) => x && { ...x, equipped: prev }); toast("error", e.message); }
  };
  const tapItem = (it: Item) => {
    lookAt(it.slot);
    if (!it.owned) { setPreview(preview?.key === it.key ? null : it); react(preview?.key === it.key ? "unequip" : "equip"); return; }
    setPreview(null);
    const wearing = d.equipped[it.slot] === it.key;
    const prev = d.equipped;
    setD({ ...d, equipped: { ...d.equipped, [it.slot]: wearing ? undefined : it.key } });
    react(wearing ? "unequip" : ["EPIC", "LEGENDARY", "MYTHICAL"].includes(it.rarity) ? "rare" : "equip");
    save({ [it.slot]: wearing ? null : it.key }, prev);
  };
  const buy = async (it: Item) => {
    setBusy(true);
    try {
      const r = await api<{ coins: number }>("/api/shop/buy", { body: { itemId: it.id, requestId: uid() } });
      const prev = d.equipped;
      setD({ ...d, coins: r.coins, items: d.items.map((x) => (x.id === it.id ? { ...x, owned: true } : x)), equipped: { ...d.equipped, [it.slot]: it.key } });
      setPreview(null);
      react(["RARE", "EPIC", "LEGENDARY", "MYTHICAL"].includes(it.rarity) ? "rare" : "reward");
      toast("success", `${it.name} is yours!`);
      await save({ [it.slot]: it.key }, prev);
    } catch (e: any) { toast("error", e.message); } finally { setBusy(false); }
  };
  const appearance = async (body: { look?: string; fur?: string; reset?: boolean }) => {
    try { const r = await api<{ look: string; fur: string; equipped?: Data["equipped"] }>("/api/wardrobe/appearance", { method: "PATCH", body }); setD((x) => x && { ...x, look: r.look, fur: r.fur, ...(r.equipped ? { equipped: r.equipped } : {}) }); setPreview(null); react(body.reset ? "equip" : "look"); }
    catch (e: any) { toast("error", e.message); }
  };
  const tabDef = WARDROBE_TABS.find((t) => t.key === tab);
  const list = tabDef ? d.items.filter((i) => WARDROBE_BY_KEY[i.key] && tabDef.test(WARDROBE_BY_KEY[i.key])) : [];
  const ownedCount = list.filter((i) => i.owned).length;
  const wornHere = tabDef && list.find((i) => shown[i.slot] === i.key);

  const SlotTile = ({ slot }: { slot: Slot }) => {
    const k = shown[slot]; const it = k ? byKey.get(k) : undefined; const active = SLOT_TAB[slot] === tab;
    return (
      <button ref={(el) => { slotRefs.current[slot] = el; }} onClick={() => { setTab(SLOT_TAB[slot]); lookAt(slot); }}
        className={`relative grid h-[58px] w-[58px] place-items-center rounded-[18px] border-2 bg-white/85 shadow-[0_6px_16px_-8px_rgba(37,52,80,.45)] backdrop-blur transition active:scale-95 ${active ? "border-walkie-blue" : "border-white"}`} aria-label={`${SLOT_LABEL[slot]}: ${it?.name ?? "nothing"}`}>
        {k ? <ItemIcon itemKey={k} color={it?.color} slot={slot} size={44} /> : <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-dashed border-walkie-gray text-walkie-muted/70"><Icon name="plus" size={14} strokeWidth={2.6} /></span>}
        <span className="absolute -bottom-4 text-[10px] font-bold text-walkie-slate/80">{SLOT_LABEL[slot]}</span>
        {preview?.slot === slot && <span className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-1.5 text-[9px] font-extrabold text-white">TRY</span>}
      </button>
    );
  };

  return (
    <div className="flex min-h-dvh flex-col bg-walkie-light">
      {/* stage */}
      <section className="relative overflow-hidden pb-6 pt-[calc(10px+var(--safe-top))]" style={{ background: "radial-gradient(120% 70% at 50% 38%, #FFFFFF 0%, #EAF2FC 48%, #CFDDF3 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[44%] h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#BFD0EC]/70 to-transparent" />
          {[[12, 22], [86, 18], [20, 64], [80, 58], [50, 10]].map(([x, y], i) => <span key={i} className="wk-twinkle absolute h-2 w-2 rotate-45 rounded-[2px] bg-white" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.45}s` }} />)}
        </div>
        <header className="relative flex items-center gap-2 px-4">
          <Link href="/app" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card" aria-label="Back"><Icon name="back" size={20} /></Link>
          <div className="flex-1"><h1 className="font-display text-[22px] font-semibold leading-none">Wardrobe</h1><p className="text-[12px] font-semibold text-walkie-muted">Tap to try on · hold {d.nickname} to pet</p></div>
          <button onClick={() => setSheet("looks")} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[13px] font-bold shadow-card"><AppIcon name="wardrobe" size={20} /> Looks</button>
          <span className="flex items-center gap-1 rounded-full bg-white px-3 py-2 text-[13px] font-extrabold shadow-card"><Coin size={16} />{d.coins.toLocaleString()}</span>
        </header>
        <div className="relative mt-3 flex items-start justify-between px-4">
          <div className="flex flex-col gap-6 pt-2">{LEFT.map((s) => <SlotTile key={s} slot={s} />)}</div>
          <div className="-mx-6 flex flex-col items-center">
            <LivingWalkie size={236} accessories={accessories} look={d.look} fur={d.fur} reaction={reaction} gazeTarget={gaze} title={d.nickname} />
          </div>
          <div className="flex flex-col gap-6 pt-2">{RIGHT.map((s) => <SlotTile key={s} slot={s} />)}</div>
        </div>
        <div className="relative mt-3 flex justify-center gap-2 px-4">
          {[["rotate", "Twirl", () => react("twirl")], ["undo", "Reset", () => appearance({ reset: true })], ["heart", "Save", () => { setLookName(""); setSheet("save"); }], ["user", "Style", () => setTab("ME")]].map(([ic, l, f]) => (
            <button key={l as string} onClick={f as () => void} className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/90 px-3.5 py-2 text-[12px] font-bold text-walkie-slate shadow-card backdrop-blur active:scale-95"><Icon name={ic as string} size={15} />{l as string}</button>
          ))}
        </div>
      </section>

      {/* preview banner */}
      {preview && (
        <div className="sticky top-0 z-10 mx-3 -mt-4 flex items-center gap-3 rounded-2xl bg-walkie-ink px-3 py-2.5 text-white shadow-lift animate-fade-up">
          <ItemIcon itemKey={preview.key} color={preview.color} slot={preview.slot} size={36} />
          <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold">Trying on {preview.name}</p><p className="text-[11px] text-white/70">{preview.rewardOnly ? "Earned through badges & events" : preview.premium && !d.plus ? "Walkie Plus item" : !preview.available ? "Not available right now" : `${preview.priceCoins.toLocaleString()} coins`}</p></div>
          {preview.rewardOnly ? <Link href="/app/badges" className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-bold">Badges</Link>
            : preview.premium && !d.plus ? <Link href="/app/plus" className="rounded-full bg-amber-400 px-3 py-1.5 text-[12px] font-extrabold text-walkie-ink">Get Plus</Link>
            : preview.available && <button disabled={busy || d.coins < preview.priceCoins} onClick={() => buy(preview)} className="rounded-full bg-walkie-blue px-3 py-1.5 text-[12px] font-extrabold disabled:opacity-50">{d.coins < preview.priceCoins ? "Need more coins" : "Buy & wear"}</button>}
          <button onClick={() => { setPreview(null); react("unequip"); }} className="grid h-8 w-8 place-items-center rounded-full bg-white/10" aria-label="Stop previewing"><Icon name="close" size={16} /></button>
        </div>
      )}

      {/* tabs */}
      <nav className="no-scrollbar sticky top-0 z-[5] flex gap-1 overflow-x-auto border-b border-walkie-gray/70 bg-walkie-light/95 px-3 pt-3 backdrop-blur" aria-label="Wardrobe categories">
        {[{ key: "ME", label: "My Walkie" }, ...WARDROBE_TABS].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} aria-pressed={tab === t.key} className={`shrink-0 whitespace-nowrap border-b-[3px] px-3 pb-2 text-[13px] font-bold transition ${tab === t.key ? "border-walkie-blue text-walkie-ink" : "border-transparent text-walkie-muted"}`}>{t.label}</button>
        ))}
      </nav>

      <main className="flex-1 px-3 pb-10 pt-3">
        {tab === "ME" ? (
          <div className="space-y-4">
            <section>
              <h2 className="px-1 font-display text-[17px] font-semibold">Style</h2>
              <p className="px-1 text-[12px] text-walkie-muted">Just a look — any Walkie can wear anything, and you can switch anytime.</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(Object.keys(LOOKS) as (keyof typeof LOOKS)[]).map((k) => (
                  <button key={k} onClick={() => appearance({ look: k })} className={`card flex flex-col items-center p-2 pb-3 transition active:scale-[.98] ${d.look === k ? "ring-2 ring-walkie-blue" : ""}`}>
                    <Walkie size={92} look={k} fur={d.fur} accessories={LOOKS[k].preset.map((p) => ({ key: p, color: WARDROBE_BY_KEY[p].color }))} mood="sit" />
                    <span className="text-[13px] font-bold">{LOOKS[k].label}</span><span className="text-center text-[10px] leading-tight text-walkie-muted">{LOOKS[k].sub}</span>
                  </button>
                ))}
              </div>
              <button className="btn-soft mt-2 w-full" onClick={() => appearance({ reset: true })}>Wear the {LOOKS[d.look as keyof typeof LOOKS]?.label ?? "Classic"} starter outfit</button>
            </section>
            <section>
              <h2 className="px-1 font-display text-[17px] font-semibold">Fur</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(FURS) as (keyof typeof FURS)[]).map((k) => (
                  <button key={k} onClick={() => appearance({ fur: k })} className={`flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-3 text-[13px] font-bold shadow-card ${d.fur === k ? "ring-2 ring-walkie-blue" : ""}`}>
                    <span className="h-7 w-7 rounded-full border-2 border-white shadow" style={{ background: `linear-gradient(135deg, ${FURS[k].light}, ${FURS[k].fur} 55%, ${FURS[k].dark})` }} />{FURS[k].label}
                  </button>
                ))}
              </div>
              <p className="mt-2 px-1 text-[11px] text-walkie-muted">Walkie keeps those signature blue eyes in every coat.</p>
            </section>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-1"><p className="font-display text-[16px] font-semibold">{tabDef?.label}</p><p className="flex-1 truncate text-[12px] text-walkie-muted">{wornHere ? `· ${wornHere.name}` : ""}</p><p className="text-[12px] font-bold text-walkie-muted">{ownedCount} yours</p><Link href="/app/shop" className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] font-bold shadow-card"><AppIcon name="shop" size={16} />Shop</Link></div>
            {list.length === 0 ? <p className="card mt-3 p-6 text-center text-[13px] text-walkie-muted">Nothing here yet — new outfits arrive with events.</p> : (
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {list.map((it) => {
                  const wearing = d.equipped[it.slot] === it.key; const trying = preview?.key === it.key;
                  return (
                    <li key={it.id}>
                      <button onClick={() => tapItem(it)} aria-pressed={wearing}
                        className={`relative flex w-full flex-col items-center rounded-[20px] border-2 bg-white p-1.5 pb-2 text-center shadow-[0_6px_14px_-10px_rgba(37,52,80,.5)] transition active:scale-[.97] ${wearing ? "border-[#5DBE9A]" : trying ? "border-amber-400" : "border-transparent"}`}>
                        <span className={`grid aspect-square w-full place-items-center rounded-[15px] bg-gradient-to-b ${RARITY_TINT[it.rarity] ?? RARITY_TINT.COMMON}`}>
                          <ItemIcon itemKey={it.key} color={it.color} slot={it.slot} size={64} className={it.owned ? "" : "opacity-90"} />
                        </span>
                        <span className="mt-1 line-clamp-1 text-[12px] font-bold">{it.name}</span>
                        <span className={`text-[11px] font-bold ${wearing ? "text-emerald-700" : "text-walkie-muted"}`}>
                          {wearing ? "Wearing" : it.owned ? "Owned" : it.rewardOnly ? "Badge reward" : it.premium && !d.plus ? "Plus" : <span className="inline-flex items-center gap-0.5"><Coin size={11} />{it.priceCoins}</span>}
                        </span>
                        <span className="absolute left-2.5 top-2.5 h-2 w-2 rounded-full" style={{ background: RARITY_DOT[it.rarity] }} title={it.rarity.toLowerCase()} />
                        {wearing && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-[#5DBE9A] text-white shadow"><Icon name="check" size={12} strokeWidth={3.4} /></span>}
                        {!it.owned && !wearing && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-white/90 text-walkie-muted shadow"><Icon name="lock" size={11} strokeWidth={2.6} /></span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-center text-[11px] text-walkie-muted">Locked items can be tried on for free. Your outfit saves automatically.</p>
          </>
        )}
      </main>

      <Sheet open={sheet === "looks"} onClose={() => setSheet(null)} title="Saved looks">
        {d.savedLooks.length === 0 ? <p className="text-[14px] text-walkie-muted">Dress {d.nickname} up and tap <b>Save look</b> to keep favourite outfits here.</p> : (
          <ul className="grid grid-cols-2 gap-2">{d.savedLooks.map((l) => (
            <li key={l.id} className="card flex flex-col items-center p-2">
              <Walkie size={96} look={d.look} fur={d.fur} mood="sit" accessories={Object.values(l.items).map((k) => ({ key: k, color: byKey.get(k)?.color ?? WARDROBE_BY_KEY[k]?.color }))} />
              <p className="text-[13px] font-bold">{l.name}</p>
              <div className="mt-1.5 flex gap-1.5">
                <button className="btn-primary !min-h-0 !px-3 !py-1.5 text-[12px]" onClick={async () => { try { const r = await api<{ equipped: Data["equipped"]; skipped: number }>(`/api/wardrobe/looks/${l.id}`, { method: "POST" }); setD({ ...d, equipped: r.equipped }); setPreview(null); setSheet(null); react("equip"); if (r.skipped) toast("info", `${r.skipped} item(s) aren't in your wardrobe anymore`); } catch (e: any) { toast("error", e.message); } }}>Wear</button>
                <button className="btn-ghost !min-h-0 !px-2.5 !py-1.5" aria-label={`Delete ${l.name}`} onClick={async () => { await api(`/api/wardrobe/looks/${l.id}`, { method: "DELETE" }).catch(() => {}); setD({ ...d, savedLooks: d.savedLooks.filter((x) => x.id !== l.id) }); }}><Icon name="trash" size={15} /></button>
              </div>
            </li>))}</ul>
        )}
      </Sheet>
      <Sheet open={sheet === "save"} onClose={() => setSheet(null)} title="Save this look" footer={<button className="btn-primary w-full" disabled={!lookName.trim()} onClick={async () => { try { const r = await api<{ id: string; name: string; items: Record<string, string> }>("/api/wardrobe/looks", { body: { name: lookName.trim() } }); setD({ ...d, savedLooks: [r, ...d.savedLooks] }); setSheet(null); toast("success", "Look saved!"); react("reward"); } catch (e: any) { toast("error", e.message); } }}>Save</button>}>
        {preview && <p className="mb-2 rounded-xl bg-butter/60 px-3 py-2 text-[12px] font-semibold text-amber-900">Items you're only trying on aren't saved.</p>}
        <input className="input" maxLength={30} value={lookName} onChange={(e) => setLookName(e.target.value)} placeholder="e.g. Rainy day walk" autoFocus />
      </Sheet>
    </div>
  );
}
