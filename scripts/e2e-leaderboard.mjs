#!/usr/bin/env node
/** Leaderboard / duels / fairness end-to-end checks. Requires ADMIN_EMAIL + ADMIN_PASSWORD. */
const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; console.log(`  ✔ ${name}`); } else { fail++; console.log(`  ✘ ${name} ${extra}`); } };
let ipN = 0; const runNet = `${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 250)}`;
function client() {
  let cookie = ""; const ip = `${runNet}.${Math.floor(ipN / 250)}.${ipN++ % 250}`; // one network per test user (signup limits are per network)
  return async (path, { method, body } = {}) => {
    const res = await fetch(BASE + path, { method: method ?? (body ? "POST" : "GET"), redirect: "manual", headers: { origin: BASE, "x-forwarded-for": ip, ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get("set-cookie"); if (set) { const m = set.match(/walkie_session=([^;]*)/); if (m) cookie = m[1] ? `walkie_session=${m[1]}` : ""; }
    let json = null; try { json = await res.clone().json(); } catch {}
    return { status: res.status, json };
  };
}
const stamp = Date.now(); const users = [];
const track = (n, stepM, dtSec, t0) => Array.from({ length: n }, (_, i) => [14.55 + (i * stepM) / 111195, 121.02, t0 + i * dtSec * 1000, 5, 20]);
let seq = 0;
async function walk(c, km, startMs, type = "OUTDOOR_WALK", step = 10) {
  const n = Math.round((km * 1000) / step) + 1, dur = (n - 1) * 5;
  const r = await c("/api/activities", { body: { clientId: `lb${stamp}-${seq++}`, type, startedAt: new Date(startMs).toISOString(), endedAt: new Date(startMs + dur * 1000).toISOString(), movingSec: dur, points: track(n, step, 5, startMs) } });
  return r.json?.data?.activity;
}
async function person(name) {
  const c = client(); const h = `${name.toLowerCase()}${stamp % 100000}`;
  await c("/api/auth/signup", { body: { name, email: `lb${name}${stamp}@example.com`, password: "walkies123", acceptTerms: true, timezone: "UTC" } });
  await c("/api/me/profile", { method: "PATCH", body: { onboarded: true, username: h } });
  users.push(c); return { c, h, id: (await c("/api/me")).json.data.user.id };
}
const board = async (c, q) => (await c(`/api/leaderboard?${q}`)).json;
const befriend = async (x, y) => { await x.c("/api/friends", { body: { handle: y.h } }); const req = (await y.c("/api/friends")).json.data.find((f) => f.incoming); await y.c(`/api/friends/${req.id}`, { method: "PATCH", body: { action: "accept" } }); };

async function main() {
  console.log(`Leaderboard E2E against ${BASE}\n`);
  const adm = client(); await adm("/api/auth/login", { body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
  const A = await person("Ava"), B = await person("Ben"), C = await person("Cleo"), D = await person("Dax");
  await befriend(A, B); await befriend(A, C);
  for (const [p, extra] of [[A, { community: "Makati Walkers" }], [B, { community: "makati  walkers" }], [C, {}]]) await p.c("/api/me/profile", { method: "PATCH", body: { leaderboardOptIn: true, country: "PH", ...extra } });
  try {
    // last Sunday (previous week) + today
    const now = new Date(); const dow = (now.getUTCDay() + 6) % 7;
    const lastSun = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow - 1, 9);
    const prevWeek = `W:${new Date(lastSun - 6 * 86400000).toISOString().slice(0, 10)}`;
    await walk(A.c, 1.2, lastSun); await walk(B.c, 0.6, lastSun); await walk(C.c, 0.4, lastSun);
    const t = Date.now() - 3 * 3600000;
    const a1 = await walk(A.c, 2, t); const b1 = await walk(B.c, 1.2, t); const c1 = await walk(C.c, 0.6, t); await walk(D.c, 3, t);

    console.log("Server-side scoring");
    let fa = await board(A.c, "period=week&board=overall&scope=friends");
    ok("friends board ranks me + friends by server score", fa.data.rows.map((r) => r.userId).join() === [A.id, B.id, C.id].join(), JSON.stringify(fa.data.rows.map((r) => [r.name, r.score])));
    const aWeek = fa.data.rows[0].score;
    ok("overall score equals the activity points the server awarded", aWeek === a1.points, `${aWeek} vs ${a1.points}`);
    ok("non-friends never appear on my friends board", !fa.data.rows.some((r) => r.userId === D.id));
    const walkBoard = await board(A.c, "period=week&board=walk&scope=friends");
    ok("walking board in km from verified GPS", Math.abs(walkBoard.data.rows[0].score - a1.distanceM / 1000) < 0.02, walkBoard.data.rows[0].score);
    const g = await board(B.c, "period=week&board=overall&scope=global");
    ok("global board lists opted-in users only", g.data.rows.some((r) => r.userId === A.id) && !g.data.rows.some((r) => r.userId === D.id));
    ok("my rank + gap to next are computed", g.data.me.rank >= 2 && g.data.me.gapToNext > 0, JSON.stringify(g.data.me));
    ok("no sensitive fields exposed", !/email|latitude|lat"|route|calories|weight/i.test(JSON.stringify(g.data.rows)));
    ok("country board needs a country you chose", (await board(D.c, "period=week&board=overall&scope=country")).data.needs === "country");
    const comm = await board(A.c, "period=week&board=overall&scope=community");
    ok("community board groups matching communities (normalized)", comm.data.rows.map((r) => r.userId).sort().join() === [A.id, B.id].sort().join());
    ok("daily / monthly / all-time boards work", (await board(A.c, "period=day&board=overall&scope=friends")).data.rows.length === 3 && (await board(A.c, "period=all&board=overall&scope=friends")).data.rows[0].score > aWeek);
    ok("Walkie appearance included for podium characters", Array.isArray(fa.data.rows[0].walkie.accessories) && fa.data.rows[0].walkie.look);

    console.log("\nManipulation & fairness");
    ok("clients can't write scores", (await A.c("/api/leaderboard", { body: { score: 999999 } })).status === 405);
    const dupe = await A.c("/api/activities", { body: { clientId: `lb${stamp}-3`, type: "OUTDOOR_WALK", startedAt: new Date(t).toISOString(), endedAt: new Date(t + 60000).toISOString(), movingSec: 9999 } });
    ok("replayed activity doesn't change the score", dupe.json?.data?.duplicate === true && (await board(A.c, "period=week&board=overall&scope=friends")).data.rows[0].score === aWeek);
    const car = await walk(C.c, 6, Date.now() - 5400000, "OUTDOOR_WALK", 60);
    if (car?.status !== "FLAGGED") console.log("    car:", JSON.stringify(car));
    ok("vehicle-speed activity never counts", car.status === "FLAGGED" && (await board(C.c, "period=week&board=walk&scope=friends")).data.rows.find((r) => r.me).score < 1);
    const tr = await C.c("/api/activities", { body: { clientId: `lb${stamp}-tr`, type: "TREADMILL_WALK", startedAt: new Date(Date.now() - 2400000).toISOString(), endedAt: new Date(Date.now() - 600000).toISOString(), movingSec: 1800, manualDistanceM: 2500 } });
    const cw = await board(C.c, "period=week&board=walk&scope=friends");
    ok("unverified indoor distance is excluded from distance boards", tr.json?.data?.activity?.status === "COMPLETED" && cw.data.rows.find((r) => r.me).score < 0.7 && cw.data.weekly.unverifiedKm >= 2.5, JSON.stringify(cw.data.weekly));
    const ride = await walk(D.c, 12, Date.now() - 7200000, "OUTDOOR_CYCLE", 40);
    ok("fast cycling earns fewer overall points per minute than walking", ride && ride.points / (ride.durationSec / 60) < a1.points / (a1.durationSec / 60), `${ride?.points}/${ride?.durationSec} vs ${a1.points}/${a1.durationSec}`);
    await B.c(`/api/activities/${b1.id}`, { method: "DELETE" });
    ok("deleted activity leaves the board", ((await board(A.c, "period=day&board=overall&scope=friends")).data.rows.find((r) => r.userId === B.id)?.score ?? 0) === 0);

    console.log("\nPrivacy controls");
    await B.c("/api/me/profile", { method: "PATCH", body: { activityVisibility: "PRIVATE" } });
    ok("private activity hides you from friends' boards", !(await board(A.c, "period=all&board=overall&scope=friends")).data.rows.some((r) => r.userId === B.id));
    await B.c("/api/me/profile", { method: "PATCH", body: { activityVisibility: "FRIENDS" } });
    await C.c("/api/me/profile", { method: "PATCH", body: { leaderboardOptIn: false } });
    ok("opting out removes you from public boards", !(await board(A.c, "period=week&board=overall&scope=global")).data.rows.some((r) => r.userId === C.id));
    await C.c("/api/me/profile", { method: "PATCH", body: { leaderboardOptIn: true, publicName: "Cleo the Swift" } });
    ok("public display name is used", (await board(A.c, "period=all&board=overall&scope=global")).data.rows.find((r) => r.userId === C.id)?.name === "Cleo the Swift");
    ok("invalid country rejected", (await A.c("/api/me/profile", { method: "PATCH", body: { country: "XX" } })).status === 400);
    ok("photo hidden unless allowed (Walkie avatar instead)", (await board(A.c, "period=all&board=overall&scope=friends")).data.rows.every((r) => r.photo === null));

    console.log("\nFriendly competition");
    const duel = await A.c("/api/duels", { body: { opponentId: B.id, metric: "WALK", days: 1 } });
    ok("challenge a friend", duel.status === 200);
    ok("only friends can be challenged", (await A.c("/api/duels", { body: { opponentId: D.id, metric: "STEPS", days: 3 } })).status === 403);
    ok("no duplicate challenges per pair", (await B.c("/api/duels", { body: { opponentId: A.id, metric: "STEPS", days: 3 } })).status === 409);
    ok("only the invitee can accept", (await A.c(`/api/duels/${duel.json.data.id}`, { body: { action: "accept" } })).status === 400);
    ok("invitee accepts", (await B.c(`/api/duels/${duel.json.data.id}`, { body: { action: "accept" } })).json?.data?.status === "ACTIVE");
    const acceptedAt = Date.now(); await new Promise((r) => setTimeout(r, 26000)); // activity must happen inside the duel window
    await walk(A.c, 0.2, acceptedAt + 1000);
    const dl = (await A.c("/api/duels")).json.data.find((x) => x.id === duel.json.data.id);
    ok("duel progress is computed on the server", dl.me.score > 0 && dl.friend.score === 0, JSON.stringify(dl));
    ok("cheer a friend", (await A.c("/api/leaderboard/cheer", { body: { userId: B.id } })).status === 200);
    ok("one cheer per friend per day", (await A.c("/api/leaderboard/cheer", { body: { userId: B.id } })).status === 409);
    ok("can't cheer non-friends", (await A.c("/api/leaderboard/cheer", { body: { userId: D.id } })).status === 403);

    console.log("\nReview, disqualification & disputes");
    ok("users can't access the integrity console", (await A.c("/api/admin/leaderboard")).status === 403);
    const con = (await adm("/api/admin/leaderboard?period=week&board=overall")).json.data;
    ok("admin sees scores with review hints", con.rows.some((r) => r.userId === C.id && r.flags.some((f) => f.startsWith("FLAGGED_ACTIVITIES") || f === "UNVERIFIED_DISTANCE_EXCLUDED")), JSON.stringify(con.rows.find((r) => r.userId === C.id)));
    ok("a flag alone doesn't remove anyone", (await board(B.c, "period=week&board=overall&scope=global")).data.rows.some((r) => r.userId === C.id));
    const period = con.period;
    await adm("/api/admin/leaderboard", { body: { action: "disqualify", userId: A.id, period, reason: "e2e review" } });
    ok("admin hold removes the entry from public boards", !(await board(B.c, "period=week&board=overall&scope=global")).data.rows.some((r) => r.userId === A.id));
    const mine = await board(A.c, "period=week&board=overall&scope=global");
    ok("held user is told and can request a review", !!mine.data.me.disqualified?.id);
    ok("other periods unaffected", (await board(B.c, "period=all&board=overall&scope=global")).data.rows.some((r) => r.userId === A.id));
    ok("dispute submitted", (await A.c("/api/leaderboard/dispute", { body: { text: "That was a real walk with my dog!", disqualificationId: mine.data.me.disqualified.id, period } })).status === 200);
    const disp = (await adm("/api/admin/leaderboard")).json.data.disputes.find((x) => x.text.includes("real walk"));
    await adm("/api/admin/leaderboard", { body: { action: "resolveDispute", id: disp.id, accept: true, response: "Looks good — welcome back!" } });
    ok("accepted dispute lifts the hold", (await board(B.c, "period=week&board=overall&scope=global")).data.rows.some((r) => r.userId === A.id));

    console.log("\nResets, settlement & rewards");
    ok("current period can't be settled early", (await adm("/api/admin/leaderboard", { body: { action: "settle", period } })).status === 400);
    const coins0 = (await A.c("/api/me")).json.data.wallet.coins;
    const st = await adm("/api/admin/leaderboard", { body: { action: "settle", period: prevWeek } });
    ok("previous week settles", st.status === 200 && st.json.data.participants >= 3, JSON.stringify(st.json));
    const res = (await A.c("/api/leaderboard/results")).json.data.find((r) => r.period === prevWeek);
    const coins1 = (await A.c("/api/me")).json.data.wallet.coins;
    ok("result recorded with rank, tier and podium coins", res && res.rank === 1 && res.rewardCoins >= 300, JSON.stringify(res));
    void coins0;
    await adm("/api/admin/leaderboard", { body: { action: "settle", period: prevWeek } });
    ok("settling again grants nothing (rewards once)", (await A.c("/api/me")).json.data.wallet.coins === coins1);
    const dRes = (await D.c("/api/leaderboard/results")).json.data.find((r) => r.period === prevWeek);
    ok("non-public users never get podium ranks", !dRes || dRes.rank === null);
    ok("leaderboard admin page loads", (await adm("/admin/leaderboard")).status === 200);
    ok("cron requires the secret", (await client()("/api/cron/leaderboard", { method: "POST" })).status === 401);
    ok("leaderboard page renders", (await A.c("/app/leaderboard")).status === 200);
  } finally {
    for (const u of users) await u("/api/me", { method: "DELETE", body: { password: "walkies123" } });
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
