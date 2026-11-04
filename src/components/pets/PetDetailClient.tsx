"use client";
import Link from "next/link";
import { MyWalkie } from "../mascot/MyWalkie";
import { AppIcon } from "../ui/AppIcon";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Mood } from "../mascot/Walkie";
import { PetArt } from "../mascot/PetArt";
import { Icon } from "../ui/Icon";
import { Bar } from "../ui/Progress";
import { RarityBadge, rarityBg, rarityClass } from "../ui/Rarity";
import { Sheet } from "../ui/Sheet";
import { useToast } from "../ui/Toast";
import { useCelebrate } from "../ui/Celebrate";
import { api } from "@/lib/client/api";
import type { getPetDetail } from "@/lib/queries/pets";

type D = NonNullable<Awaited<ReturnType<typeof getPetDetail>>>;
const STAGES = ["BABY", "YOUNG", "ADULT", "SPECIAL"];

export function PetDetailClient({ d }: { d: D }) {
  const router = useRouter();
  const toast = useToast();
  const celebrate = useCelebrate();
  const [, start] = useTransition();
  const [mood, setMood] = useState<Mood>("idle");
  const [stats, setStats] = useState({ happiness: d.pet.happiness, energy: d.pet.energy });
  const [sheet, setSheet] = useState<null | "feed" | "rename" | "dress">(null);
  const [name, setName] = useState(d.pet.nickname);
  const flash = (m: Mood, ms = 2200) => { setMood(m); setTimeout(() => setMood("idle"), ms); };
  const refresh = () => start(() => router.refresh());

  async function action(action: "feed" | "play" | "pet", itemId?: string) {
    try {
      const r = await api<{ pet: { happiness: number; energy: number; level?: number }; xp: number; leveledUp?: boolean; evolved?: boolean; note?: string }>(`/api/pets/${d.pet.id}/action`, { body: { action, itemId } });
      setStats({ happiness: r.pet.happiness, energy: r.pet.energy });
      flash(action === "feed" ? "eat" : action === "play" ? "play" : "interact");
      if (r.evolved) setTimeout(() => celebrate({ title: `${d.pet.nickname} grew up!`, species: d.species.key, body: "A new growth stage — look at them go!" }), 1500);
      else if (r.leveledUp) setTimeout(() => celebrate({ title: `${d.pet.nickname} reached level ${r.pet.level}!`, species: d.species.key }), 1500);
      setSheet(null);
      refresh();
    } catch (e: any) { toast("error", e.message); flash("sad", 1800); }
  }
  const foods = d.inventory.filter((i) => i.category === "FOOD");
  const accessories = d.inventory.filter((i) => i.category === "ACCESSORY");
  const stageIdx = STAGES.indexOf(d.pet.stage);
  const nextStageLevel = [d.species.youngAtLevel, d.species.adultAtLevel, d.species.specialAtLevel][stageIdx];

  return (
    <div className="px-4 pt-[calc(12px+var(--safe-top))]">
      <div className="flex h-11 items-center justify-between">
        <Link href="/app/explore" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card" aria-label="Back"><Icon name="back" size={20} /></Link>
        <RarityBadge rarity={d.species.rarity} />
        <button onClick={() => setSheet("rename")} className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card" aria-label="Rename"><Icon name="edit" size={18} /></button>
      </div>
      <section className={`mt-3 overflow-hidden rounded-card ${rarityClass(d.species.rarity)}`} style={{ background: `linear-gradient(180deg, ${rarityBg(d.species.rarity)}, #fff)` }}>
        {d.species.key === "husky" ? (
          <div className="flex justify-center pt-4" onClick={() => action("pet")}><MyWalkie living interactive mood={mood} size={240} title={d.pet.nickname} /></div>
        ) : (
          <button className="block w-full pt-4" onClick={() => action("pet")} aria-label={`Pet ${d.pet.nickname}`}>
            <PetArt species={d.species.key} mood={mood} size={240} accessories={d.pet.accessories} className="mx-auto" />
          </button>
        )}
        <div className="px-5 pb-5 text-center">
          <h1 className="font-display text-[30px] font-semibold leading-tight">{d.pet.nickname}</h1>
          <p className="text-[13px] font-semibold text-walkie-muted">{d.species.name} · {d.pet.stage.toLowerCase()} · {d.species.personality}</p>
          <p className="mt-1 text-[12px] text-walkie-muted">Tap {d.pet.nickname} to play · hold to pet</p>
          {d.species.key === "husky" && <Link href="/app/wardrobe" className="btn-soft mt-3 inline-flex"><AppIcon name="wardrobe" size={22} />Open wardrobe</Link>}
        </div>
      </section>

      <section className="card mt-3 space-y-3 p-5">
        <Stat label="Level" right={`Lv ${d.pet.level} · ${d.pet.into}/${d.pet.needed} XP`} value={d.pet.progress} color="#6B8FD6" />
        <Stat label="Happiness" right={`${stats.happiness}%`} value={stats.happiness / 100} color="#F28DAA" />
        <Stat label="Energy" right={`${stats.energy}%`} value={stats.energy / 100} color="#5DBE9A" />
        {nextStageLevel && <p className="text-[12px] text-walkie-muted">Grows into the next stage at level {nextStageLevel}. Pets grow when you're active — walks give your active pet XP.</p>}
      </section>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button className="card flex flex-col items-center gap-1 py-4 font-bold" onClick={() => setSheet("feed")}><AppIcon name="reward" size={44} />Feed</button>
        <button className="card flex flex-col items-center gap-1 py-4 font-bold" onClick={() => action("play")}><AppIcon name="pets" size={44} />Play</button>
        {d.species.key === "husky"
          ? <Link href="/app/wardrobe" className="card flex flex-col items-center gap-1 py-4 font-bold"><AppIcon name="clothing" size={44} />Wardrobe</Link>
          : <button className="card flex flex-col items-center gap-1 py-4 font-bold" onClick={() => setSheet("dress")}><AppIcon name="accessory" size={44} />Dress up</button>}
      </div>
      {d.isActive ? <p className="mt-4 text-center text-sm font-bold text-walkie-blue">✓ Your active companion</p> : (
        <button className="btn-soft mt-4 w-full" onClick={async () => { try { await api(`/api/pets/${d.pet.id}/active`, { method: "POST" }); toast("success", `${d.pet.nickname} is your companion now`); refresh(); } catch (e: any) { toast("error", e.message); } }}>Make active companion</button>
      )}
      <div className="mt-4 rounded-2xl bg-white/60 px-4 py-3 text-[12px] text-walkie-muted">Joined {new Date(d.pet.acquiredAt).toLocaleDateString()} · {d.pet.xp} total XP</div>

      <Sheet open={sheet === "feed"} onClose={() => setSheet(null)} title="Choose a snack">
        {foods.length === 0 ? <div className="py-4 text-center text-sm text-walkie-muted">No snacks left. <Link href="/app/shop?tab=market" className="font-bold text-walkie-blue">Visit the market</Link></div> : (
          <div className="grid gap-2">{foods.map((f) => (
            <button key={f.itemId} onClick={() => action("feed", f.itemId)} className="flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-butter text-amber-700"><Icon name="bowl" /></span>
              <span className="flex-1"><span className="block font-bold">{f.name}</span><span className="text-[12px] text-walkie-muted">+{f.effect?.energy ?? 0} energy · +{f.effect?.happiness ?? 0} happiness</span></span>
              <span className="chip bg-walkie-light text-walkie-slate">×{f.quantity}</span>
            </button>))}</div>
        )}
      </Sheet>
      <Sheet open={sheet === "rename"} onClose={() => setSheet(null)} title="Rename">
        <form onSubmit={async (e) => { e.preventDefault(); try { await api(`/api/pets/${d.pet.id}`, { method: "PATCH", body: { nickname: name } }); setSheet(null); refresh(); } catch (er: any) { toast("error", er.message); } }}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} data-autofocus />
          <button className="btn-primary mt-3 w-full">Save name</button>
        </form>
      </Sheet>
      <Sheet open={sheet === "dress"} onClose={() => setSheet(null)} title="Accessories">
        {(["HEAD", "FACE", "NECK", "BACK"] as const).map((slot) => {
          const worn = d.pet.accessories.find((a) => a.slot === slot);
          const opts = accessories.filter((a) => a.slot === slot);
          return (
            <div key={slot} className="mb-4">
              <p className="label">{slot === "HEAD" ? "Head" : slot === "FACE" ? "Glasses" : slot === "NECK" ? "Neck" : "Back"}</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={async () => { await api(`/api/pets/${d.pet.id}/equip`, { body: { slot, itemId: null } }).catch((e) => toast("error", e.message)); refresh(); }} className={`rounded-full px-3.5 py-2 text-[13px] font-bold ${!worn ? "bg-walkie-ink text-white" : "bg-white shadow-card"}`}>None</button>
                {opts.map((o) => <button key={o.itemId} onClick={async () => { try { await api(`/api/pets/${d.pet.id}/equip`, { body: { slot, itemId: o.itemId } }); flash("happy"); refresh(); } catch (e: any) { toast("error", e.message); } }} className={`rounded-full px-3.5 py-2 text-[13px] font-bold ${worn?.itemId === o.itemId ? "bg-walkie-blue text-white" : "bg-white shadow-card"}`}><span className="mr-1.5 inline-block h-3 w-3 rounded-full align-middle" style={{ background: o.color ?? "#ccc" }} />{o.name}</button>)}
                {opts.length === 0 && <Link href="/app/shop?tab=market" className="text-[13px] font-bold text-walkie-blue">Find some in the market →</Link>}
              </div>
            </div>
          );
        })}
      </Sheet>
    </div>
  );
}
function Stat({ label, right, value, color }: { label: string; right: string; value: number; color: string }) {
  return <div><div className="mb-1 flex justify-between text-[13px] font-bold"><span>{label}</span><span className="text-walkie-muted tabular">{right}</span></div><Bar value={value} color={color} height={10} /></div>;
}
