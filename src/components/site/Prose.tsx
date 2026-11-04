import type { ReactNode } from "react";
import { Walkie, type Mood } from "../mascot/Walkie";
export function PageHero({ eyebrow, title, sub, mood = "idle" }: { eyebrow: string; title: string; sub?: string; mood?: Mood }) {
  return (
    <section className="bg-gradient-to-b from-walkie-pale to-walkie-white">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 pb-6 pt-12 text-center sm:px-6">
        <Walkie mood={mood} size={130} />
        <p className="eyebrow mt-2">{eyebrow}</p>
        <h1 className="mt-1 font-display text-[38px] font-semibold leading-tight sm:text-[48px]">{title}</h1>
        {sub && <p className="mt-2 max-w-xl text-[17px] text-walkie-muted">{sub}</p>}
      </div>
    </section>
  );
}
export function Prose({ children }: { children: ReactNode }) {
  return <article className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:text-[16px] [&_p]:leading-relaxed [&_p]:text-walkie-slate [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-walkie-slate">{children}</article>;
}
