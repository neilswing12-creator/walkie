import Link from "next/link";
import { Walkie } from "../mascot/Walkie";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-walkie-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-1.5 font-display text-[22px] font-semibold text-walkie-ink" aria-label="Walkie home"><Walkie size={40} mood="idle" title="" /> Walkie</Link>
        <nav className="hidden items-center gap-7 text-[15px] font-bold text-walkie-slate md:flex" aria-label="Site">
          <Link href="/#features" className="hover:text-walkie-blue">Features</Link>
          <Link href="/#pets" className="hover:text-walkie-blue">Pets</Link>
          <Link href="/#shop" className="hover:text-walkie-blue">Pet shop</Link>
          <Link href="/help" className="hover:text-walkie-blue">Help</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost hidden min-h-[40px] sm:inline-flex">Sign in</Link>
          <Link href="/welcome" className="btn-primary min-h-[40px] px-4 text-sm">Start free</Link>
        </div>
      </div>
    </header>
  );
}

const cols: [string, [string, string][]][] = [
  ["Walkie", [["About", "/about"], ["Features", "/features"], ["Blog", "/blog"]]],
  ["Support", [["Help Center", "/help"], ["Contact", "/contact"]]],
  ["Legal", [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["Cookie Policy", "/cookies"]]],
];

export function SiteFooter() {
  return (
    <footer className="border-t border-walkie-gray/60 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="flex items-center gap-1.5 font-display text-2xl font-semibold"><Walkie size={44} mood="sit" title="" /> Walkie</p>
          <p className="mt-2 max-w-xs text-[14px] text-walkie-muted">Every step is an adventure. Walk, run, collect pets and grow a cozy little world.</p>
          <div className="mt-4 flex gap-2">
            {[["Instagram", "https://instagram.com/walkie.run"], ["TikTok", "https://tiktok.com/@walkie.run"], ["X", "https://x.com/walkierun"]].map(([l, h]) => <a key={l} href={h} rel="noopener noreferrer me" target="_blank" className="rounded-full bg-walkie-light px-3 py-1.5 text-[13px] font-bold text-walkie-slate hover:bg-walkie-pale">{l}</a>)}
          </div>
        </div>
        {cols.map(([t, links]) => (
          <div key={t}><p className="eyebrow">{t}</p><ul className="mt-3 space-y-2">{links.map(([l, h]) => <li key={h}><Link href={h} className="text-[15px] font-semibold text-walkie-slate hover:text-walkie-blue">{l}</Link></li>)}</ul></div>
        ))}
      </div>
      <div className="border-t border-walkie-light py-5 text-center text-[13px] text-walkie-muted">© {new Date().getFullYear()} Walkie · walkie.run</div>
    </footer>
  );
}
