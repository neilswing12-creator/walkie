#!/usr/bin/env node
/**
 * End-to-end API checks against a running server (default http://localhost:3000).
 *   npm run dev   (or npm start)   then   npm run test:e2e
 * Creates throwaway users (e2e+<timestamp>@example.com). Requires ADMIN_EMAIL/ADMIN_PASSWORD
 * of an existing admin for the admin section (skipped otherwise).
 */
const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; console.log(`  ✔ ${name}`); } else { fail++; console.log(`  ✘ ${name} ${extra}`); } };

function client() {
  let cookie = "";
  return async (path, { method, body, headers = {}, raw } = {}) => {
    const res = await fetch(BASE + path, {
      method: method ?? (body || raw ? "POST" : "GET"),
      headers: { origin: BASE, ...(body && !raw ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...headers },
      body: raw ?? (body ? JSON.stringify(body) : undefined), redirect: "manual",
    });
    const set = res.headers.get("set-cookie");
    if (set) { const m = set.match(/walkie_session=([^;]*)/); if (m) cookie = m[1] ? `walkie_session=${m[1]}` : ""; }
    let json = null; try { json = await res.clone().json(); } catch {}
    return { status: res.status, json, text: json ? null : await res.text() };
  };
}

function gpsTrack(n, stepM, dtSec, startMsAgo) {
  const t0 = Date.now() - startMsAgo;
  return Array.from({ length: n }, (_, i) => [14.55 + (i * stepM) / 111195, 121.02, t0 + i * dtSec * 1000, 5, 20 + i * 0.2]);
}

async function main() {
  console.log(`E2E against ${BASE}\n`);
  const a = client(), b = client(), anon = client();
  const stamp = Date.now();
  const emailA = `e2e+a${stamp}@example.com`, emailB = `e2e+b${stamp}@example.com`;

  console.log("Auth & security");
  ok("unauthenticated API → 401", (await anon("/api/home")).status === 401);
  ok("weak password rejected", (await a("/api/auth/signup", { body: { name: "A", email: emailA, password: "short", acceptTerms: true } })).status === 400);
  ok("terms must be accepted", (await a("/api/auth/signup", { body: { name: "A", email: emailA, password: "walkies123" } })).status === 400);
  ok("signup works", (await a("/api/auth/signup", { body: { name: "Alex", email: emailA, password: "walkies123", acceptTerms: true, timezone: "Asia/Manila" } })).status === 200);
  ok("duplicate email rejected", (await b("/api/auth/signup", { body: { name: "X", email: emailA, password: "walkies123", acceptTerms: true } })).status === 409);
  ok("signup B", (await b("/api/auth/signup", { body: { name: "Blair", email: emailB, password: "walkies123", acceptTerms: true } })).status === 200);
  ok("cross-site POST blocked (CSRF)", (await a("/api/daily-reward/claim", { method: "POST", headers: { origin: "https://evil.example" } })).status === 403);
  ok("wrong password → 401", (await anon("/api/auth/login", { body: { email: emailA, password: "nope12345" } })).status === 401);
  ok("forgot password never reveals accounts", (await anon("/api/auth/forgot", { body: { email: "nobody@example.com" } })).status === 200);
  ok("non-admin blocked from admin API", (await a("/api/admin/stats")).status === 403);
  const me = await a("/api/me");
  ok("new user gets starter coins + Walkie", me.json?.data?.wallet?.coins === 150);
  ok("password hash never returned", !JSON.stringify(me.json).includes("passwordHash"));

  console.log("\nDaily reward");
  const r1 = await a("/api/daily-reward/claim", { method: "POST" });
  ok("first claim succeeds", r1.status === 200 && r1.json.data.coins === 25);
  const dup = await Promise.all([1, 2, 3].map(() => a("/api/daily-reward/claim", { method: "POST" })));
  ok("repeat / concurrent claims rejected", dup.every((r) => r.status === 409), dup.map((r) => r.status).join(","));

  console.log("\nActivities (server-authoritative)");
  const clientId = `e2e${stamp}walk`;
  const walk = { clientId, type: "OUTDOOR_WALK", startedAt: new Date(Date.now() - 900_000).toISOString(), endedAt: new Date(Date.now() - 300_000).toISOString(), movingSec: 600, points: gpsTrack(121, 10, 5, 900_000) };
  const w1 = await a("/api/activities", { body: walk });
  const act = w1.json?.data?.activity;
  ok("GPS walk saved", w1.status === 200 && act?.status === "COMPLETED", JSON.stringify(w1.json?.error ?? ""));
  ok("distance recomputed from points (~1.2 km)", act && act.distanceM > 1150 && act.distanceM < 1250, act?.distanceM);
  ok("points = 10 moving min × walk rate 10", act?.points === 100, act?.points);
  ok("coins & XP derive from points", act?.coinsAwarded === 20 && act?.xpAwarded === 50, `${act?.coinsAwarded}/${act?.xpAwarded}`);
  const w2 = await a("/api/activities", { body: { ...walk, movingSec: 9999 } });
  ok("retry with same clientId is idempotent", w2.json?.data?.duplicate === true && w2.json.data.activity.id === act.id);
  const car = await a("/api/activities", { body: { ...walk, clientId: `e2e${stamp}car`, points: gpsTrack(121, 4, 1, 900_000), movingSec: 120 } });
  ok("vehicle-speed 'walk' is rejected or flagged with 0 coins", car.json?.data?.activity?.coinsAwarded === 0, JSON.stringify(car.json?.data?.activity));
  const future = await a("/api/activities", { body: { ...walk, clientId: `e2e${stamp}fut`, endedAt: new Date(Date.now() + 3_600_000).toISOString() } });
  ok("future-dated activity rejected", future.status === 400);
  const tread = await a("/api/activities", { body: { clientId: `e2e${stamp}tread`, type: "TREADMILL_RUN", startedAt: new Date(Date.now() - 1_300_000).toISOString(), endedAt: new Date(Date.now() - 100_000).toISOString(), movingSec: 1200, manualDistanceM: 4000 } });
  ok("treadmill with console distance accepted (rate 6 + streak bonus)", tread.json?.data?.activity?.distanceM === 4000 && tread.json.data.activity.points === 122, JSON.stringify(tread.json?.data?.activity?.points));
  const fakeTread = await a("/api/activities", { body: { clientId: `e2e${stamp}tread2`, type: "TREADMILL_RUN", startedAt: new Date(Date.now() - 700_000).toISOString(), endedAt: new Date(Date.now() - 100_000).toISOString(), movingSec: 600, manualDistanceM: 30000 } });
  ok("implausible manual distance earns nothing", fakeTread.json?.data?.activity?.status === "FLAGGED" && fakeTread.json.data.activity.coinsAwarded === 0);
  console.log("\nMulti-sport lifecycle");
  const ride = await a("/api/activities", { body: { clientId: `e2e${stamp}ride`, type: "OUTDOOR_CYCLE", startedAt: new Date(Date.now() - 2_000_000).toISOString(), endedAt: new Date(Date.now() - 190_000).toISOString(), movingSec: 1800, points: gpsTrack(361, 40, 5, 2_000_000) } });
  const rd = ride.json?.data?.activity;
  ok("bike ride at 8 m/s accepted", rd?.status === "COMPLETED" && rd.distanceM > 14000, JSON.stringify(ride.json?.error ?? rd?.flagReason));
  ok("bike earns rate 4/min (+streak bonus)", rd?.points === 122, rd?.points);
  ok("bike reports speed, not pace", rd?.avgSpeedMps > 7 && rd?.avgPaceSecKm == null);
  const sess = await a("/api/activities/sessions", { body: { type: "OUTDOOR_RUN", goal: { kind: "DISTANCE", value: 5 } } });
  ok("start session", sess.status === 200);
  ok("pause session", (await a(`/api/activities/sessions/${sess.json.data.id}`, { method: "PATCH", body: { action: "pause" } })).json?.data?.status === "PAUSED");
  ok("resume session", (await a(`/api/activities/sessions/${sess.json.data.id}`, { method: "PATCH", body: { action: "resume" } })).json?.data?.status === "ACTIVE");
  ok("other users can't touch my session", (await b(`/api/activities/sessions/${sess.json.data.id}`, { method: "PATCH", body: { action: "abandon" } })).status === 404);
  const inflated = await a("/api/activities", { body: { clientId: `e2e${stamp}sess`, sessionId: sess.json.data.id, type: "OUTDOOR_RUN", startedAt: new Date(Date.now() - 3_600_000).toISOString(), endedAt: new Date().toISOString(), movingSec: 3000 } });
  ok("moving time capped by server session (no inflated points)", inflated.json?.data?.activity?.durationSec <= 40 && inflated.json.data.activity.points === 0, JSON.stringify(inflated.json?.data?.activity));
  ok("session can only be finished once (replay blocked)", (await a("/api/activities", { body: { clientId: `e2e${stamp}sess2`, sessionId: sess.json.data.id, type: "OUTDOOR_RUN", startedAt: new Date(Date.now() - 600_000).toISOString(), endedAt: new Date().toISOString(), movingSec: 500 } })).status === 409);
  ok("edit title & note", (await a(`/api/activities/${rd.id}`, { method: "PATCH", body: { title: "Sunset loop", note: "windy" } })).status === 200);
  const share = await a(`/api/activities/${rd.id}/share`, { body: { route: false, name: false, details: true } });
  ok("opt-in share link", share.status === 200 && share.json.data.url.includes("/s/"));
  const pub = await anon(`/s/${share.json.data.shareId}`);
  ok("public share page hides name & route by default", pub.status === 200 && !(pub.text ?? "").includes("Alex") && !(pub.text ?? "").includes("hidden for privacy"));
  const before = (await a("/api/me")).json.data.wallet;
  ok("delete activity", (await a(`/api/activities/${rd.id}`, { method: "DELETE" })).status === 200);
  const afterDel = (await a("/api/me")).json.data.wallet;
  ok("deleting reverses its points & coins", before.coins - afterDel.coins === rd.coinsAwarded && before.xp - afterDel.xp === rd.xpAwarded, `${before.coins}->${afterDel.coins}`);
  const again = await a("/api/activities", { body: { clientId: `e2e${stamp}ride`, type: "OUTDOOR_CYCLE", startedAt: new Date(Date.now() - 2_000_000).toISOString(), endedAt: new Date(Date.now() - 190_000).toISOString(), movingSec: 1800, points: gpsTrack(361, 40, 5, 2_000_000) } });
  ok("re-uploading a deleted activity can't mint rewards again", again.json?.data?.duplicate === true && (await a("/api/me")).json.data.wallet.coins === afterDel.coins);
  ok("deleted share link stops working", (await anon(`/s/${share.json.data.shareId}`)).status === 404);
  const cfgR = (await anon("/api/rewards/config")).json.data;
  ok("public reward config lists rates", cfgR.types.find((t) => t.key === "OUTDOOR_WALK")?.rate === 10 && cfgR.types.find((t) => t.key === "INDOOR_CYCLE")?.rate === 3);

  const hist = await a("/api/activities?limit=2");
  ok("history is paginated", hist.json?.data?.items?.length === 2 && !!hist.json.data.nextCursor);
  ok("other users can't read my activity", (await b(`/api/activities/${act.id}`)).status === 404);

  console.log("\nMissions");
  const missions = (await a("/api/missions")).json.data;
  const done = missions.find((m) => m.key === "daily_activity");
  ok("activity completed the 'complete an activity' mission", done?.completed === true);
  const mc = await Promise.all([1, 2].map(() => a(`/api/missions/${done.id}/claim`, { method: "POST" })));
  ok("mission reward claimable exactly once (concurrent)", mc.filter((r) => r.status === 200).length === 1 && mc.some((r) => r.status === 409), mc.map((r) => r.status).join(","));
  const notDone = missions.find((m) => !m.completed && !m.locked);
  ok("can't claim incomplete mission", (await a(`/api/missions/${notDone.id}/claim`, { method: "POST" })).status === 400);
  const premium = missions.find((m) => m.premium);
  ok("Plus-only mission locked for free users", premium?.locked === true);

  console.log("\nShop & economy");
  const cat = (await a("/api/shop/catalog")).json.data;
  const fountain = cat.items.find((i) => i.key === "deco_fountain");
  const coins = cat.coins;
  const buys = await Promise.all(Array.from({ length: 6 }, (_, i) => a("/api/shop/buy", { body: { itemId: cat.items.find((x) => x.key === "deco_tree").id, quantity: 1, requestId: `race${stamp}${i}` } })));
  const after = (await a("/api/shop/catalog")).json.data.coins;
  const okBuys = buys.filter((r) => r.status === 200).length;
  ok("concurrent purchases never overdraw", after >= 0 && after === coins - okBuys * 80, `coins ${coins} → ${after}, ok ${okBuys}`);
  const pricey = [...cat.items].filter((i) => !i.premium && !["FLOOR", "WALL", "ENVIRONMENT"].includes(i.category)).sort((x, y) => y.priceCoins - x.priceCoins)[0];
  const curCoins = (await a("/api/shop/catalog")).json.data.coins;
  ok("can't afford expensive item → 402", curCoins >= pricey.priceCoins || (await a("/api/shop/buy", { body: { itemId: pricey.id } })).status === 402, `${curCoins} vs ${pricey.priceCoins}`);
  ok("Plus-only item blocked", (await a("/api/shop/buy", { body: { itemId: cat.items.find((i) => i.key === "deco_crystal").id } })).status === 403);
  const layout = (await a("/api/shop/layout")).json.data;
  const bench = layout.inventory.find((i) => i.key === "furn_bench");
  const p1 = await a("/api/shop/place", { body: { itemId: bench.itemId, x: 0, z: 0, rotation: 0 } });
  ok("place owned item", p1.status === 200);
  ok("can't place more than owned", (await a("/api/shop/place", { body: { itemId: bench.itemId, x: 3, z: 3, rotation: 0 } })).status === 400);
  const neverBought = cat.items.find((i) => i.key === "bld_cafe");
  ok("can't place item never bought", (await a("/api/shop/place", { body: { itemId: neverBought.id, x: 4, z: 4, rotation: 0 } })).status === 400);
  const bush = layout.inventory.find((i) => i.key === "deco_bush");
  ok("overlap rejected", (await a("/api/shop/place", { body: { itemId: bush.itemId, x: 0, z: 0, rotation: 0 } })).status === 400);
  ok("out of bounds rejected", (await a("/api/shop/place", { body: { itemId: bush.itemId, x: 8, z: 0, rotation: 0 } })).status === 400);
  ok("other user can't move my item", (await b(`/api/shop/place/${p1.json.data.id}`, { method: "PATCH", body: { x: 1, z: 1, rotation: 0 } })).status === 404);
  ok("move own item", (await a(`/api/shop/place/${p1.json.data.id}`, { method: "PATCH", body: { x: 2, z: 2, rotation: 1 } })).status === 200);
  ok("store returns to inventory", (await a(`/api/shop/place/${p1.json.data.id}`, { method: "DELETE" })).status === 200 && (await a("/api/shop/layout")).json.data.inventory.find((i) => i.key === "furn_bench").quantity === 1);

  console.log("\nPets");
  const pets = (await a("/api/pets")).json.data;
  const walkie = pets.pets.find((p) => p.key === "husky").owned;
  ok("Walkie owned and active", walkie && pets.activePetId === walkie.id);
  ok("activity gave Walkie XP", walkie.level >= 1 && (await a(`/api/pets/${walkie.id}`)).json.data.pet.xp > 0);
  const kibble = (await a(`/api/pets/${walkie.id}`)).json.data.inventory.find((i) => i.key === "food_kibble");
  ok("feed consumes food", (await a(`/api/pets/${walkie.id}/action`, { body: { action: "feed", itemId: kibble.itemId } })).status === 200);
  const play1 = await a(`/api/pets/${walkie.id}/action`, { body: { action: "play" } });
  ok("play works, then cools down", play1.status === 200 && (await a(`/api/pets/${walkie.id}/action`, { body: { action: "play" } })).status === 429);
  ok("can't interact with someone else's pet", (await b(`/api/pets/${walkie.id}/action`, { body: { action: "pet" } })).status === 404);
  ok("rename validates", (await a(`/api/pets/${walkie.id}`, { method: "PATCH", body: { nickname: "<script>" } })).status === 400);
  const duck = pets.pets.find((p) => p.key === "duck");
  ok("adopt pet needs coins", [200, 402].includes((await a("/api/pets/adopt", { body: { speciesId: duck.speciesId } })).status));
  const corgi = pets.pets.find((p) => p.key === "corgi");
  ok("milestone pets can't be bought", (await a("/api/pets/adopt", { body: { speciesId: corgi.speciesId } })).status === 400);

  console.log("\nHealth sync & social");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const hs = await a("/api/health/sync", { body: { source: "HEALTHKIT", days: [{ date: today, steps: 4200 }] } });
  ok("health sync accepted", hs.status === 200 && hs.json.data.accepted === 1);
  ok("absurd step counts rejected", (await a("/api/health/sync", { body: { source: "HEALTHKIT", days: [{ date: today, steps: 900000 }] } })).status === 400);
  ok("steps mission completed by synced steps", (await a("/api/missions")).json.data.find((m) => m.key === "daily_steps_3k").completed === true);
  await a("/api/me/profile", { method: "PATCH", body: { username: `alex${stamp % 100000}` } });
  ok("friend request (no enumeration leak)", (await b("/api/friends", { body: { handle: `alex${stamp % 100000}` } })).status === 200 && (await b("/api/friends", { body: { handle: "doesnotexist123" } })).status === 200);
  const req = (await a("/api/friends")).json.data.find((f) => f.incoming);
  ok("accept friend", (await a(`/api/friends/${req.id}`, { method: "PATCH", body: { action: "accept" } })).status === 200);
  const meA = (await a("/api/me")).json.data.user;
  ok("friend can visit shop", (await b(`/api/users/${meA.id}/shop`)).status === 200);
  await a("/api/me/profile", { method: "PATCH", body: { profileVisibility: "PRIVATE" } });
  ok("private shop hidden from friends", (await b(`/api/users/${meA.id}/shop`)).status === 404);
  const lb = (await b("/api/leaderboard?scope=global")).json.data;
  ok("global leaderboard excludes non-opted-in users", !lb.rows.some((r) => r.id === meA.id));

  console.log("\nPayments & webhooks");
  ok("Stripe webhook rejects bad signature", (await anon("/api/webhooks/stripe", { raw: "{}", headers: { "stripe-signature": "t=1,v1=bad", "content-type": "application/json" } })).status === 400);
  ok("RevenueCat webhook rejects missing auth", (await anon("/api/webhooks/revenuecat", { body: { event: {} } })).status === 401);
  const plans = (await a("/api/plans")).json.data;
  ok("plans listed; not purchasable without Stripe config", plans.plans.length >= 1 && (plans.providers.stripe || plans.plans.every((p) => !p.purchasable)));
  ok("Plus not granted without verified payment", (await a("/api/me")).json.data.plus === false);
  ok("ads disabled on tracking screens", (await a("/api/ads?screen=activity")).json.data.enabled === false);

  console.log("\nAdmin");
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const adm = client();
    ok("admin login", (await adm("/api/auth/login", { body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } })).status === 200);
    const st = await adm("/api/admin/stats");
    ok("admin stats from real data", st.status === 200 && st.json.data.users.total >= 2);
    const users = await adm(`/api/admin/users?q=${encodeURIComponent(emailA)}`);
    ok("admin search", users.json?.data?.rows?.[0]?.email === emailA);
    ok("admin suspends user", (await adm(`/api/admin/users/${meA.id}`, { method: "PATCH", body: { status: "SUSPENDED", reason: "e2e" } })).status === 200);
    ok("suspended user can't earn rewards", (await a("/api/shop/visit", { method: "POST" })).status === 403);
    ok("admin restores user", (await adm(`/api/admin/users/${meA.id}`, { method: "PATCH", body: { status: "ACTIVE" } })).status === 200);
    const m = await adm("/api/admin/catalog/missions", { body: { key: `e2e_${stamp}`, title: "E2E mission", description: "test", kind: "ACTIVITY_COUNT", target: 2, period: "DAILY", difficulty: "EASY", rewardCoins: 5, rewardXp: 5, premium: false, enabled: false, sort: 99 } });
    ok("admin creates mission", m.status === 200);
    ok("admin deletes mission", (await adm(`/api/admin/catalog/missions/${m.json.data.id}`, { method: "DELETE" })).status === 200);
    ok("admin can't delete owned item", (await adm(`/api/admin/catalog/items/${cat.items.find((i) => i.key === "deco_tree").id}`, { method: "DELETE" })).status === 400 || okBuys === 0);
    ok("audit log records actions", (await adm("/api/admin/audit")).json.data.some((l) => l.action === "user.status.suspended"));
    ok("admin edits activity reward rate", (await adm("/api/admin/catalog/activities/JOG", { method: "PATCH", body: { rewardRate: 8 } })).status === 200 && (await anon("/api/rewards/config")).json.data.types.find((t) => t.key === "JOG").rate === 8);
    await adm("/api/admin/catalog/activities/JOG", { method: "PATCH", body: { rewardRate: 7 } });
    ok("admin can't create bogus activity types", (await adm("/api/admin/catalog/activities", { body: { key: "TELEPORT" } })).status === 400);
    ok("per-sport analytics present", (await adm("/api/admin/stats")).json.data.sports.find((x) => x.family === "bike") != null);
    ok("tracking-screen ad placement refused", (await adm("/api/admin/catalog/ads", { body: { key: `bad${stamp}`, name: "x", screen: "activity", format: "BANNER", enabled: true, frequencyCapPerDay: 1, rewardCoins: 0, hideForPlus: true } })).status === 400);
  } else console.log("  (skipped — set ADMIN_EMAIL and ADMIN_PASSWORD)");

  console.log("\nBadges");
  const col = (await a("/api/achievements")).json.data;
  const earned = col.badges.filter((x) => x.unlockedAt);
  ok("badges unlock from real activity (steps, first day, durations)", ["walk_steps_100", "streak_1", "dur_single_5"].every((k) => earned.some((e) => e.key === k)), earned.map((e) => e.key).join(","));
  ok("locked badge shows exact progress", col.badges.find((x) => x.key === "walk_steps_10000")?.progress > 0 && !col.badges.find((x) => x.key === "walk_steps_10000").unlockedAt);
  await Promise.all(Array.from({ length: 5 }, () => a("/api/achievements")));
  const led = (await a("/api/me/export"));
  const ledger = (led.json ?? JSON.parse(led.text)).ledger.filter((l) => l.reason === "ACHIEVEMENT");
  ok("each badge rewarded exactly once under concurrent evaluation", new Set(ledger.map((l) => l.refId)).size === ledger.length && ledger.length === earned.length, `${ledger.length} grants / ${earned.length} badges`);
  const unseen = (await a("/api/achievements/unseen")).json.data;
  ok("unseen unlocks queued for the celebration", unseen.length > 0);
  await a("/api/achievements/unseen", { body: { ids: unseen.map((u) => u.id) } });
  const seenAgain = (await a("/api/achievements/unseen")).json.data.map((u) => u.id);
  ok("marked seen (celebrated badges don't reappear)", unseen.every((u) => !seenAgain.includes(u.id)));
  ok("can't share a badge you haven't earned", (await a(`/api/achievements/${col.badges.find((x) => !x.unlockedAt).id}/share`, { method: "POST" })).status === 404);
  const bs = await a(`/api/achievements/${earned[0].id}/share`, { method: "POST" });
  const bpage = await anon(new URL(bs.json.data.url).pathname);
  ok("public badge page shows the badge, no health data", bpage.status === 200 && (bpage.text ?? "").includes(earned[0].title) && !(bpage.text ?? "").includes("km"));
  if (process.env.ADMIN_EMAIL) {
    const adm2 = client(); await adm2("/api/auth/login", { body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
    ok("admin can't delete a badge users have earned", (await adm2(`/api/admin/catalog/achievements/${earned[0].id}`, { method: "DELETE" })).status === 400);
    const nb = await adm2("/api/admin/catalog/achievements", { body: { key: `e2e_badge_${stamp}`, title: "E2E badge", description: "t", category: "FITNESS", rarity: "EPIC", kind: "ACTIVITY_COUNT", target: 1, rewardCoins: 5, rewardXp: 5, rewardItemQty: 1, icon: "star", art: { pose: "jump", scene: "park" }, hidden: true, archived: false, enabled: true, sort: 999 } });
    ok("admin creates a badge", nb.status === 200);
    const after = (await a("/api/achievements")).json.data.badges.find((x) => x.key === `e2e_badge_${stamp}`);
    ok("new badge auto-unlocks from existing activity (no client input)", !!after?.unlockedAt);
    await adm2(`/api/admin/catalog/achievements/${nb.json.data.id}`, { method: "PATCH", body: { archived: true } });
    ok("badge analytics page loads", (await adm2("/admin/achievements")).status === 200);
  }

  console.log("\nWardrobe");
  const wd = (await a("/api/wardrobe")).json?.data;
  ok("wardrobe loads with free starter clothes", wd && ["acc_bandana", "acc_cap", "acc_runtee", "acc_shoes", "acc_bow", "acc_stripetee"].every((k) => wd.items.find((i) => i.key === k)?.owned), JSON.stringify(wd?.items?.filter((i) => i.owned).map((i) => i.key)));
  ok("starter wardrobe granted once (idempotent)", (await a("/api/wardrobe")).json.data.items.filter((i) => i.owned).length === wd.items.filter((i) => i.owned).length);
  ok("equip an owned item", (await a("/api/wardrobe/outfit", { body: { set: { HEAD: "acc_cap" } } })).json?.data?.equipped?.HEAD === "acc_cap");
  ok("can't wear items you don't own", (await a("/api/wardrobe/outfit", { body: { set: { HEAD: "acc_crown" } } })).status === 403);
  ok("items only fit their slot", (await a("/api/wardrobe/outfit", { body: { set: { FEET: "acc_cap" } } })).status === 400);
  ok("unknown slots/items rejected", (await a("/api/wardrobe/outfit", { body: { set: { TAIL: "acc_cap" } } })).status === 400 && (await a("/api/wardrobe/outfit", { body: { set: { HEAD: "acc_nope" } } })).status === 400);
  const look = await a("/api/wardrobe/appearance", { method: "PATCH", body: { look: "sunny", fur: "copper", reset: true } });
  ok("style + fur saved, starter outfit applied", look.json?.data?.look === "sunny" && look.json.data.fur === "copper" && look.json.data.equipped.HEAD === "acc_bow" && look.json.data.equipped.BODY === "acc_stripetee" && !look.json.data.equipped.NECK);
  ok("invalid style rejected", (await a("/api/wardrobe/appearance", { method: "PATCH", body: { look: "robot" } })).status === 400);
  const saved = await a("/api/wardrobe/looks", { body: { name: "Sunny day" } });
  ok("save a look (from server state)", saved.json?.data?.items?.HEAD === "acc_bow");
  await a("/api/wardrobe/outfit", { body: { set: { HEAD: null, BODY: null, FEET: null } } });
  ok("wear a saved look", (await a(`/api/wardrobe/looks/${saved.json.data.id}`, { method: "POST" })).json?.data?.equipped?.HEAD === "acc_bow");
  ok("other users can't use my saved look", (await b(`/api/wardrobe/looks/${saved.json.data.id}`, { method: "POST" })).status === 404);
  const medal = wd.items.find((i) => i.key === "acc_medal");
  ok("badge-reward items can't be bought", (await a("/api/shop/buy", { body: { itemId: medal.id } })).status === 403);
  ok("appearance persists", (await a("/api/wardrobe")).json.data.fur === "copper");

  console.log("\nSEO");
  const robots = (await anon("/robots.txt")).text ?? "";
  ok("robots disallows private areas", robots.includes("Disallow: /admin") && robots.includes("Disallow: /api/") && robots.includes("Sitemap: https://walkie.run/sitemap.xml"));
  const sm = (await anon("/sitemap.xml")).text ?? "";
  ok("sitemap lists only public pages", sm.includes("https://walkie.run/features") && !sm.includes("/app") && !sm.includes("/admin"));
  const home = (await anon("/")).text ?? "";
  ok("landing has canonical + OG + JSON-LD", home.includes('rel="canonical" href="https://walkie.run"') && home.includes("og:title") && home.includes("application/ld+json"));

  console.log("\nCleanup");
  ok("account deletion requires password", (await a("/api/me", { method: "DELETE", body: { password: "wrong" } })).status === 401);
  ok("delete account A", (await a("/api/me", { method: "DELETE", body: { password: "walkies123" } })).status === 200);
  ok("deleted session is gone", (await a("/api/me")).status === 401);
  await b("/api/me", { method: "DELETE", body: { password: "walkies123" } });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
