"use client";
import { useProviders } from "@/lib/client/providers";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api } from "@/lib/client/api";
import { Icon } from "../ui/Icon";

function Card({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="card -mt-3 p-6">
      <h1 className="text-center font-display text-2xl font-semibold">{title}</h1>
      {sub && <p className="mt-1 text-center text-sm text-walkie-muted">{sub}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}
const Err = ({ msg }: { msg: string | null }) => (msg ? <p role="alert" className="rounded-2xl bg-rose-50 px-3 py-2.5 text-[13px] font-semibold text-rose-700">{msg}</p> : null);
const OAUTH_ERR: Record<string, string> = { oauth: "Sign-in didn't complete. Please try again.", oauth_state: "That sign-in link expired. Please try again.", oauth_unconfigured: "That sign-in option isn't set up yet.", oauth_unverified: "Please verify your email with that provider first.", account_unavailable: "This account isn't available." };

function Social() {
  const pv = useProviders();
  if (!pv || (!pv.google && !pv.apple)) return null;
  return (
    <div className="grid gap-2">
      {pv.apple && <a href="/api/auth/oauth/apple" className="btn-dark w-full"><Icon name="apple" size={18} fill="currentColor" strokeWidth={0} /> Continue with Apple</a>}
      {pv.google && <a href="/api/auth/oauth/google" className="btn w-full border border-walkie-gray bg-white text-walkie-ink hover:bg-walkie-light">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>
        Continue with Google
      </a>}
      <div className="my-2 flex items-center gap-3 text-[12px] font-bold text-walkie-muted"><span className="h-px flex-1 bg-walkie-gray" />or with email<span className="h-px flex-1 bg-walkie-gray" /></div>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [err, setErr] = useState<string | null>(OAUTH_ERR[sp.get("error") ?? ""] ?? (sp.get("reason") === "reauth" ? "For security, please sign in again to use admin tools." : null));
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setErr(null);
    try {
      const r = await api<{ role: string }>("/api/auth/login", { body: { email: f.get("email"), password: f.get("password") } });
      const next = sp.get("next");
      router.replace(next && /^\/(?![\/\\])[^\s]*$/.test(next) && !next.includes("\\") ? next : "/app"); // same-site paths only (blocks //evil, /\evil)
      router.refresh();
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }
  return (
    <Card title="Welcome back" sub="Walkie missed you.">
      <Social />
      <form onSubmit={submit} className="space-y-3" noValidate>
        <label className="block"><span className="label">Email</span><input name="email" type="email" autoComplete="email" required className="input" /></label>
        <label className="block"><span className="label">Password</span><input name="password" type="password" autoComplete="current-password" required className="input" /></label>
        <div className="text-right"><Link href="/forgot-password" className="text-[13px] font-bold text-walkie-blue">Forgot password?</Link></div>
        <Err msg={err} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="mt-4 text-center text-sm text-walkie-muted">New here? <Link href="/welcome" className="font-bold text-walkie-blue">Start your adventure</Link></p>
    </Card>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setErr(null);
    try {
      await api("/api/auth/signup", { body: { name: f.get("name"), email: f.get("email"), password: f.get("password"), acceptTerms: f.get("terms") === "on", referralCode: (f.get("referral") as string) || undefined, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } });
      router.replace("/app"); router.refresh();
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }
  return (
    <Card title="Start your adventure" sub="Free forever for walking & running.">
      <Social />
      <form onSubmit={submit} className="space-y-3" noValidate>
        <label className="block"><span className="label">Your name</span><input name="name" autoComplete="given-name" required maxLength={60} className="input" /></label>
        <label className="block"><span className="label">Email</span><input name="email" type="email" autoComplete="email" required className="input" /></label>
        <label className="block"><span className="label">Password</span><input name="password" type="password" autoComplete="new-password" required minLength={8} className="input" /><span className="mt-1 block text-[12px] text-walkie-muted">8+ characters with a letter and a number.</span></label>
        <details className="text-[13px]"><summary className="cursor-pointer font-bold text-walkie-blue">Have an invite code?</summary><input name="referral" maxLength={20} autoCapitalize="characters" className="input mt-2 uppercase" placeholder="e.g. MAYA123" /></details>
        <label className="flex items-start gap-2.5 text-[13px] text-walkie-muted"><input name="terms" type="checkbox" className="mt-0.5 h-5 w-5 rounded accent-walkie-blue" /> <span>I agree to the <Link href="/terms" className="font-bold text-walkie-blue">Terms</Link> and <Link href="/privacy" className="font-bold text-walkie-blue">Privacy Policy</Link>.</span></label>
        <Err msg={err} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      </form>
      <p className="mt-4 text-center text-sm text-walkie-muted">Already walking with us? <Link href="/login" className="font-bold text-walkie-blue">Sign in</Link></p>
    </Card>
  );
}

export function ForgotForm() {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try { const r = await api<{ message: string }>("/api/auth/forgot", { body: { email: new FormData(e.currentTarget).get("email") } }); setMsg(r.message); setErr(null); } catch (e: any) { setErr(e.message); }
  }
  return (
    <Card title="Forgot your password?" sub="We'll email you a reset link.">
      {msg ? <p className="rounded-2xl bg-mint/60 px-4 py-3 text-sm font-semibold text-emerald-800">{msg}</p> : (
        <form onSubmit={submit} className="space-y-3"><label className="block"><span className="label">Email</span><input name="email" type="email" required className="input" /></label><Err msg={err} /><button className="btn-primary w-full">Send reset link</button></form>
      )}
      <p className="mt-4 text-center text-sm"><Link href="/login" className="font-bold text-walkie-blue">Back to sign in</Link></p>
    </Card>
  );
}

export function ResetForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirm")) return setErr("Passwords don't match");
    try { await api("/api/auth/reset", { body: { token: sp.get("token"), password: f.get("password") } }); setDone(true); setTimeout(() => router.push("/login"), 1500); } catch (e: any) { setErr(e.message); }
  }
  if (!sp.get("token")) return <Card title="Link missing"><p className="text-center text-sm text-walkie-muted">Open the link from your email, or <Link className="font-bold text-walkie-blue" href="/forgot-password">request a new one</Link>.</p></Card>;
  return (
    <Card title="Choose a new password">
      {done ? <p className="rounded-2xl bg-mint/60 px-4 py-3 text-sm font-semibold text-emerald-800">Password updated! Taking you to sign in…</p> : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block"><span className="label">New password</span><input name="password" type="password" autoComplete="new-password" required className="input" /></label>
          <label className="block"><span className="label">Confirm password</span><input name="confirm" type="password" autoComplete="new-password" required className="input" /></label>
          <Err msg={err} /><button className="btn-primary w-full">Update password</button>
        </form>
      )}
    </Card>
  );
}

export function VerifyEmail() {
  const sp = useSearchParams();
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const token = sp.get("token");
    if (!token) { setState("error"); setMsg("This link is missing its token."); return; }
    api("/api/auth/verify", { body: { token } }).then(() => setState("ok")).catch((e) => { setState("error"); setMsg(e.message); });
  }, [sp]);
  return (
    <Card title={state === "ok" ? "Email verified!" : state === "error" ? "Couldn't verify" : "Verifying…"}>
      <p className="text-center text-sm text-walkie-muted">{state === "ok" ? "Thanks — you're all set." : msg}</p>
      <Link href="/app" className="btn-primary mt-4 w-full">Go to Walkie</Link>
    </Card>
  );
}
