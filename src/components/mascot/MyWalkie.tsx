"use client";
/** The signed-in user's own Walkie — same outfit, style and fur on every screen (fed by the app layout, updated live by the wardrobe). */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Walkie, type WalkieProps } from "./Walkie";
import { LivingWalkie, type Reaction } from "./LivingWalkie";
import type { AccessoryProp } from "./Accessories";

export type Appearance = { accessories: AccessoryProp[]; look: string; fur: string };
const Ctx = createContext<{ a: Appearance | null; set: (a: Appearance) => void }>({ a: null, set: () => {} });
export function WalkieAppearanceProvider({ initial, children }: { initial: Appearance | null; children: ReactNode }) {
  const [a, set] = useState(initial);
  const v = useMemo(() => ({ a, set }), [a]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export const useWalkieAppearance = () => useContext(Ctx);

export function MyWalkie({ living = false, interactive = false, reaction, extra = [], ...p }: WalkieProps & { living?: boolean; interactive?: boolean; reaction?: Reaction | null; extra?: AccessoryProp[] }) {
  const { a } = useContext(Ctx);
  const accessories = [...(a?.accessories ?? []), ...extra.filter((e) => !(a?.accessories ?? []).some((x) => x.key === e.key))];
  if (living) return <LivingWalkie mood={p.mood} size={p.size} className={p.className} accessories={accessories} look={a?.look} fur={a?.fur} interactive={interactive} reaction={reaction} title={p.title} />;
  return <Walkie {...p} accessories={accessories} look={a?.look} fur={a?.fur} />;
}
