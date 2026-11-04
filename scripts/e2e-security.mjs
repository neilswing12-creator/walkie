#!/usr/bin/env node
/**
 * Authorized security & payment tests — tries to break Walkie the way an attacker would.
 * Run against a PRODUCTION build started with TEST secrets (never real keys), e.g.:
 *   STRIPE_WEBHOOK_SECRET=whsec_e2e PAYMONGO_SECRET_KEY=sk_test_e2e PAYMONGO_WEBHOOK_SECRET=whsk_e2e \
 *   PAYMONGO_API_BASE=http://127.0.0.1:3900 REVENUECAT_WEBHOOK_AUTH=rc_e2e PORT=3200 npx next start -p 3200
 *   E2E_BASE=http://localhost:3200 ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/e2e-security.mjs
 * Starts its own PayMongo mock on :3900. ADMIN_EMAIL must be an OWNER.
 */
import http from "node:http";
import { createHmac, createHash, randomBytes } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.E2E_BASE ?? "http://localhost:3200";
const db = new PrismaClient();
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; console.log(`  ✔ ${name}`); } else { fail++; console.log(`  ✘ ${name} ${extra}`); } };
const stamp = Date.now(); const clients = [];
let ipN = 1; const net = `${30 + Math.floor(Math.random() * 150)}.${Math.floor(Math.random() * 250)}`;
function client() {
  let cookie = ""; const ip = `${net}.${Math.floor(ipN / 250)}.${ipN++ % 250}`;
  const c = async (p, { method, body, headers = {}, raw, form } = {}) => {
    const res = await fetch(BASE + p, { method: method ?? (body || raw || form ? "POST" : "GET"), redirect: "manual",
      headers: { origin: BASE, "x-forwarded-for": ip, ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...headers },
      body: form ?? raw ?? (body ? JSON.stringify(body) : undefined) });
    const set = res.headers.get("set-cookie"); if (set) { const m = set.match(/walkie_session=([^;]*)/); if (m) cookie = m[1] ? `walkie_session=${m[1]}` : ""; }
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, headers: res.headers };
  };
  c.cookie = () => cookie; c.setCookie = (v) => { cookie = v; };
  clients.push(c); return c;
}
async function person(name, password = "walkies123") {
  const c = client(); const email = `sec${name.toLowerCase()}${stamp}@example.com`;
  const r = await c("/api/auth/signup", { body: { name, email, password, acceptTerms: true, timezone: "UTC" } });
  if (r.status !== 200) throw new Error(`signup ${name}: ${r.status} ${r.text}`);
  await c("/api/me/profile", { method: "PATCH", body: { onboarded: true } });
  const me = (await c("/api/me")).json.data;
  return { c, email, password, id: me.user.id };
}
const track = (n, t0) => Array.from({ length: n }, (_, i) => [14.55 + (i * 10) / 111195, 121.02, t0 + i * 5000, 5, 20]);

/* ── PayMongo mock (stands in for api.paymongo.com) ── */
const pm = { sessions: new Map(), lastCreate: null, n: 0 };
const mock = http.createServer((req, res) => {
  let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => {
    const authOk = req.headers.authorization === `Basic ${Buffer.from("sk_test_e2e:").toString("base64")}`;
    if (!authOk) { res.writeHead(401); return res.end("{}"); }
    if (req.method === "POST" && req.url === "/checkout_sessions") {
      const a = JSON.parse(b).data.attributes; pm.lastCreate = a; const id = `cs_e2e_${++pm.n}`;
      pm.sessions.set(id, { reference_number: a.reference_number, amount: a.line_items[0].amount, payments: [] });
      res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ data: { id, attributes: { checkout_url: `https://checkout.paymongo.com/${id}` } } }));
    }
    const m = req.url.match(/^\/checkout_sessions\/(.+)$/);
    if (req.method === "GET" && m && pm.sessions.has(m[1])) { const s = pm.sessions.get(m[1]); res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ data: { id: m[1], attributes: { reference_number: s.reference_number, payments: s.payments } } })); }
    res.writeHead(404); res.end("{}");
  });
});
const pmSign = (raw, { live = true, ts = Math.floor(Date.now() / 1000), secret = "whsk_e2e" } = {}) => { const sig = createHmac("sha256", secret).update(`${ts}.${raw}`).digest("hex"); return `t=${ts},te=${live ? "" : sig},li=${live ? sig : ""}`; };
const pmEvent = (type, obj, live = true) => JSON.stringify({ data: { id: `evt_${randomBytes(6).toString("hex")}`, type: "event", attributes: { type, livemode: live, data: obj } } });
const stripeSign = (raw, ts = Math.floor(Date.now() / 1000)) => `t=${ts},v1=${createHmac("sha256", "whsec_e2e").update(`${ts}.${raw}`).digest("hex")}`;

