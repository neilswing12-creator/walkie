import type { Metadata } from "next";
import Link from "next/link";
import { Walkie } from "@/components/mascot/Walkie";
import { PetArt } from "@/components/mascot/PetArt";
import { ShopMini } from "@/components/app/ShopMini";
import { Icon, Coin } from "@/components/ui/Icon";
import { PetExplorer } from "@/components/site/PetExplorer";
import { ShopPreview } from "@/components/site/ShopPreview";
import { Waitlist } from "@/components/site/Waitlist";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: { absolute: "Walkie — Every step is an adventure | Walk, run & raise pets" },
  description: "Walkie is a walking and running app where your real-world steps earn coins, grow adorable pets and build your own cozy isometric pet shop.",
  alternates: { canonical: "/" },
};
export const revalidate = 3600;

const FEATURES = [
  { icon: "walk", title: "Track your walks", body: "Steps, distance, pace and calories — from GPS walks or Apple Health and Health Connect.", tint: "bg-walkie-pale text-walkie-blue" },
  { icon: "run", title: "Run with Walkie", body: "Live pace, kilometer splits, elevation and a private route map for every run.", tint: "bg-lavender text-violet-600" },
  { icon: "paw", title: "Collect adorable pets", body: "Fourteen companions from Common to Mythical, each with their own personality.", tint: "bg-blush text-rose-500" },
  { icon: "store", title: "Build your pet shop", body: "Place buildings, trees and treats in a cozy 3D isometric world you design.", tint: "bg-mint text-emerald-700" },
  { icon: "target", title: "Complete missions", body: "Gentle daily and weekly missions keep you moving without the pressure.", tint: "bg-butter text-amber-700" },
  { icon: "sparkle", title: "Grow your world", body: "Expand your shop, unlock floors and environments, and watch it come alive at night.", tint: "bg-walkie-pale text-walkie-blue" },
  { icon: "chart", title: "Track your progress", body: "Weekly and monthly insights, personal records and Walkie's friendly report card.", tint: "bg-lavender text-violet-600" },
  { icon: "users", title: "Join friends", body: "Visit friends' shops, join challenges, and opt in to leaderboards — privacy first.", tint: "bg-mint text-emerald-700" },
];

