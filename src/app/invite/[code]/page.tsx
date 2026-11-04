import Link from "next/link";
import { db } from "@/lib/db";
import { referralSettings } from "@/lib/referrals/service";
import { Walkie } from "@/components/mascot/Walkie";
export const dynamic = "force-dynamic";
export async function generateMetadata() { return { title: "You're invited to Walkie", robots: { index: false } }; }
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  const [u, cfg] = await Promise.all([db.user.findUnique({ where: { referralCode: code }, select: { name: true, status: true } }), referralSettings()]);
  const valid = !!u && u.status === "ACTIVE" && cfg.enabled;
  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-b from-walkie-pale to-walkie-cream px-5 py-10">
      <div className="card w-full max-w-sm overflow-hidden text-center">
        <div className="bg-gradient-to-b from-walkie-soft/60 to-white pt-6"><Walkie size={170} mood={valid ? "celebrate" : "sit"} className="mx-auto" /></div>
        <div className="p-6 pt-2">
          {valid ? <>
            <p className="text-[13px] font-bold uppercase tracking-wide text-walkie-blue">{u!.name.split(" ")[0]} invited you</p>
            <h1 className="mt-1 font-display text-[26px] font-semibold leading-tight">Walk with Walkie. Grow together!</h1>
            <p className="mt-2 text-[14px] text-walkie-muted">Join through this invite and get <b className="text-walkie-ink">{cfg.refereeTrialDays} days of Walkie Plus</b> free once your account is set up. No payment needed.</p>
            <a href={`/api/referrals/visit?code=${code}`} className="btn-primary mt-5 w-full">Accept invite</a>
            <p className="mt-3 text-[11px] text-walkie-muted">One welcome trial per person. Rewards are confirmed after sign-up and verification. <Link href="/terms" className="underline">Terms</Link></p>
          </> : <>
            <h1 className="font-display text-[24px] font-semibold">This invite isn't active</h1>
            <p className="mt-2 text-[14px] text-walkie-muted">The link may have expired or been replaced. You can still join Walkie!</p>
            <Link href="/welcome" className="btn-primary mt-5 w-full">Get started</Link>
          </>}
        </div>
      </div>
    </main>
  );
}
