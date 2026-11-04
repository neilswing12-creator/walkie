"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/client/api";
import { PetArt } from "../mascot/PetArt";
import { Icon, Coin } from "../ui/Icon";
import { Sheet } from "../ui/Sheet";
import { useToast } from "../ui/Toast";
import { dist, distUnit, num } from "@/lib/format";
import { healthAvailable, syncHealth } from "@/lib/native/health";
import { enablePush } from "@/lib/native/push";

type Profile = Record<string, any>;
export function ProfileClient({ user, profile: initial, plus, stats, petSpecies, lastSync }: { user: { id: string; name: string; email: string; username: string | null; avatarUrl: string | null; timezone: string; emailVerified: boolean; hasPassword: boolean; isStaff: boolean }; profile: Profile; plus: boolean; stats: { level: number; coins: number; pets: number; activities: number; distanceM: number; achievements: number; freezes: number }; petSpecies: string; lastSync: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [p, setP] = useState(initial);
  const [sheet, setSheet] = useState<null | "edit" | "goals" | "body" | "password" | "delete">(null);
  const file = useRef<HTMLInputElement>(null);
  const units = p.units as "metric" | "imperial";

  async function patch(data: Record<string, unknown>, okMsg?: string) {
    const prev = p; setP({ ...p, ...data });
    try { await api("/api/me/profile", { method: "PATCH", body: data }); if (okMsg) toast("success", okMsg); router.refresh(); }
    catch (e: any) { setP(prev); toast("error", e.message); }
  }
  const Toggle = ({ k, label, sub }: { k: string; label: string; sub?: string }) => (
    <label className="flex cursor-pointer items-center gap-3 px-4 py-3.5">
      <span className="flex-1"><span className="block text-[15px] font-bold">{label}</span>{sub && <span className="block text-[12px] text-walkie-muted">{sub}</span>}</span>
      <input type="checkbox" className="peer sr-only" checked={!!p[k]} onChange={(e) => patch({ [k]: e.target.checked })} />
      <span className="relative h-7 w-12 rounded-full bg-walkie-gray transition peer-checked:bg-walkie-blue peer-focus-visible:ring-4 peer-focus-visible:ring-walkie-blue/30 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" aria-hidden />
    </label>
  );
  const Select = ({ k, label, opts }: { k: string; label: string; opts: [string, string][] }) => (
    <label className="flex items-center gap-3 px-4 py-3"><span className="flex-1 text-[15px] font-bold">{label}</span>
      <select className="rounded-xl bg-walkie-light px-3 py-2 text-[14px] font-bold text-walkie-slate" value={p[k]} onChange={(e) => patch({ [k]: e.target.value })}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </label>
  );

  return (
    <div className="px-4 pt-[calc(14px+var(--safe-top))]">
      <h1 className="font-display text-[30px] font-semibold">Profile</h1>
      <section className="card mt-3 p-5">
        <div className="flex items-center gap-4">
          <button onClick={() => file.current?.click()} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-walkie-pale" aria-label="Change profile picture">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : <PetArt species={petSpecies} size={80} mood="sit" />}
            <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-walkie-blue text-white ring-2 ring-white"><Icon name="edit" size={14} /></span>
          </button>
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const form = new FormData(); form.append("file", f); try { await api("/api/me/avatar", { form }); toast("success", "Looking good!"); router.refresh(); } catch (er: any) { toast("error", er.message); } }} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl font-semibold">{user.name}</p>
            <p className="truncate text-[13px] text-walkie-muted">{user.username ? `@${user.username}` : user.email}</p>
            <div className="mt-1.5 flex gap-1.5"><span className="chip bg-walkie-pale text-walkie-blue">Level {stats.level}</span>{plus && <span className="chip bg-lavender text-violet-700">Plus</span>}</div>
          </div>
          <button className="btn-soft min-h-[38px] px-3.5 text-sm" onClick={() => setSheet("edit")}>Edit</button>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[[num(stats.coins), "coins"], [String(stats.pets), "pets"], [dist(stats.distanceM, units, 0), distUnit(units)], [String(stats.achievements), "badges"]].map(([v, l]) => <div key={l} className="rounded-2xl bg-walkie-light py-2.5"><p className="font-display text-lg font-semibold">{v}</p><p className="text-[11px] font-bold text-walkie-muted">{l}</p></div>)}
        </div>
      </section>

      <Group title="Walkie">
        <Row href="/app/plus" icon="star" label={plus ? "Walkie Plus" : "Try Walkie Plus"} sub={plus ? "Manage your membership" : "Exclusive pets & decor · tracking stays free"} />
        <Row href="/app/friends" icon="users" label="Friends" />
        <Row href="/app/leaderboard" icon="trophy" label="Leaderboard" sub="Podiums, duels & privacy controls" />
        <Row href="/app/wardrobe" icon="sparkle" label="Wardrobe" sub="Outfits, style & fur" />
        <Row href="/app/history" icon="calendar" label="Activity history" sub={`${stats.activities} activities`} />
        <Row href="/app/invite" icon="gift" label="Invite friends" sub="Earn VIP days for every friend who joins" />
        <Row href="/app/badges" icon="trophy" label="My Achievements" sub={`${stats.achievements} unlocked`} />
        <Row href="/app/notifications" icon="bell" label="Notifications" />
        {user.isStaff && <Row href="/admin" icon="shield" label="Admin panel" />}
      </Group>

      <Group title="Goals & body">
        <Row onClick={() => setSheet("goals")} icon="target" label="Daily goals" sub={`${num(p.dailyStepGoal)} steps · ${p.dailyActiveMinGoal} active min`} />
        <Row onClick={() => setSheet("body")} icon="user" label="Body details" sub={p.weightKg ? `${p.weightKg} kg${p.heightCm ? ` · ${p.heightCm} cm` : ""} — for calorie & step estimates` : "Optional — improves estimates"} />
        <Select k="units" label="Units" opts={[["metric", "Kilometers"], ["imperial", "Miles"]]} />
        <div className="flex items-center gap-3 px-4 py-3"><span className="flex-1"><span className="block text-[15px] font-bold">Streak freezes</span><span className="block text-[12px] text-walkie-muted">Auto-protect your streak if you miss one day</span></span><span className="chip bg-walkie-pale text-walkie-blue">{stats.freezes} left</span></div>
      </Group>

      <Group title="Health & devices">
        <div className="px-4 py-3.5">
          <p className="text-[15px] font-bold">Apple Health / Health Connect</p>
          <p className="text-[12px] text-walkie-muted">{healthAvailable() ? (lastSync ? `Last synced ${new Date(lastSync).toLocaleString()}` : "Sync all-day steps from your phone") : "Available in the Walkie iOS & Android apps. On the web, steps are estimated from tracked walks."}</p>
          {healthAvailable() && <button className="btn-soft mt-2 min-h-[38px] text-sm" onClick={async () => { const r = await syncHealth(); "error" in r ? toast("error", r.error) : toast("success", `Synced ${r.accepted} days`); router.refresh(); }}>Sync now</button>}
        </div>
      </Group>

      <Group title="Privacy">
        <Select k="profileVisibility" label="Profile & shop" opts={[["PUBLIC", "Everyone"], ["FRIENDS", "Friends"], ["PRIVATE", "Only me"]]} />
        <Select k="activityVisibility" label="Activity summaries" opts={[["PUBLIC", "Everyone"], ["FRIENDS", "Friends"], ["PRIVATE", "Only me"]]} />
        <Toggle k="shareRoutes" label="Share route maps with friends" sub="Off by default. Precise routes are never public." />
        <Toggle k="leaderboardOptIn" label="Appear on public leaderboards" sub="Weekly totals only, never locations" />
        <Toggle k="allowFriendRequests" label="Allow friend requests" />
      </Group>

      <Group title="Notifications">
        <Toggle k="notifyDailyReminder" label="Daily walk reminder" sub={`Around ${p.reminderHour}:00 · gentle, once a day`} />
        <Toggle k="notifyMissions" label="Missions & challenges" />
        <Toggle k="notifyPets" label="Pet updates" />
        <Toggle k="notifyFriends" label="Friend activity" />
        <Toggle k="notifyEmail" label="Email updates" sub="Occasional, never spam" />
        <label className="flex items-center gap-3 px-4 py-3.5">
          <span className="flex-1"><span className="block text-[15px] font-bold">Push notifications</span><span className="block text-[12px] text-walkie-muted">{p.notifyPush ? "On for this account" : "Asks your device for permission"}</span></span>
          {p.notifyPush ? <button className="btn-soft min-h-[36px] text-sm" onClick={() => patch({ notifyPush: false }, "Push turned off")}>Turn off</button> : <button className="btn-primary min-h-[36px] text-sm" onClick={async () => { const r = await enablePush(); toast(r.ok ? "success" : "info", r.message); if (r.ok) setP({ ...p, notifyPush: true }); }}>Enable</button>}
        </label>
      </Group>

      <Group title="Account">
        {!user.emailVerified && <Row onClick={async () => { try { await api("/api/auth/verify/resend", { method: "POST" }); toast("success", "Verification email sent"); } catch (e: any) { toast("error", e.message); } }} icon="mail" label="Verify email" sub={user.email} />}
        <Row onClick={() => setSheet("password")} icon="lock" label={user.hasPassword ? "Change password" : "Set a password"} />
        <Row href="/api/me/export" icon="download" label="Export my data" sub="Everything we store, as JSON" external />
        <Row href="/help" icon="info" label="Help center" external />
        <Row href="/contact" icon="mail" label="Contact support" external />
        <Row href="/privacy" icon="shield" label="Privacy Policy" external />
        <Row href="/terms" icon="info" label="Terms of Service" external />
        <Row onClick={async () => { if (!confirm("Sign out of Walkie on all your other devices?")) return; try { const r = await api<{ revoked: number }>("/api/me/sessions", { method: "DELETE" }); alert(`Signed out ${r.revoked} other device${r.revoked === 1 ? "" : "s"}.`); } catch {} }} icon="shield" label="Sign out other devices" sub="Use this if you lost a phone or shared a computer" />
        <Row onClick={async () => { await api("/api/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); }} icon="logout" label="Sign out" />
        <Row onClick={() => setSheet("delete")} icon="trash" label="Delete account" danger />
      </Group>
      <p className="mt-4 text-center text-[11px] text-walkie-muted">Walkie 0.1.0 · Timezone {user.timezone}</p>

      <EditSheet open={sheet === "edit"} onClose={() => setSheet(null)} user={user} onSave={(d) => patch(d, "Profile saved").then(() => setSheet(null))} />
      <Sheet open={sheet === "goals"} onClose={() => setSheet(null)} title="Daily goals">
        <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); patch({ dailyStepGoal: Number(f.get("steps")), dailyActiveMinGoal: Number(f.get("min")), dailyDistanceGoalM: Math.round(Number(f.get("km")) * 1000) }, "Goals updated").then(() => setSheet(null)); }} className="space-y-3">
          <label className="block"><span className="label">Steps</span><input name="steps" type="number" min={1000} max={50000} step={500} defaultValue={p.dailyStepGoal} className="input" /></label>
          <label className="block"><span className="label">Active minutes</span><input name="min" type="number" min={5} max={300} defaultValue={p.dailyActiveMinGoal} className="input" /></label>
          <label className="block"><span className="label">Distance (km)</span><input name="km" type="number" min={0.5} max={50} step={0.5} defaultValue={p.dailyDistanceGoalM / 1000} className="input" /></label>
          <button className="btn-primary w-full">Save goals</button>
        </form>
      </Sheet>
      <Sheet open={sheet === "body"} onClose={() => setSheet(null)} title="Body details">
        <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const w = f.get("w") as string, h = f.get("h") as string; patch({ weightKg: w ? Number(w) : null, heightCm: h ? Number(h) : null }, "Saved").then(() => setSheet(null)); }} className="space-y-3">
          <p className="text-[13px] text-walkie-muted">Private and optional. Used to estimate calories (MET formula) and stride length. Never shared or sent to analytics.</p>
          <label className="block"><span className="label">Weight (kg)</span><input name="w" type="number" min={25} max={300} step={0.1} defaultValue={p.weightKg ?? ""} className="input" /></label>
          <label className="block"><span className="label">Height (cm)</span><input name="h" type="number" min={100} max={230} defaultValue={p.heightCm ?? ""} className="input" /></label>
          <button className="btn-primary w-full">Save</button>
        </form>
      </Sheet>
      <Sheet open={sheet === "password"} onClose={() => setSheet(null)} title={user.hasPassword ? "Change password" : "Set a password"}>
        <form onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { await api("/api/me/password", { body: { current: f.get("current") || undefined, next: f.get("next") } }); toast("success", "Password updated"); setSheet(null); } catch (er: any) { toast("error", er.message); } }} className="space-y-3">
          {user.hasPassword && <label className="block"><span className="label">Current password</span><input name="current" type="password" autoComplete="current-password" className="input" /></label>}
          <label className="block"><span className="label">New password</span><input name="next" type="password" autoComplete="new-password" className="input" /></label>
          <button className="btn-primary w-full">Save</button>
        </form>
      </Sheet>
      <Sheet open={sheet === "delete"} onClose={() => setSheet(null)} title="Delete your account?">
        <form onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { await api("/api/me", { method: "DELETE", body: { password: f.get("password") || undefined, confirm: f.get("confirm") || undefined } }); router.replace("/"); } catch (er: any) { toast("error", er.message); } }} className="space-y-3">
          <p className="text-[14px] text-walkie-muted">This permanently deletes your activities, routes, pets, shop and coins. Active app-store subscriptions must be cancelled in the App Store or Google Play. <Link href="/api/me/export" className="font-bold text-walkie-blue">Export your data</Link> first if you'd like a copy.</p>
          {user.hasPassword ? <label className="block"><span className="label">Confirm with your password</span><input name="password" type="password" className="input" /></label> : <label className="block"><span className="label">Type DELETE to confirm</span><input name="confirm" className="input" /></label>}
          <button className="btn-danger w-full">Permanently delete</button>
        </form>
      </Sheet>
    </div>
  );
}

