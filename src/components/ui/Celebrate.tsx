"use client";
import { sfx } from "@/lib/client/sfx";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { MyWalkie } from "../mascot/MyWalkie";
import { Walkie, type Mood } from "../mascot/Walkie";
import { PetArt } from "../mascot/PetArt";
import { Coin } from "./Icon";

type C = { title: string; body?: string; coins?: number; xp?: number; mood?: Mood; species?: string };
const Ctx = createContext<(c: C) => void>(() => {});
export const useCelebrate = () => useContext(Ctx);

/** Full-screen reward moment: level ups, new pets, claimed rewards. */
export function CelebrateProvider({ children }: { children: ReactNode }) {
  const [c, setC] = useState<C | null>(null);
  const show = useCallback((x: C) => {
    setC(x);
    sfx(x.coins ? "claim" : x.species && x.species !== "husky" ? (/grew up/i.test(x.title) ? "evolve" : "reward") : x.mood === "levelup" ? "levelup" : x.mood === "discover" ? "discover" : "reward");
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {c && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-walkie-slate/40 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={c.title} onClick={() => setC(null)}>
          <div className="w-full max-w-xs animate-pop rounded-[32px] bg-white p-6 text-center shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto -mt-16 w-fit rounded-full bg-gradient-to-b from-walkie-pale to-white p-2">
              {c.species && c.species !== "husky" ? <PetArt species={c.species} mood="happy" size={140} /> : <MyWalkie mood={c.mood ?? "celebrate"} size={140} />}
            </div>
            <h2 className="mt-1 font-display text-2xl font-semibold">{c.title}</h2>
            {c.body && <p className="mt-1 text-sm text-walkie-muted">{c.body}</p>}
            {(c.coins || c.xp) ? (
              <div className="mt-4 flex justify-center gap-2">
                {!!c.coins && <span className="inline-flex items-center gap-1.5 rounded-full bg-butter px-3 py-1.5 font-display font-semibold text-amber-800"><Coin size={18} />+{c.coins}</span>}
                {!!c.xp && <span className="inline-flex items-center gap-1.5 rounded-full bg-walkie-pale px-3 py-1.5 font-display font-semibold text-walkie-slate">+{c.xp} XP</span>}
              </div>
            ) : null}
            <button className="btn-primary mt-5 w-full" onClick={() => setC(null)} data-autofocus>Yay!</button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
