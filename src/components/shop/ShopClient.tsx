"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ShopState, Catalog } from "@/lib/queries/shop";
import { validatePlacement } from "@/lib/game/shop-rules";
import { PLACEABLE_CATEGORIES, type ItemCategory } from "@/lib/constants";
import { api, uid } from "@/lib/client/api";
import { num } from "@/lib/format";
import { ShopCanvas, type ShopCanvasHandle } from "./ShopCanvas";
import { Icon, Coin } from "../ui/Icon";
import { Sheet } from "../ui/Sheet";
import { RarityBadge } from "../ui/Rarity";
import { PetArt } from "../mascot/PetArt";
import { useToast } from "../ui/Toast";
import { useCelebrate } from "../ui/Celebrate";

type Placing = { itemId: string; model: string; color: string; w: number; d: number; rotation: number; x: number; z: number; name: string; buy?: { price: number } } | null;
type Moving = { id: string; model: string; color: string; w: number; d: number; rotation: number; x: number; z: number; from: { x: number; z: number; rotation: number } } | null;
type Undo = { kind: "place"; id: string } | { kind: "move"; id: string; x: number; z: number; rotation: number } | { kind: "remove"; itemId: string; x: number; z: number; rotation: number };

const MARKET_TABS: { key: string; label: string; cats: ItemCategory[] }[] = [
  { key: "decor", label: "Decor", cats: ["DECORATION", "FURNITURE"] },
  { key: "buildings", label: "Buildings", cats: ["BUILDING"] },
  { key: "pets", label: "Pet care", cats: ["FOOD", "TOY", "ACCESSORY", "BOOST"] },
  { key: "surfaces", label: "Floors & more", cats: ["FLOOR", "WALL", "ENVIRONMENT"] },
];

