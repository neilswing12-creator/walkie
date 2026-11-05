"use client";
/** Profile → Sounds: on/off, volume and a preview. Per-device preference (stored on this device only). */
import { useEffect, useState } from "react";
import { setSfxPrefs, sfx, sfxPrefs } from "@/lib/client/sfx";

export function SoundSettings() {
  const [p, setP] = useState<{ on: boolean; volume: number } | null>(null);
  useEffect(() => { setP(sfxPrefs()); }, []);
  if (!p) return null;
  const update = (x: Partial<typeof p>) => { const n = { ...p, ...x }; setP(n); setSfxPrefs(n); };
  return (
    <>
      <label className="flex cursor-pointer items-center gap-3 px-4 py-3.5">
        <span className="flex-1"><span className="block text-[15px] font-bold">Sound effects</span><span className="block text-[12px] text-walkie-muted">Feeding, playing, petting, rewards and more · no background music</span></span>
        <input type="checkbox" className="peer sr-only" checked={p.on} onChange={(e) => { update({ on: e.target.checked }); if (e.target.checked) setTimeout(() => sfx("success"), 30); }} />
        <span className="relative h-7 w-12 rounded-full bg-walkie-gray transition peer-checked:bg-walkie-blue peer-focus-visible:ring-4 peer-focus-visible:ring-walkie-blue/30 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" aria-hidden />
      </label>
      {p.on && (
        <div className="flex items-center gap-3 px-4 pb-4">
          <span className="text-[13px] font-bold text-walkie-muted">Volume</span>
          <input type="range" min={0.1} max={1} step={0.05} value={p.volume} aria-label="Sound volume" className="flex-1 accent-walkie-blue"
            onChange={(e) => update({ volume: Number(e.target.value) })} onPointerUp={() => sfx("coin")} onKeyUp={() => sfx("coin")} />
          <button className="btn-soft min-h-[36px] px-3 text-[13px]" onClick={() => { sfx("reward"); }}>Test</button>
        </div>
      )}
    </>
  );
}
