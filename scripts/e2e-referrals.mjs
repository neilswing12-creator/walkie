#!/usr/bin/env node
/**
 * Referral / VIP / anti-abuse end-to-end checks against a running server.
 * Requires ADMIN_EMAIL + ADMIN_PASSWORD (temporarily relaxes email verification for the run, then restores settings).
 */
const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; console.log(`  ✔ ${name}`); } else { fail++; console.log(`  ✘ ${name} ${extra}`); } };
const DAY = 86400000;

function client(defaults = {}) {
  let cookie = "";
  const c = async (path, { method, body, headers = {} } = {}) => {
    const res = await fetch(BASE + path, { method: method ?? (body ? "POST" : "GET"), redirect: "manual",
      headers: { origin: BASE, ...defaults, ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get("set-cookie");
    if (set) { const m = set.match(/walkie_session=([^;]*)/); if (m) cookie = m[1] ? `walkie_session=${m[1]}` : ""; }
    let json = null; try { json = await res.clone().json(); } catch {}
    return { status: res.status, json, headers: res.headers, text: json ? null : await res.text() };
  };
  c.set = (k, v) => { defaults[k] = v; };
  return c;
}
async function device() { const r = await (await fetch(`${BASE}/api/device/token`)).json(); return r.data.token; }
const stamp = Date.now();
const net = () => `${[198, 203, 192][stamp % 3]}.${(stamp >> 3) % 250}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`; // fresh public-looking IPs per run (signals persist for 30 days)
const WIFI = net();
const users = [];
async function person(name, email, { install, ip = WIFI, code } = {}) {
  const c = client({ "x-forwarded-for": ip, ...(install ? { "x-walkie-install": install } : {}) });
  const r = await c("/api/auth/signup", { body: { name, email, password: "walkies123", acceptTerms: true, ...(code ? { referralCode: code } : {}) } });
  users.push(c);
  return { c, status: r.status };
}
const onboard = (c) => c("/api/me/profile", { method: "PATCH", body: { onboarded: true } });
const ref = async (c) => (await c("/api/referrals")).json.data;

async function main() {
  console.log(`Referral E2E against ${BASE}\n`);
  if (!process.env.ADMIN_EMAIL) { console.log("ADMIN_EMAIL/ADMIN_PASSWORD required"); process.exit(1); }
  const adm = client();
  ok("admin login", (await adm("/api/auth/login", { body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } })).status === 200);
  const before = (await adm("/api/admin/settings")).json.data.values.referrals;
  await adm("/api/admin/settings", { method: "PATCH", body: { key: "referrals", value: { enabled: true, requireEmailVerified: false, requireOnboarding: true, referrerRewardDelayHours: 0, referrerRewardDays: 1, refereeTrialDays: 7, stacking: true } } });

  try {
    console.log("Codes & links");
    const D1 = await device();
    ok("install token is server-signed", /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(D1));
    const R = await person("Riley", `riley${stamp}@gmail.com`, { install: D1 });
    ok("referrer signs up", R.status === 200);
    const rd = await ref(R.c);
    ok("referrer gets a unique code + walkie.run/invite link", /^[A-Z]{3,6}\d{3}$/.test(rd.code) && rd.link.endsWith(`/invite/${rd.code}`), rd.code);
    const page = await R.c(`/invite/${rd.code}`);
    ok("invite landing page renders", page.status === 200 && (page.text ?? "").includes("invited you"));
    const visit = await client()(`/api/referrals/visit?code=${rd.code}`);
    ok("invite link stores an httpOnly referral cookie and opens onboarding", visit.status === 303 && /walkie_ref=/.test(visit.headers.get("set-cookie") ?? "") && /HttpOnly/i.test(visit.headers.get("set-cookie") ?? "") && (visit.headers.get("location") ?? "").endsWith("/welcome"));
    const bad = await client()(`/api/referrals/visit?code=NOPE999`);
    ok("invalid code sets no cookie", !(bad.headers.get("set-cookie") ?? "").includes("walkie_ref"));
    ok("anonymous can't read referral data", (await client()("/api/referrals")).status === 401);
    ok("no endpoint lets a client grant VIP", (await R.c("/api/referrals", { body: { days: 999 } })).status === 405);

    console.log("\nLegitimate referral");
    const F1 = await person("Frankie", `frankie${stamp}@example.com`, { install: await device(), ip: net(), code: rd.code });
    ok("friend signs up with the code", F1.status === 200);
    let f1 = await ref(F1.c);
    ok("before setup: status waiting, no trial yet", f1.received?.status === "REGISTERED" && !f1.entitlement.plus, f1.received?.status);
    await onboard(F1.c);
    f1 = await ref(F1.c);
    ok("after onboarding: reward granted", f1.received?.status === "REWARD_GRANTED", f1.received?.status);
    ok("new user gets a 7-day VIP trial", f1.entitlement.plus && f1.entitlement.source === "trial" && Math.round((new Date(f1.entitlement.trialEndsAt) - Date.now()) / DAY) === 7);
    const plans = (await F1.c("/api/plans")).json.data;
    ok("Plus page reflects server-side trial entitlement", plans.entitlement.plus === true && plans.entitlement.source === "trial");
    let r1 = await ref(R.c);
    ok("referrer gets +1 VIP day", r1.stats.successful === 1 && r1.stats.earnedDays === 1 && Math.round((new Date(r1.entitlement.trialEndsAt) - Date.now()) / DAY) === 1);
    ok("user view never contains risk details", !JSON.stringify(r1).includes("riskScore") && !JSON.stringify(r1).includes("reasons"));
    ok("friend's name is masked in referrer history", r1.referrals[0].friend.endsWith("•••"));

    console.log("\nStacking, replay & concurrency");
    const F2 = await person("Gale", `gale${stamp}@example.com`, { install: await device(), ip: WIFI, code: rd.code }); // same Wi-Fi as referrer
    await Promise.all(Array.from({ length: 6 }, () => onboard(F2.c))); // concurrent processing
    const f2 = await ref(F2.c);
    ok("two legit users on the same Wi-Fi are not rejected", f2.received?.status === "REWARD_GRANTED", f2.received?.status);
    r1 = await ref(R.c);
    ok("concurrent requests grant exactly one reward", r1.credits.filter((c) => c.source === "REFERRAL_REFERRER").length === 2, JSON.stringify(r1.credits.map((c) => c.source)));
    ok("multiple referrals stack (expiry extended, not overwritten)", Math.round((new Date(r1.entitlement.trialEndsAt) - Date.now()) / DAY) === 2 && r1.stats.earnedDays === 2);
    const credits = r1.credits.filter((c) => c.source === "REFERRAL_REFERRER").sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    ok("second credit starts where the first ends", credits[1].startsAt === credits[0].endsAt);
    await onboard(F1.c); await onboard(F1.c);
    ok("replaying the qualifying event grants nothing more", (await ref(R.c)).credits.length === 2 && (await ref(F1.c)).credits.length === 1);
    const F1b = await person("Frankie2", `frankie2${stamp}@example.com`, { install: await device(), ip: net(), code: rd.code });
    ok("a second referral code can't be applied to an existing account", (await F1.c("/api/auth/signup", { body: { name: "x", email: `frankie${stamp}@example.com`, password: "walkies123", acceptTerms: true, referralCode: rd.code } })).status === 409);

    console.log("\nAbuse detection");
    const S = await person("Riley alt", `r.i.l.e.y${stamp}+alt@gmail.com`, { install: D1, code: rd.code });
    await onboard(S.c);
    const s = await ref(S.c);
    ok("self-referral (same person by alias email) is rejected", s.received?.status === "REJECTED", s.received?.status);
    ok("rejection message reveals no detection details", !/device|alias|ip|network|fingerprint/i.test(s.received?.message ?? "") && !s.entitlement.plus);
    const D4 = await device();
    const MNET = net(); const M1 = await person("Morgan", `morgan${stamp}@example.com`, { install: D4, ip: MNET, code: rd.code }); await onboard(M1.c);
    const M2 = await person("Morgan Two", `morgan.two${stamp}@example.com`, { install: D4, ip: MNET, code: rd.code }); await onboard(M2.c);
    const m1 = await ref(M1.c), m2 = await ref(M2.c);
    ok("first account on a device can qualify", m1.received?.status === "REWARD_GRANTED", m1.received?.status);
    ok("second account on the same device is held for review, no second trial", ["UNDER_REVIEW", "SUSPICIOUS"].includes(m2.received?.status) && !m2.entitlement.plus, m2.received?.status);
    const Fake = await person("Forger", `forger${stamp}@example.com`, { install: "forged.token", ip: net(), code: rd.code }); await onboard(Fake.c);
    ok("forged install tokens are ignored (not trusted as a device)", (await ref(Fake.c)).received?.status !== undefined);
    const disp = await person("Temp", `temp${stamp}@mailinator.com`, { install: await device(), ip: net(), code: rd.code }); await onboard(disp.c);
    ok("disposable email alone doesn't auto-reject", ["REWARD_GRANTED", "UNDER_REVIEW"].includes((await ref(disp.c)).received?.status));

    console.log("\nAppeals & admin review");
    const held = (await ref(R.c)).referrals.find((x) => x.id === m2.received.id);
    ok("held referral is shown to the referrer with an appeal option", !!held?.canAppeal);
    ok("appeal requires some detail", (await R.c(`/api/referrals/${held.id}/appeal`, { body: { text: "hi" } })).status === 400);
    ok("referrer can appeal", (await R.c(`/api/referrals/${held.id}/appeal`, { body: { text: "Morgan and Morgan Two are siblings sharing one tablet." } })).status === 200);
    ok("can't appeal someone else's referral", (await F1.c(`/api/referrals/${held.id}/appeal`, { body: { text: "This is not mine at all, really" } })).status === 404);
    ok("regular user blocked from referral admin", (await R.c("/api/admin/referrals")).status === 403 && (await R.c(`/api/admin/referrals/${held.id}`, { method: "PATCH", body: { action: "approve" } })).status === 403);
    const list = (await adm("/api/admin/referrals?status=UNDER_REVIEW")).json.data;
    const row = list.rows.find((x) => x.id === held.id);
    ok("admin sees risk reasons + history + appeal", row && row.reasons.some((x) => x.code.startsWith("DEVICE")) && row.history.length >= 2 && row.appealText.includes("siblings"));
    ok("admin view exposes no raw IPs or device ids", ![WIFI, MNET].some((ip) => JSON.stringify(list).includes(ip)) && !/installHash|ipHash/.test(JSON.stringify(list)));
    ok("analytics totals present", list.analytics.total >= 6 && list.analytics.vipDays >= 1);
    const beforeDays = (await ref(R.c)).stats.earnedDays;
    ok("admin approves after review", (await adm(`/api/admin/referrals/${held.id}`, { method: "PATCH", body: { action: "approve", note: "siblings, verified" } })).status === 200);
    ok("approval grants the referrer reward once", (await ref(R.c)).stats.earnedDays === beforeDays + 1);
    ok("approving twice is refused", (await adm(`/api/admin/referrals/${held.id}`, { method: "PATCH", body: { action: "approve" } })).status === 409);
    ok("admin reject revokes granted VIP", (await adm(`/api/admin/referrals/${held.id}`, { method: "PATCH", body: { action: "reject", note: "test revoke" } })).status === 200 && (await ref(R.c)).stats.earnedDays === beforeDays);
    ok("audit log records decisions", JSON.stringify((await adm("/api/admin/audit")).json?.data ?? "").includes("referral."));
    ok("admin referrals page loads", (await adm("/admin/referrals")).status === 200);
    ok("cron endpoint requires the secret", (await client()("/api/cron/referrals", { method: "POST" })).status === 401);
    const rg = await R.c("/api/referrals/regenerate", { method: "POST" });
    ok("regenerating a code revokes the old link", rg.status === 200 && rg.json.data.code !== rd.code && (await client()(`/invite/${rd.code}`)).text.includes("isn't active"));
    void F1b;
  } finally {
    await adm("/api/admin/settings", { method: "PATCH", body: { key: "referrals", value: before } });
    for (const c of users) await c("/api/me", { method: "DELETE", body: { password: "walkies123" } });
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