function EditSheet({ open, onClose, user, onSave }: { open: boolean; onClose: () => void; user: { name: string; username: string | null }; onSave: (d: Record<string, unknown>) => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Edit profile">
      <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); onSave({ name: f.get("name"), username: (f.get("username") as string) || null }); }} className="space-y-3">
        <label className="block"><span className="label">Name</span><input name="name" defaultValue={user.name} maxLength={60} className="input" /></label>
        <label className="block"><span className="label">Username</span><input name="username" defaultValue={user.username ?? ""} placeholder="so friends can find you" className="input" /></label>
        <button className="btn-primary w-full">Save</button>
      </form>
    </Sheet>
  );
}
const Group = ({ title, children }: { title: string; children: ReactNode }) => <section className="mt-5"><h2 className="eyebrow mb-2 px-1">{title}</h2><div className="card divide-y divide-walkie-light overflow-hidden">{children}</div></section>;
function Row({ icon, label, sub, href, onClick, danger, external }: { icon: string; label: string; sub?: string; href?: string; onClick?: () => void; danger?: boolean; external?: boolean }) {
  const inner = (<><span className={`grid h-9 w-9 place-items-center rounded-xl ${danger ? "bg-rose-50 text-rose-500" : "bg-walkie-pale text-walkie-blue"}`}><Icon name={icon} size={18} /></span><span className="min-w-0 flex-1"><span className={`block text-[15px] font-bold ${danger ? "text-rose-600" : ""}`}>{label}</span>{sub && <span className="block truncate text-[12px] text-walkie-muted">{sub}</span>}</span><Icon name="chevron" size={16} className="text-walkie-muted" /></>);
  const cls = "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-walkie-light/60";
  if (href) return external ? <a href={href} className={cls}>{inner}</a> : <Link href={href} className={cls}>{inner}</Link>;
  return <button onClick={onClick} className={cls}>{inner}</button>;
}
void Coin;