export function ShopClient({ initial, catalog: initialCatalog, readOnly, ownerName, expansionCosts, openMarket }: { initial: ShopState; catalog?: Catalog; readOnly?: boolean; ownerName?: string; expansionCosts?: number[]; openMarket?: boolean }) {
  const toast = useToast();
  const celebrate = useCelebrate();
  const view = useRef<ShopCanvasHandle>(null);
  const [state, setState] = useState(initial);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [build, setBuild] = useState(false);
  const [placing, setPlacing] = useState<Placing>(null);
  const [moving, setMoving] = useState<Moving>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [undo, setUndo] = useState<Undo[]>([]);
  const [busy, setBusy] = useState(false);
  const [market, setMarket] = useState(!!openMarket);
  const [mTab, setMTab] = useState("decor");
  const [surfaces, setSurfaces] = useState(false);
  const [night, setNight] = useState(false);
  const [petTap, setPetTap] = useState(false);

  useEffect(() => { const h = new Date().getHours(); setNight(h >= 19 || h < 6); }, []);
  useEffect(() => { if (!readOnly) api("/api/shop/visit", { method: "POST" }).catch(() => {}); }, [readOnly]);

  const reload = useCallback(async () => {
    const [s, c] = await Promise.all([api<ShopState>("/api/shop/layout"), api<Catalog>("/api/shop/catalog")]);
    setState(s); setCatalog(c);
  }, []);

  const others = useMemo(() => state.placements.map((p) => ({ id: p.id, x: p.x, z: p.z, rotation: p.rotation, w: p.w, d: p.d })), [state.placements]);
  const active = placing ?? moving;
  const valid = active ? validatePlacement({ id: moving?.id, x: active.x, z: active.z, rotation: active.rotation, w: active.w, d: active.d }, others, state.layout.expansion).ok : false;
  const ghost = active ? { model: active.model, color: active.color, w: active.w, d: active.d, x: active.x, z: active.z, rotation: active.rotation, valid } : null;
  const visiblePlacements = useMemo(() => state.placements.filter((p) => p.id !== moving?.id), [state.placements, moving?.id]);

  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e: any) { toast("error", e.message); } finally { setBusy(false); } };
  const center = () => { const s = state.layout.size; return { x: Math.floor(s / 2) - 1, z: Math.floor(s / 2) - 1 }; };

  function startPlacing(it: { itemId: string; model: string | null; color: string | null; w: number; d: number; name: string }, buy?: { price: number }) {
    setSelected(null); setMoving(null); setMarket(false); setBuild(true);
    setPlacing({ itemId: it.itemId, model: it.model ?? "bush", color: it.color ?? "#9ccf9c", w: it.w, d: it.d, rotation: 0, name: it.name, buy, ...center() });
  }
  async function confirm() {
    if (!active || !valid) return;
    await run(async () => {
      if (placing) {
        if (placing.buy) await api("/api/shop/buy", { body: { itemId: placing.itemId, quantity: 1, requestId: uid() } });
        const r = await api<{ id: string }>("/api/shop/place", { body: { itemId: placing.itemId, x: placing.x, z: placing.z, rotation: placing.rotation } });
        setUndo((u) => [...u.slice(-19), { kind: "place", id: r.id }]);
        toast("success", `${placing.name} placed`);
        setPlacing(null);
      } else if (moving) {
        await api(`/api/shop/place/${moving.id}`, { method: "PATCH", body: { x: moving.x, z: moving.z, rotation: moving.rotation } });
        setUndo((u) => [...u.slice(-19), { kind: "move", id: moving.id, ...moving.from }]);
        setMoving(null);
      }
      await reload();
    });
  }
  async function storeSelected() {
    const p = state.placements.find((x) => x.id === selected); if (!p) return;
    await run(async () => { await api(`/api/shop/place/${p.id}`, { method: "DELETE" }); setUndo((u) => [...u.slice(-19), { kind: "remove", itemId: p.itemId, x: p.x, z: p.z, rotation: p.rotation }]); setSelected(null); await reload(); });
  }
  async function rotateSelected() {
    const p = state.placements.find((x) => x.id === selected); if (!p) return;
    const rot = (p.rotation + 1) % 4;
    const v = validatePlacement({ id: p.id, x: p.x, z: p.z, rotation: rot, w: p.w, d: p.d }, others, state.layout.expansion);
    if (!v.ok) return toast("error", v.reason);
    await run(async () => { await api(`/api/shop/place/${p.id}`, { method: "PATCH", body: { x: p.x, z: p.z, rotation: rot } }); setUndo((u) => [...u.slice(-19), { kind: "move", id: p.id, x: p.x, z: p.z, rotation: p.rotation }]); await reload(); });
  }
  async function doUndo() {
    const last = undo[undo.length - 1]; if (!last) return;
    await run(async () => {
      if (last.kind === "place") await api(`/api/shop/place/${last.id}`, { method: "DELETE" });
      else if (last.kind === "move") await api(`/api/shop/place/${last.id}`, { method: "PATCH", body: { x: last.x, z: last.z, rotation: last.rotation } });
      else await api("/api/shop/place", { body: { itemId: last.itemId, x: last.x, z: last.z, rotation: last.rotation } });
      setUndo((u) => u.slice(0, -1)); setSelected(null); await reload();
    });
  }
  function onTap(h: { x: number; z: number; placementId: string | null; pet: boolean }) {
    if (readOnly) return;
    if (placing) return setPlacing({ ...placing, x: h.x, z: h.z });
    if (moving) return setMoving({ ...moving, x: h.x, z: h.z });
    if (build) return setSelected(h.placementId);
    if (h.pet) { setPetTap(true); setTimeout(() => setPetTap(false), 1800); }
  }

  const inventoryPlaceables = state.inventory.filter((i) => PLACEABLE_CATEGORIES.includes(i.category as ItemCategory) && i.quantity > 0);
  const sel = state.placements.find((p) => p.id === selected);
  const nextCost = expansionCosts?.[state.layout.expansion + 1];

  return (
    <div className="fixed inset-0 z-10 flex flex-col bg-walkie-light">
      <div className="relative min-h-0 flex-1">
        <ShopCanvas ref={view} size={state.layout.size} environment={state.layout.environment} floorKey={state.layout.floorKey} wallKey={state.layout.wallKey}
          placements={visiblePlacements} pets={state.pets} ghost={ghost} selectedId={selected} night={night} onTap={onTap} />

        {/* top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4 pt-[calc(14px+var(--safe-top))]">
          <Link href={readOnly ? "/app/friends" : "/app"} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-white/95 shadow-card" aria-label="Close"><Icon name="close" size={20} /></Link>
          <div className="pointer-events-auto rounded-full bg-white/95 px-4 py-2 text-center shadow-card">
            <p className="font-display text-[15px] font-semibold leading-tight">{readOnly ? `${ownerName}'s shop` : state.layout.name}</p>
            <p className="text-[11px] font-bold text-walkie-muted">{state.layout.size}×{state.layout.size} · {state.placements.length} items · {state.pets.length} pets</p>
          </div>
          {catalog ? <span className="pointer-events-auto inline-flex h-11 items-center gap-1.5 rounded-full bg-white/95 px-3.5 font-extrabold shadow-card tabular"><Coin size={20} />{num(catalog.coins)}</span> : <span className="w-11" />}
        </div>

        {petTap && <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 animate-pop rounded-full bg-white px-4 py-2 text-sm font-bold shadow-lift">💙 Your pets love their shop!</div>}

        {/* side controls */}
        <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-2">
          {[{ i: "plus", a: () => view.current?.zoom(1.2), l: "Zoom in" }, { i: "ellipsis", a: () => view.current?.zoom(0.83), l: "Zoom out" }, { i: "rotate", a: () => view.current?.rotate(1), l: "Rotate view" }, { i: "locate", a: () => view.current?.recenter(), l: "Recenter" }].map((b) => (
            <button key={b.l} onClick={b.a} className="grid h-11 w-11 place-items-center rounded-full bg-white/95 text-walkie-slate shadow-card" aria-label={b.l}><Icon name={b.i} size={20} /></button>
          ))}
          <button onClick={() => setNight((n) => !n)} className="grid h-11 w-11 place-items-center rounded-full bg-white/95 text-walkie-slate shadow-card" aria-label="Toggle day and night">{night ? "☀️" : "🌙"}</button>
        </div>
      </div>

      {/* bottom controls */}
      {!readOnly && (
        <div className="relative z-10 border-t border-walkie-gray/60 bg-white px-4 pb-[calc(12px+var(--safe-bottom))] pt-3">
          {active ? (
            <div className="mx-auto max-w-lg">
              <p className="mb-2 text-center text-[13px] font-bold text-walkie-muted">{valid ? `Tap the ground to position ${placing?.name ?? "the item"}` : "Can't place here — try another spot"}{placing?.buy && <> · <Coin size={13} className="inline" /> {placing.buy.price}</>}</p>
              <div className="grid grid-cols-3 gap-2">
                <button className="btn-soft" onClick={() => { setPlacing(null); setMoving(null); }}><Icon name="close" size={18} />Cancel</button>
                <button className="btn-soft" onClick={() => placing ? setPlacing({ ...placing, rotation: (placing.rotation + 1) % 4 }) : moving && setMoving({ ...moving, rotation: (moving.rotation + 1) % 4 })}><Icon name="rotate" size={18} />Rotate</button>
                <button className="btn-primary" disabled={!valid || busy} onClick={confirm}><Icon name="check" size={18} />{placing?.buy ? "Buy" : "Place"}</button>
              </div>
            </div>
          ) : build ? (
            <div className="mx-auto max-w-lg">
              {sel ? (
                <div className="mb-3 flex items-center gap-2">
                  <p className="flex-1 truncate font-bold">{sel.name}</p>
                  <button className="btn-soft min-h-[38px] px-3 text-sm" onClick={() => { setMoving({ id: sel.id, model: sel.model, color: sel.color, w: sel.w, d: sel.d, rotation: sel.rotation, x: sel.x, z: sel.z, from: { x: sel.x, z: sel.z, rotation: sel.rotation } }); setSelected(null); }}><Icon name="move" size={16} />Move</button>
                  <button className="btn-soft min-h-[38px] px-3 text-sm" onClick={rotateSelected} disabled={busy}><Icon name="rotate" size={16} /></button>
                  <button className="btn-danger min-h-[38px] px-3 text-sm" onClick={storeSelected} disabled={busy}>Store</button>
                </div>
              ) : <p className="mb-2 text-[12px] font-bold text-walkie-muted">Tap an item in your shop to move or store it — or pick something below.</p>}
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {inventoryPlaceables.length === 0 && <button onClick={() => setMarket(true)} className="shrink-0 rounded-2xl bg-walkie-light px-4 py-3 text-[13px] font-bold text-walkie-slate">Inventory empty — visit the market →</button>}
                {inventoryPlaceables.map((i) => (
                  <button key={i.itemId} onClick={() => startPlacing(i)} className="relative w-[84px] shrink-0 rounded-2xl bg-walkie-light p-2 text-center">
                    <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl" style={{ background: i.color ?? "#ddd" }}><Icon name={i.category === "BUILDING" ? "home" : i.category === "FURNITURE" ? "store" : "sparkle"} size={20} className="text-white" /></span>
                    <span className="mt-1 block truncate text-[11px] font-bold">{i.name}</span>
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-white px-1.5 text-[10px] font-extrabold shadow-card">×{i.quantity}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                <button className="btn-soft min-h-[40px] px-2 text-[13px]" onClick={() => setMarket(true)}><Icon name="store" size={16} />Market</button>
                <button className="btn-soft min-h-[40px] px-2 text-[13px]" onClick={() => setSurfaces(true)}>Floors</button>
                <button className="btn-soft min-h-[40px] px-2 text-[13px]" disabled={!undo.length || busy} onClick={doUndo}><Icon name="undo" size={16} />Undo</button>
                <button className="btn-dark min-h-[40px] px-2 text-[13px]" onClick={() => { setBuild(false); setSelected(null); }}>Done</button>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-lg items-center gap-3">
              <div className="flex -space-x-5">{state.pets.slice(0, 3).map((p) => <PetArt key={p.id} species={p.species} size={48} mood="sit" />)}</div>
              <button className="btn-soft flex-1" onClick={() => setMarket(true)}><Icon name="store" size={18} />Market</button>
              <button className="btn-primary flex-1" onClick={() => setBuild(true)}><Icon name="hammer" size={18} />Build</button>
            </div>
          )}
        </div>
      )}

      {catalog && (
        <Sheet open={market} onClose={() => setMarket(false)} title="Market" wide>
          <div className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
            {MARKET_TABS.map((t) => <button key={t.key} onClick={() => setMTab(t.key)} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold ${mTab === t.key ? "bg-walkie-ink text-white" : "bg-white shadow-card"}`}>{t.label}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {catalog.items.filter((i) => MARKET_TABS.find((t) => t.key === mTab)!.cats.includes(i.category as ItemCategory)).map((i) => {
              const placeable = PLACEABLE_CATEGORIES.includes(i.category as ItemCategory);
              const single = ["FLOOR", "WALL", "ENVIRONMENT"].includes(i.category);
              const afford = catalog.coins >= i.priceCoins;
              return (
                <div key={i.id} className="flex flex-col rounded-3xl bg-white p-3 shadow-card">
                  <div className="grid h-16 place-items-center rounded-2xl" style={{ background: `${i.color ?? "#EAF2FC"}55` }}><span className="h-9 w-9 rounded-xl shadow-inner" style={{ background: i.color ?? "#A9C5ED" }} /></div>
                  <div className="mt-2 flex items-center gap-1"><p className="flex-1 truncate text-[14px] font-bold">{i.name}</p>{i.seasonal && <span title="Seasonal">❄️</span>}</div>
                  <p className="line-clamp-2 min-h-[32px] text-[11.5px] leading-tight text-walkie-muted">{i.description}</p>
                  <div className="mt-1.5 flex items-center justify-between"><RarityBadge rarity={i.rarity} />{i.owned > 0 && <span className="text-[11px] font-bold text-walkie-muted">Owned {i.owned}</span>}</div>
                  {i.locked ? <Link href="/app/plus" className="btn-soft mt-2 min-h-[36px] text-[13px]">Plus</Link> : single && i.owned > 0 ? <span className="mt-2 text-center text-[12px] font-bold text-emerald-600">Owned ✓</span> : (
                    <div className="mt-2 grid gap-1.5">
                      <button className="btn-primary min-h-[36px] px-2 text-[13px]" disabled={!afford || busy} onClick={() => run(async () => { await api("/api/shop/buy", { body: { itemId: i.id, quantity: 1, requestId: uid() } }); toast("success", `Bought ${i.name}`); await reload(); })}><Coin size={15} />{num(i.priceCoins)}</button>
                      {placeable && <button className="text-[12px] font-bold text-walkie-blue disabled:opacity-40" disabled={!afford} onClick={() => startPlacing({ itemId: i.id, model: i.model, color: i.color, w: i.w, d: i.d, name: i.name }, { price: i.priceCoins })}>Preview in shop</button>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {catalog.items.length > 0 && <p className="mt-3 text-center text-[12px] text-walkie-muted">Earn coins by walking and running. Nothing here is pay-to-win.</p>}
        </Sheet>
      )}

      <Sheet open={surfaces} onClose={() => setSurfaces(false)} title="Floors, fences & places">
        {(["FLOOR", "WALL", "ENVIRONMENT"] as const).map((cat) => (
          <div key={cat} className="mb-4">
            <p className="label">{cat === "FLOOR" ? "Floor" : cat === "WALL" ? "Fence" : "Environment"}</p>
            <div className="flex flex-wrap gap-2">
              {cat === "ENVIRONMENT" && <SurfaceBtn active={state.layout.environment === "starter"} color="#EAF2FC" label="Starter" onClick={() => {}} />}
              {state.inventory.filter((i) => i.category === cat && i.quantity > 0).map((i) => {
                const isActive = cat === "FLOOR" ? state.layout.floorKey === i.key : cat === "WALL" ? state.layout.wallKey === i.key : state.layout.environment === i.key.replace("env_", "");
                return <SurfaceBtn key={i.itemId} active={isActive} color={i.color ?? "#ddd"} label={i.name} onClick={() => run(async () => { await api("/api/shop/surface", { body: { itemId: i.itemId } }); await reload(); })} />;
              })}
            </div>
          </div>
        ))}
        <button className="btn-soft w-full" onClick={() => { setSurfaces(false); setMTab("surfaces"); setMarket(true); }}>Get more in the market</button>
        {nextCost != null ? (
          <div className="mt-4 rounded-3xl bg-walkie-pale p-4">
            <p className="font-display text-lg font-semibold">Expand your shop</p>
            <p className="text-[13px] text-walkie-muted">Grow from {state.layout.size}×{state.layout.size} to {state.layout.size + 2}×{state.layout.size + 2} tiles.</p>
            <button className="btn-primary mt-3 w-full" disabled={busy || (catalog?.coins ?? 0) < nextCost} onClick={() => run(async () => { await api("/api/shop/expand", { method: "POST" }); await reload(); setSurfaces(false); celebrate({ title: "Shop expanded!", body: "More room for pets and decorations.", mood: "celebrate" }); })}><Coin size={18} />{num(nextCost)} · Expand</button>
          </div>
        ) : <p className="mt-4 text-center text-[13px] font-bold text-walkie-muted">Your shop is at its biggest size 🎉</p>}
      </Sheet>
    </div>
  );
}

function SurfaceBtn({ active, color, label, onClick }: { active: boolean; color: string; label: string; onClick: () => void }) {
  return <button onClick={onClick} className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-bold ${active ? "bg-walkie-blue text-white" : "bg-white shadow-card"}`}><span className="h-4 w-4 rounded-full border border-black/5" style={{ background: color }} />{label}</button>;
}