async function main() {
  await new Promise((r) => mock.listen(3900, "127.0.0.1", r));
  console.log(`Security & payments against ${BASE}\n`);
  const anon = client();
  const owner = client();
  ok("owner signs in", (await owner("/api/auth/login", { body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } })).status === 200);
  const A = await person("Alice"), B = await person("Bob"), C = await person("Cara");

  console.log("Transport & headers");
  const home = await anon("/");
  const csp = home.headers.get("content-security-policy") ?? "";
  ok("CSP blocks framing, plugins and foreign forms", csp.includes("frame-ancestors 'none'") && csp.includes("object-src 'none'") && csp.includes("form-action 'self'") && !csp.includes("unsafe-eval"));
  ok("HSTS, nosniff, X-Frame-Options, COOP set; no X-Powered-By", !!home.headers.get("strict-transport-security") && home.headers.get("x-content-type-options") === "nosniff" && home.headers.get("x-frame-options") === "DENY" && home.headers.get("cross-origin-opener-policy") === "same-origin" && !home.headers.get("x-powered-by"));
  const bundle = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = path.join(d, f); statSync(p).isDirectory() ? walk(p) : bundle.push(p); } }; walk(".next/static");
  const leaks = bundle.filter((f) => /\.(js|css|json)$/.test(f) && /sk_(live|test)_|whsec_|whsk_|PAYMONGO_SECRET|STRIPE_SECRET|DATABASE_URL|passwordHash|SIGNAL_SECRET|CRON_SECRET|RESEND_API_KEY/.test(readFileSync(f, "utf8")));
  ok("client bundles contain no secrets or secret names", leaks.length === 0, leaks.slice(0, 3).join(", "));
  ok("dotfiles / env not served", (await anon("/.env")).status === 404 && (await anon("/..%2f.env")).status >= 400 && (await anon("/.git/config")).status === 404);

  console.log("\nAuthentication");
  const wrongPw = await anon("/api/auth/login", { body: { email: A.email, password: "nope12345" } });
  const noUser = await anon("/api/auth/login", { body: { email: `ghost${stamp}@example.com`, password: "nope12345" } });
  ok("same response for wrong password and unknown email (no enumeration)", wrongPw.status === 401 && noUser.status === 401 && wrongPw.json.error.message === noUser.json.error.message);
  ok("forgot-password never reveals accounts", (await anon("/api/auth/forgot", { body: { email: A.email } })).text === (await anon("/api/auth/forgot", { body: { email: `ghost${stamp}@example.com` } })).text);
  const brute = client(); let last;
  for (let i = 0; i < 9; i++) last = await brute("/api/auth/login", { body: { email: C.email, password: `guess${i}x1` } });
  ok("brute force on one account is rate-limited", last.status === 429);
  ok("cross-site POST blocked (CSRF)", (await A.c("/api/daily-reward/claim", { method: "POST", headers: { origin: "https://evil.example" } })).status === 403);
  ok("requests without Origin rejected in production", (await fetch(BASE + "/api/daily-reward/claim", { method: "POST", headers: { cookie: A.c.cookie() } })).status === 403);
  ok("session cookie is HttpOnly + SameSite", /HttpOnly/i.test((await client()("/api/auth/login", { body: { email: A.email, password: A.password } })).headers.get("set-cookie") ?? "") && /SameSite=lax/i.test((await client()("/api/auth/login", { body: { email: A.email, password: A.password } })).headers.get("set-cookie") ?? ""));
  ok("forged / random session token rejected", (await (async () => { const f = client(); f.setCookie(`walkie_session=${randomBytes(32).toString("base64url")}`); return (await f("/api/me")).status; })()) === 401);
  const me = (await A.c("/api/me")).json.data;
  ok("API never returns password hashes", !JSON.stringify(me).includes("passwordHash") && !JSON.stringify(me).includes("$2"));
  // password change signs out other devices
  const A2 = client(); await A2("/api/auth/login", { body: { email: A.email, password: A.password } });
  ok("second device signed in", (await A2("/api/me")).status === 200);
  ok("password change needs the current password", (await A.c("/api/me/password", { body: { current: "wrong", next: "newpass123" } })).status === 401);
  await A.c("/api/me/password", { body: { current: A.password, next: "newpass123" } }); A.password = "newpass123";
  ok("password change revokes other sessions, keeps this one", (await A2("/api/me")).status === 401 && (await A.c("/api/me")).status === 200);
  // reset tokens: single use, expiring, revoke sessions
  const tok = randomBytes(32).toString("base64url");
  await db.verificationToken.create({ data: { userId: B.id, type: "PASSWORD_RESET", tokenHash: createHash("sha256").update(tok).digest("hex"), expiresAt: new Date(Date.now() + 3600000) } });
  ok("reset token works once", (await anon("/api/auth/reset", { body: { token: tok, password: "resetpass123" } })).status === 200);
  ok("reset token can't be reused", (await anon("/api/auth/reset", { body: { token: tok, password: "another123x" } })).status === 400);
  ok("reset signs out all sessions", (await B.c("/api/me")).status === 401);
  await B.c("/api/auth/login", { body: { email: B.email, password: "resetpass123" } }); B.password = "resetpass123";
  const old = randomBytes(32).toString("base64url");
  await db.verificationToken.create({ data: { userId: B.id, type: "PASSWORD_RESET", tokenHash: createHash("sha256").update(old).digest("hex"), expiresAt: new Date(Date.now() - 1000) } });
  ok("expired reset token rejected", (await anon("/api/auth/reset", { body: { token: old, password: "expired123x" } })).status === 400);
  ok("wrong token type rejected", (await (async () => { const t = randomBytes(32).toString("base64url"); await db.verificationToken.create({ data: { userId: B.id, type: "EMAIL_VERIFY", tokenHash: createHash("sha256").update(t).digest("hex"), expiresAt: new Date(Date.now() + 3600000) } }); return (await anon("/api/auth/reset", { body: { token: t, password: "typemix123x" } })).status; })()) === 400);
  const sess = await A.c("/api/me/sessions");
  ok("session list exposes no tokens", sess.status === 200 && !JSON.stringify(sess.json).match(/token|hash/i));
  ok("account deletion requires the password", (await C.c("/api/me", { method: "DELETE", body: { password: "wrong" } })).status === 401);

  console.log("\nAccess control (IDOR & mass assignment)");
  const t0 = Date.now() - 3 * 3600000;
  const act = (await A.c("/api/activities", { body: { clientId: `sec${stamp}a`, type: "OUTDOOR_WALK", startedAt: new Date(t0).toISOString(), endedAt: new Date(t0 + 600000).toISOString(), movingSec: 600, points: track(121, t0), coinsAwarded: 99999, xpAwarded: 99999, status: "COMPLETED", userId: B.id } })).json.data.activity;
  ok("client-supplied rewards/owner ignored on activities", act.coinsAwarded < 1000 && act.points <= 200);
  ok("other users' activities: read/edit/delete/share → 404", (await B.c(`/api/activities/${act.id}`)).status === 404 && (await B.c(`/api/activities/${act.id}`, { method: "PATCH", body: { title: "pwned" } })).status === 404 && (await B.c(`/api/activities/${act.id}`, { method: "DELETE" })).status === 404 && (await B.c(`/api/activities/${act.id}/share`, { body: {} })).status === 404);
  const aPet = (await A.c("/api/pets")).json.data;
  const aPetId = (aPet.owned ?? aPet.pets ?? aPet).find?.((p) => p.owned)?.owned?.id ?? (await db.pet.findFirst({ where: { userId: A.id } })).id;
  ok("other users' pets: view/rename/equip/act → blocked", (await B.c(`/api/pets/${aPetId}`)).status === 404 && (await B.c(`/api/pets/${aPetId}`, { method: "PATCH", body: { nickname: "pwned" } })).status === 404 && (await B.c(`/api/pets/${aPetId}/equip`, { body: { slot: "HEAD", itemId: null } })).status === 404 && (await B.c(`/api/pets/${aPetId}/action`, { body: { action: "pet" } })).status >= 400);
  const look = (await A.c("/api/wardrobe/looks", { body: { name: "mine" } })).json.data;
  ok("other users' saved looks → 404", (await B.c(`/api/wardrobe/looks/${look.id}`, { method: "POST" })).status === 404);
  await B.c(`/api/wardrobe/looks/${look.id}`, { method: "DELETE" });
  ok("…and can't be deleted by them", !!(await db.savedLook.findUnique({ where: { id: look.id } })));
  await A.c("/api/me/profile", { method: "PATCH", body: { role: "OWNER", status: "ACTIVE", emailVerified: new Date().toISOString(), userId: B.id, passwordHash: "x", leaderboardOptIn: true } });
  const aNow = await db.user.findUnique({ where: { id: A.id } });
  ok("mass assignment on profile can't touch role/status/password", aNow.role === "USER" && aNow.passwordHash.startsWith("$2"));
  ok("can't equip items you don't own (inventory forgery)", (await A.c("/api/wardrobe/outfit", { body: { set: { HEAD: "acc_crown" } } })).status === 403);
  ok("reward-only items can't be bought", (await A.c("/api/shop/buy", { body: { itemId: (await db.item.findUnique({ where: { key: "acc_laurel" } })).id } })).status === 403);
  ok("price can't be overridden by the client", await (async () => { const it = await db.item.findUnique({ where: { key: "toy_ball" } }); const before = (await A.c("/api/me")).json.data.wallet.coins; await A.c("/api/shop/buy", { body: { itemId: it.id, priceCoins: 0, quantity: 1 } }); return before - (await A.c("/api/me")).json.data.wallet.coins === it.priceCoins; })());
  const vipBefore = (await A.c("/api/plans")).json.data.entitlement.plus;
  await A.c("/api/me/profile", { method: "PATCH", body: { plus: true, trialEndsAt: "2099-01-01", vip: true } });
  ok("VIP can't be granted or extended from the client", vipBefore === false && (await A.c("/api/plans")).json.data.entitlement.plus === false);
  ok("oversized JSON bodies refused before validation", (await A.c("/api/activities", { raw: JSON.stringify({ x: "a".repeat(3 * 1024 * 1024) }), headers: { "content-type": "application/json" } })).status === 413);
  ok("injection-style input is just data", (await anon("/api/auth/login", { body: { email: "' OR 1=1 --@x.com", password: "x" } })).status === 400 && (await owner(`/api/admin/users?q=${encodeURIComponent("%' OR '1'='1")}`)).status === 200);
  await A.c("/api/me/profile", { method: "PATCH", body: { name: "<script>alert(1)</script>" } });
  const sh = (await A.c(`/api/activities/${act.id}/share`, { body: { showName: true } })).json?.data;
  const pub = sh?.url ? await anon(new URL(sh.url).pathname) : null;
  ok("stored XSS is escaped on public pages", !pub || (!pub.text.includes("<script>alert(1)</script>") && pub.text.includes("&lt;script&gt;") || !pub.text.includes("alert(1)")), pub?.status);

  console.log("\nUploads");
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), randomBytes(64)]);
  const up = (name, buf, type) => { const f = new FormData(); f.append("file", new Blob([buf], { type }), name); return A.c("/api/me/avatar", { form: f }); };
  const u1 = await up("../../../../etc/evil.png", png, "image/png");
  ok("path traversal in filenames ignored (random server name)", u1.status === 200 && /^\/uploads\/avatars\/[A-Za-z0-9_-]{16}\.png$/.test(u1.json.data.url), u1.json?.data?.url);
  ok("SVG (script-capable) rejected even if labelled PNG", (await up("x.png", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'), "image/png")).status === 415);
  ok("HTML/executable disguised as image rejected", (await up("x.jpg", Buffer.from("<html><script>alert(1)</script>"), "image/jpeg")).status === 415 && (await up("x.png", Buffer.from("MZ\x90\x00" + "x".repeat(40)), "image/png")).status === 415);
  ok("oversized upload rejected", (await up("big.png", Buffer.concat([png, Buffer.alloc(2.5 * 1024 * 1024)]), "image/png")).status === 413);
  ok("staff-only upload endpoint blocked for users", (await (async () => { const f = new FormData(); f.append("file", new Blob([png], { type: "image/png" }), "x.png"); return (await A.c("/api/admin/upload", { form: f })).status; })()) === 403);

  console.log("\nPrivilege escalation & admin");
  ok("users can't reach admin APIs", (await A.c("/api/admin/stats")).status === 403 && (await A.c(`/api/admin/users/${B.id}`, { method: "PATCH", body: { role: "ADMIN" } })).status === 403 && (await A.c(`/api/admin/users/${A.id}/coins`, { body: { amount: 5000, reason: "free money" } })).status === 403);
  ok("role change requires step-up (owner's password)", (await owner(`/api/admin/users/${B.id}`, { method: "PATCH", body: { role: "ADMIN" } })).status === 401);
  ok("owner can grant admin with password", (await owner(`/api/admin/users/${B.id}`, { method: "PATCH", body: { role: "ADMIN", confirmPassword: process.env.ADMIN_PASSWORD } })).status === 200);
  await B.c("/api/auth/login", { body: { email: B.email, password: B.password } });
  ok("admins can't mint admins or owners", (await B.c(`/api/admin/users/${C.id}`, { method: "PATCH", body: { role: "ADMIN", confirmPassword: B.password } })).status === 403 && (await B.c(`/api/admin/users/${C.id}`, { method: "PATCH", body: { role: "OWNER", confirmPassword: B.password } })).status === 403);
  ok("admins can't change the owner", (await B.c(`/api/admin/users/${(await db.user.findFirst({ where: { role: "OWNER" } })).id}`, { method: "PATCH", body: { status: "BANNED", reason: "x", confirmPassword: B.password } })).status === 403);
  ok("admins can assign moderator (with password)", (await B.c(`/api/admin/users/${C.id}`, { method: "PATCH", body: { role: "MODERATOR", confirmPassword: B.password } })).status === 200);
  ok("staff can't adjust their own balance", (await B.c(`/api/admin/users/${B.id}/coins`, { body: { amount: 100000, reason: "self", confirmPassword: B.password } })).status === 403);
  ok("coin adjustments need the password", (await B.c(`/api/admin/users/${C.id}/coins`, { body: { amount: 10, reason: "test" } })).status === 401);
  ok("moderators can't change roles", (await C.c(`/api/admin/users/${A.id}`, { method: "PATCH", body: { role: "MODERATOR" } })).status === 403);
  await db.session.updateMany({ where: { userId: B.id }, data: { createdAt: new Date(Date.now() - 13 * 3600000) } });
  ok("stale staff sessions must sign in again for admin tools", (await B.c("/api/admin/stats")).json?.error?.code === "reauth_required");
  ok("…but stale sessions still work as a normal member", (await B.c("/api/me")).status === 200);
  await owner(`/api/admin/users/${B.id}`, { method: "PATCH", body: { role: "USER", confirmPassword: process.env.ADMIN_PASSWORD } });
  ok("demotion signs the user out everywhere", (await B.c("/api/me")).status === 401);
  ok("role changes are audit-logged (without passwords)", await (async () => { const a = await db.auditLog.findMany({ where: { targetId: B.id, action: "user.role" } }); return a.length >= 2 && !JSON.stringify(a).includes(process.env.ADMIN_PASSWORD); })());

  console.log("\nPayments — PayMongo (GCash / Maya / cards)");
  await B.c("/api/auth/login", { body: { email: B.email, password: B.password } });
  const pl = (await A.c("/api/plans")).json.data;
  ok("PayMongo offered with server-side PHP prices", pl.providers.paymongo === true && pl.plans.find((p) => p.key === "plus_monthly")?.paymongoAmount > 0);
  const co = await A.c("/api/billing/paymongo", { body: { planKey: "plus_monthly", amount: 1, currency: "USD", days: 9999 } });
  const order = await db.paymentOrder.findFirst({ where: { userId: A.id }, orderBy: { createdAt: "desc" } });
  ok("checkout created; client amount/currency/days ignored", co.status === 200 && co.json.data.url.startsWith("https://checkout.paymongo.com/") && pm.lastCreate.line_items[0].amount === order.amount && order.amount === 24900 && order.currency === "PHP" && order.days === 30 && pm.lastCreate.reference_number === order.id);
  ok("success redirect alone grants nothing", (await A.c("/app/plus?status=success&provider=paymongo")).status === 200 && (await A.c("/api/plans")).json.data.entitlement.plus === false);
  const sess1 = order.providerRef; const sessObj = { id: sess1, attributes: { reference_number: order.id, status: "paid" } };
  const evPaid = pmEvent("checkout_session.payment.paid", sessObj);
  ok("unsigned webhook rejected", (await anon("/api/webhooks/paymongo", { raw: evPaid, headers: { "content-type": "application/json" } })).status === 400);
  ok("webhook signed with the wrong secret rejected", (await anon("/api/webhooks/paymongo", { raw: evPaid, headers: { "content-type": "application/json", "paymongo-signature": pmSign(evPaid, { secret: "guess" }) } })).status === 400);
  ok("replayed (old timestamp) webhook rejected", (await anon("/api/webhooks/paymongo", { raw: evPaid, headers: { "content-type": "application/json", "paymongo-signature": pmSign(evPaid, { ts: Math.floor(Date.now() / 1000) - 3600 }) } })).status === 400);
  pm.sessions.get(sess1).payments = [{ id: "pay_e2e_low", attributes: { amount: 100, currency: "PHP", status: "paid" } }];
  await anon("/api/webhooks/paymongo", { raw: evPaid, headers: { "content-type": "application/json", "paymongo-signature": pmSign(evPaid) } });
  ok("underpaid checkout (amount mismatch) grants nothing", (await A.c("/api/plans")).json.data.entitlement.plus === false && (await db.paymentOrder.findUnique({ where: { id: order.id } })).status === "PENDING");
  const testEv = pmEvent("checkout_session.payment.paid", sessObj, false);
  pm.sessions.get(sess1).payments = [{ id: "pay_e2e_ok", attributes: { amount: 24900, currency: "PHP", status: "paid" } }];
  await anon("/api/webhooks/paymongo", { raw: testEv, headers: { "content-type": "application/json", "paymongo-signature": pmSign(testEv, { live: false }) } });
  ok("test-mode payments never unlock Plus in production", (await A.c("/api/plans")).json.data.entitlement.plus === false);
  const ev2 = pmEvent("checkout_session.payment.paid", sessObj);
  ok("verified payment unlocks Plus", (await anon("/api/webhooks/paymongo", { raw: ev2, headers: { "content-type": "application/json", "paymongo-signature": pmSign(ev2) } })).status === 200 && (await A.c("/api/plans")).json.data.entitlement.plus === true);
  const sub1 = await db.subscription.findUnique({ where: { providerSubscriptionId: `pm:${order.id}` } });
  ok("30-day pass recorded", sub1 && Math.round((sub1.currentPeriodEnd - Date.now()) / 86400000) === 30);
  await anon("/api/webhooks/paymongo", { raw: ev2, headers: { "content-type": "application/json", "paymongo-signature": pmSign(ev2) } });
  const ev3 = pmEvent("checkout_session.payment.paid", sessObj);
  await anon("/api/webhooks/paymongo", { raw: ev3, headers: { "content-type": "application/json", "paymongo-signature": pmSign(ev3) } });
  ok("replays / duplicate deliveries never extend the pass", (await db.subscription.count({ where: { userId: A.id, provider: "PAYMONGO" } })) === 1);
  // someone else's paid session can't be redeemed for my order
  await B.c("/api/billing/paymongo", { body: { planKey: "plus_monthly" } });
  const bOrder = await db.paymentOrder.findFirst({ where: { userId: B.id }, orderBy: { createdAt: "desc" } });
  const cross = pmEvent("checkout_session.payment.paid", { id: sess1, attributes: { reference_number: bOrder.id } });
  await anon("/api/webhooks/paymongo", { raw: cross, headers: { "content-type": "application/json", "paymongo-signature": pmSign(cross) } });
  ok("another user's paid session can't unlock my order", (await B.c("/api/plans")).json.data.entitlement.plus === false);
  // stacking
  await A.c("/api/billing/paymongo", { body: { planKey: "plus_monthly" } });
  const order2 = await db.paymentOrder.findFirst({ where: { userId: A.id, status: "PENDING" }, orderBy: { createdAt: "desc" } });
  pm.sessions.get(order2.providerRef).payments = [{ id: "pay_e2e_2", attributes: { amount: 24900, currency: "PHP", status: "paid" } }];
  const ev4 = pmEvent("checkout_session.payment.paid", { id: order2.providerRef, attributes: { reference_number: order2.id } });
  await anon("/api/webhooks/paymongo", { raw: ev4, headers: { "content-type": "application/json", "paymongo-signature": pmSign(ev4) } });
  const sub2 = await db.subscription.findUnique({ where: { providerSubscriptionId: `pm:${order2.id}` } });
  ok("a second pass stacks after the first (no overwrite)", sub2 && Math.round((sub2.currentPeriodEnd - Date.now()) / 86400000) === 60);
  for (const pid of ["pay_e2e_ok", "pay_e2e_2"]) { const r = pmEvent("payment.refunded", { id: pid, attributes: { amount: 24900, amount_refunded: 24900 } }); await anon("/api/webhooks/paymongo", { raw: r, headers: { "content-type": "application/json", "paymongo-signature": pmSign(r) } }); }
  ok("refunds revoke Plus", (await A.c("/api/plans")).json.data.entitlement.plus === false);
  ok("payment events are recorded for reconciliation", (await db.paymentEvent.count({ where: { provider: "PAYMONGO", userId: A.id } })) >= 3);

  console.log("\nPayments — Stripe & RevenueCat");
  const subObj = (status, created) => JSON.stringify({ id: `evt_${randomBytes(6).toString("hex")}`, type: status === "deleted" ? "customer.subscription.deleted" : "customer.subscription.updated", created, data: { object: { id: `sub_e2e_${stamp}`, customer: `cus_e2e_${stamp}`, status: status === "deleted" ? "canceled" : "active", cancel_at_period_end: false, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, metadata: { userId: C.id } } } });
  const s1 = subObj("active", Math.floor(Date.now() / 1000) - 300);
  ok("Stripe webhook without a valid signature rejected", (await anon("/api/webhooks/stripe", { raw: s1, headers: { "stripe-signature": "t=1,v1=deadbeef" } })).status === 400);
  await anon("/api/webhooks/stripe", { raw: s1, headers: { "stripe-signature": stripeSign(s1) } });
  ok("signed Stripe subscription unlocks Plus", (await C.c("/api/plans")).json.data.entitlement.plus === true);
  const s2 = subObj("deleted", Math.floor(Date.now() / 1000) - 100);
  await anon("/api/webhooks/stripe", { raw: s2, headers: { "stripe-signature": stripeSign(s2) } });
  const s3 = subObj("active", Math.floor(Date.now() / 1000) - 200); // older event delivered late
  await anon("/api/webhooks/stripe", { raw: s3, headers: { "stripe-signature": stripeSign(s3) } });
  ok("out-of-order old event can't resurrect a canceled subscription", (await C.c("/api/plans")).json.data.entitlement.plus === false);
  const s4 = subObj("active", Math.floor(Date.now() / 1000)); await anon("/api/webhooks/stripe", { raw: s4, headers: { "stripe-signature": stripeSign(s4) } });
  const refund = JSON.stringify({ id: `evt_${randomBytes(6).toString("hex")}`, type: "charge.refunded", created: Math.floor(Date.now() / 1000) + 5, data: { object: { object: "charge", customer: `cus_e2e_${stamp}`, refunded: true, amount_refunded: 499 } } });
  await anon("/api/webhooks/stripe", { raw: refund, headers: { "stripe-signature": stripeSign(refund) } });
  ok("full Stripe refund revokes Plus", (await C.c("/api/plans")).json.data.entitlement.plus === false);
  ok("RevenueCat webhook needs its secret", (await anon("/api/webhooks/revenuecat", { body: { event: { id: "x", type: "INITIAL_PURCHASE", app_user_id: A.id, product_id: "plus" } } })).status === 401);
  ok("fake 'restore purchases' grants nothing", ((await A.c("/api/billing/restore", { method: "POST" })).status !== 200 || (await A.c("/api/plans")).json.data.entitlement.plus === false));


  console.log("\nMaps & Location (provider config)");
  const mc = async (c, platform) => (await c(`/api/maps/config?platform=${platform}`)).json?.data;
  const setMaps = (value) => owner("/api/admin/settings", { method: "PATCH", body: { key: "maps", value } });
  ok("users can't change map settings", (await A.c("/api/admin/settings", { method: "PATCH", body: { key: "maps", value: { web: [] } } })).status === 403 && (await A.c("/api/admin/maps")).status === 403);
  ok("Apple Maps can't be enabled for Android (no SDK exists)", (await setMaps({ android: ["apple"] })).status === 400);
  ok("duplicate providers rejected", (await setMaps({ web: ["open", "open"] })).status === 400);
  await setMaps({ ios: ["apple", "google", "open"], android: ["google", "open"], web: ["google", "open"] });
  const ios = await mc(A.c, "ios"), andr = await mc(A.c, "android"), web = await mc(A.c, "web");
  ok("iOS follows the admin order: Apple → Google → open", ios.providers.map((p) => p.provider).join() === "apple,google,open" && ios.providers[0].ready === true && !!ios.apple);
  ok("unconfigured provider reported (not silently swapped)", ios.providers[1].ready === false && /GOOGLE_MAPS/.test(ios.providers[1].reason) && !ios.google);
  ok("Android never receives Apple Maps", !andr.providers.some((p) => p.provider === "apple") && !andr.apple);
  ok("open maps work without keys", web.providers.find((p) => p.provider === "open")?.ready && web.open.styleUrl.startsWith("https://"));
  const tokRes = await A.c("/api/maps/apple-token?platform=ios");
  const jwt = tokRes.json?.data?.token ?? "";
  const [h64, p64] = jwt.split(".");
  const hdr = h64 ? JSON.parse(Buffer.from(h64, "base64url").toString()) : {}, jp = p64 ? JSON.parse(Buffer.from(p64, "base64url").toString()) : {};
  ok("MapKit token minted server-side: ES256, short-lived, origin-bound", tokRes.status === 200 && hdr.alg === "ES256" && hdr.kid === "MAPKITKEY1" && jp.iss === "TEAMID1234" && jp.exp - jp.iat <= 1800 && typeof jp.origin === "string");
  const { createPublicKey, createVerify } = await import("node:crypto");
  ok("token signature verifies with the MapKit public key", (() => { try { const v = createVerify("SHA256"); v.update(`${h64}.${p64}`); return v.verify({ key: createPublicKey(readFileSync("/tmp/claude-0/mapkit.pub")), dsaEncoding: "ieee-p1363" }, Buffer.from(jwt.split(".")[2], "base64url")); } catch { return false; } })());
  ok("MapKit token refused for platforms where Apple Maps is off", (await A.c("/api/maps/apple-token?platform=web")).status === 403 && (await A.c("/api/maps/apple-token?platform=android")).status === 400);
  ok("anonymous users get no map config or tokens", (await anon("/api/maps/config")).status === 401 && (await anon("/api/maps/apple-token")).status === 401);
  await setMaps({ web: [], ios: [], android: [] });
  ok("maps can be disabled entirely", (await mc(A.c, "web")).providers.length === 0 && (await mc(A.c, "ios")).providers.length === 0);
  await setMaps({ web: ["open"], ios: ["open"], android: ["open"], googleNativeSdk: true });
  console.log("\nLogging hygiene");
  ok("audit/events never store passwords or tokens", await (async () => { const a = JSON.stringify(await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 })) + JSON.stringify(await db.analyticsEvent.findMany({ orderBy: { createdAt: "desc" }, take: 300 })); return !a.includes("walkies123") && !a.includes("resetpass123") && !a.includes(tok); })());

  // cleanup
  for (const c of clients) await c("/api/me", { method: "DELETE", body: { password: "walkies123" } }).catch(() => {});
  for (const u of [A, B, C]) await db.user.delete({ where: { id: u.id } }).catch(() => {});
  await db.$disconnect(); mock.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch(async (e) => { console.error(e); for (const u of await db.user.findMany({ where: { email: { contains: `${stamp}@example.com` } } })) await db.user.delete({ where: { id: u.id } }).catch(() => {}); mock.close(); process.exit(1); });
