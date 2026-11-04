import type { Metadata } from "next";
import Link from "next/link";
import { Walkie } from "@/components/mascot/Walkie";
export const metadata: Metadata = { robots: { index: false, follow: true } };
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-walkie-pale to-walkie-light px-4 pb-10 pt-[calc(20px+var(--safe-top))]">
      <div className="mx-auto max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2 font-display text-xl font-semibold text-walkie-slate"><span>🐾</span> Walkie</Link>
        <div className="mt-2 flex justify-center"><Walkie mood="greet" size={150} /></div>
        {children}
      </div>
    </main>
  );
}