export default async function Landing() {
  const species = await db.petSpecies.findMany({ where: { enabled: true }, orderBy: { sort: "asc" }, select: { key: true, name: true, rarity: true, description: true, personality: true, premium: true } }).catch(() => []);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": "https://walkie.run/#org", name: "Walkie", url: "https://walkie.run", logo: "https://walkie.run/icon.svg" },
      { "@type": "SoftwareApplication", name: "Walkie", applicationCategory: "HealthApplication", operatingSystem: "iOS, Android, Web", url: "https://walkie.run", description: "Walk, run, collect pets and build your own cozy pet shop.", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
      { "@type": "WebSite", name: "Walkie", url: "https://walkie.run", publisher: { "@id": "https://walkie.run/#org" } },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-10 pt-10 sm:px-6 md:grid-cols-[1.05fr_1fr] md:pt-16">
          <div className="animate-fade-up">
            <span className="chip bg-walkie-pale text-walkie-blue"><Icon name="sparkle" size={13} /> Walking · running · cozy pets</span>
            <h1 className="mt-4 font-display text-[44px] font-semibold leading-[1.02] tracking-tight text-walkie-ink sm:text-[64px]">Every step is <span className="text-walkie-blue">an adventure.</span></h1>
            <p className="mt-5 max-w-lg text-[18px] leading-relaxed text-walkie-muted">Walk, run, collect adorable pets, and build your own cozy pet shop. Your real-world adventures make your virtual world grow.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/welcome" className="btn-primary h-14 px-7 text-[17px]">Start Your Adventure</Link>
              <a href="#features" className="btn-soft h-14 px-7 text-[17px]">Explore Walkie</a>
            </div>
            <p className="mt-4 text-[13px] font-semibold text-walkie-muted">Free forever for walking &amp; running · No pay-to-win</p>
          </div>
          <HeroScene />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="max-w-2xl"><p className="eyebrow">Why Walkie</p><h2 className="mt-2 font-display text-[36px] font-semibold leading-tight sm:text-[44px]">A real fitness app, wrapped in a cozy game.</h2></div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card group p-6 transition hover:-translate-y-1 hover:shadow-lift">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${f.tint}`}><Icon name={f.icon} size={24} /></span>
              <h3 className="mt-4 font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-walkie-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="eyebrow text-center">How it works</p>
          <h2 className="mt-2 text-center font-display text-[36px] font-semibold sm:text-[44px]">Five little steps</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-5">
            {[["walk", "Walk or run in real life."], ["coin", "Earn rewards and experience."], ["paw", "Collect adorable pets."], ["store", "Build your own pet shop."], ["sparkle", "Keep moving and unlock new adventures."]].map(([i, t], n) => (
              <li key={t} className="relative rounded-card bg-walkie-light p-6">
                <span className="font-display text-[44px] font-semibold leading-none text-walkie-soft">{n + 1}</span>
                <Icon name={i} size={26} className="absolute right-5 top-6 text-walkie-blue" />
                <p className="mt-3 font-display text-lg font-semibold leading-snug">{t}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PETS */}
      <section id="pets" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div className="max-w-xl"><p className="eyebrow">Pet collection</p><h2 className="mt-2 font-display text-[36px] font-semibold leading-tight sm:text-[44px]">Meet the gang.</h2><p className="mt-2 text-[16px] text-walkie-muted">Each pet unlocks a different way — distance, streaks, missions or coins. Tap one to say hello.</p></div></div>
        <PetExplorer species={species} />
      </section>

      {/* SHOP */}
      <section id="shop" className="scroll-mt-20 bg-gradient-to-b from-walkie-pale to-walkie-white py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <p className="eyebrow">Your virtual pet shop</p>
            <h2 className="mt-2 font-display text-[36px] font-semibold leading-tight sm:text-[44px]">Steps become trees, cafés and fountains.</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-walkie-muted">Start with a tiny plot. Every walk earns coins to place buildings, rotate decorations, change floors and fences, and expand into gardens, beaches and winter villages. Your pets wander around and enjoy it all — day and night.</p>
            <ul className="mt-5 space-y-2 text-[15px] font-semibold text-walkie-slate">{["Drag, pinch and rotate the 3D world", "Preview items in place before buying", "Visit friends' shops (if they say yes)"].map((t) => <li key={t} className="flex items-center gap-2"><Icon name="check" size={18} className="text-walkie-blue" />{t}</li>)}</ul>
          </div>
          <div><ShopPreview /><p className="mt-2 text-center text-[12px] font-semibold text-walkie-muted">Interactive preview — drag to look around</p></div>
        </div>
      </section>

      {/* FITNESS */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <PhonePreview />
          <div>
            <p className="eyebrow">Serious about fitness</p>
            <h2 className="mt-2 font-display text-[36px] font-semibold leading-tight sm:text-[44px]">Cute on the outside. Accurate on the inside.</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[["locate", "GPS route tracking", "Accuracy-filtered points, auto-paused jitter and private route maps."], ["clock", "Pace & splits", "Live pace, per-kilometer splits, speed and elevation where available."], ["paw", "Steps", "Apple Health & Health Connect in the mobile apps; estimates on web."], ["chart", "Real statistics", "Weekly & monthly charts, personal records and goal streaks."]].map(([i, t, b]) => (
                <div key={t} className="rounded-3xl bg-white p-5 shadow-card"><Icon name={i} size={22} className="text-walkie-blue" /><p className="mt-2 font-display text-lg font-semibold">{t}</p><p className="text-[14px] text-walkie-muted">{b}</p></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMMUNITY */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <div className="flex justify-center overflow-hidden -space-x-6">{["corgi", "cat", "husky", "fox", "bunny"].map((s, i) => <div key={s} className={i === 0 || i === 4 ? "hidden sm:block" : ""}><PetArt species={s} size={i === 2 ? 130 : 100} mood={i === 2 ? "happy" : "idle"} /></div>)}</div>
          <h2 className="mt-2 font-display text-[36px] font-semibold sm:text-[44px]">Better together, private by default.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-[16px] text-walkie-muted">Add friends, join monthly community challenges, and compare weekly totals on opt-in leaderboards. Your precise routes and locations are never shared publicly.</p>
        </div>
      </section>

      {/* PREVIEW (no fake testimonials) */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="card flex flex-col items-center gap-6 overflow-hidden p-8 text-center md:flex-row md:text-left">
          <Walkie mood="discover" size={160} />
          <div className="flex-1">
            <span className="chip bg-butter text-amber-800">Early preview</span>
            <h2 className="mt-2 font-display text-[30px] font-semibold">Walkie is brand new.</h2>
            <p className="mt-1 text-[16px] text-walkie-muted">We're not going to show you made-up reviews. Be one of our first walkers on the web today, and we'll share real stories from the community as they come in.</p>
          </div>
          <Link href="/signup" className="btn-primary h-14 shrink-0 px-7">Try it free</Link>
        </div>
      </section>

      {/* DOWNLOAD */}
      <section id="download" className="scroll-mt-20 bg-walkie-slate py-16 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="font-display text-[36px] font-semibold leading-tight sm:text-[44px]">iPhone &amp; Android apps are coming soon.</h2>
            <p className="mt-2 max-w-xl text-white/75">Join the waitlist and Walkie will bark (gently) the day they land in the App Store and Google Play. Meanwhile, Walkie works in your browser.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-[13px] font-bold">
              <span className="rounded-2xl border border-white/25 px-4 py-2.5"> App Store · Coming soon</span>
              <span className="rounded-2xl border border-white/25 px-4 py-2.5">▶ Google Play · Coming soon</span>
            </div>
          </div>
          <div className="w-full max-w-sm rounded-card bg-white p-5 text-walkie-ink"><Waitlist /></div>
        </div>
      </section>
    </>
  );
}

function HeroScene() {
  return (
    <div className="relative aspect-[1.05] w-full overflow-hidden rounded-[40px] bg-gradient-to-b from-[#DCE9FA] via-walkie-pale to-[#F1F7FD] shadow-lift" aria-hidden>
      {/* clouds */}
      {[[8, 12, 46], [40, 6, 60], [70, 18, 52]].map(([top, left, dur], i) => (
        <div key={i} className="absolute h-8 w-24 animate-[cloud_var(--d)_linear_infinite] rounded-full bg-white/90 shadow-[24px_-10px_0_4px_rgba(255,255,255,.9),-18px_-4px_0_0_rgba(255,255,255,.9)]" style={{ top: `${top}%`, left: `${left}%`, ["--d" as string]: `${dur}s`, animationDelay: `-${i * 12}s` }} />
      ))}
      {/* hills */}
      <svg viewBox="0 0 400 200" className="absolute bottom-0 w-full" preserveAspectRatio="none"><path d="M0 120 Q80 70 170 110 T400 90 V200 H0Z" fill="#CFE8C4" /><path d="M0 150 Q110 110 220 145 T400 135 V200 H0Z" fill="#BFE0B2" /><path d="M120 200 Q170 150 260 140 Q330 134 400 150 V200Z" fill="#E6D3B8" opacity=".9" /></svg>
      <div className="absolute bottom-[16%] right-[2%] w-[48%]"><ShopMini size={260} className="h-auto w-full" /></div>
      <div className="absolute bottom-[6%] left-[22%] w-[42%]"><Walkie mood="run" size={240} className="h-auto w-full" /></div>
      <div className="absolute bottom-[10%] left-[2%] w-[22%]"><PetArt species="corgi" mood="walk" size={120} className="h-auto w-full" /></div>
      <div className="absolute bottom-[34%] right-[6%] w-[14%]"><PetArt species="duck" size={80} className="h-auto w-full" /></div>
      {/* floating rewards */}
      {[[18, 30, 0], [28, 52, 1.2], [14, 64, 2.1]].map(([top, left, delay], i) => (
        <div key={i} className="absolute animate-floaty" style={{ top: `${top}%`, left: `${left}%`, animationDelay: `${delay}s` }}><Coin size={34} /></div>
      ))}
      <div className="absolute left-[6%] top-[38%] animate-floaty rounded-2xl bg-white/95 px-3 py-2 text-[13px] font-extrabold text-walkie-slate shadow-card" style={{ animationDelay: ".6s" }}>+16 coins · 1 km</div>
      <div className="absolute right-[8%] top-[10%] animate-floaty rounded-2xl bg-white/95 px-3 py-2 text-[13px] font-extrabold text-violet-600 shadow-card" style={{ animationDelay: "1.6s" }}>✨ New pet found!</div>
    </div>
  );
}

function PhonePreview() {
  return (
    <div className="mx-auto w-[290px] rounded-[48px] bg-walkie-ink p-3 shadow-lift">
      <div className="overflow-hidden rounded-[38px] bg-walkie-light p-4">
        <div className="flex items-center justify-between text-[11px] font-bold text-walkie-muted"><span>9:41</span><span>Outdoor run</span><span>●●●</span></div>
        <div className="mt-2 grid place-items-center rounded-2xl bg-mint/70 py-1.5 text-[11px] font-extrabold text-emerald-800">GPS active · ±6 m</div>
        <div className="flex justify-center"><Walkie mood="run" size={120} /></div>
        <div className="rounded-3xl bg-white p-4 text-center shadow-card">
          <p className="eyebrow">Distance</p><p className="font-display text-[44px] font-semibold leading-none">3.42</p><p className="text-[11px] font-bold text-walkie-muted">kilometers</p>
          <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px] font-bold text-walkie-muted">{[["18:21", "time"], ["5'22\"", "pace"], ["241", "kcal"]].map(([v, l]) => <div key={l} className="rounded-xl bg-walkie-light py-2"><p className="font-display text-[15px] text-walkie-ink">{v}</p>{l}</div>)}</div>
        </div>
        <p className="mt-2 text-center text-[10px] font-semibold text-walkie-muted">Illustrative app preview</p>
      </div>
    </div>
  );
}
