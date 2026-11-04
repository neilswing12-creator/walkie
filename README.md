# Walkie.run

Walk, run and ride with **Walkie**, a living gray-and-white Siberian husky. Real activity earns points and coins. You use them to dress Walkie, collect pets, grow an isometric pet shop, earn badges, climb fair leaderboards and invite friends.

One codebase gives you all of these:
- the marketing website;
- the web app (installable PWA);
- iOS and Android apps via Capacitor;
- the REST backend and the admin console.

| | |
|---|---|
| Framework | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind |
| Data | Prisma 6 · PostgreSQL in production · SQLite for local dev (`scripts/use-postgres.mjs` switches) |
| Mobile | Capacitor 7: geolocation, HealthKit / Health Connect (`@capgo/capacitor-health`), push (FCM) |
| Graphics | Hand-built SVG mascot + wardrobe rig (CSS-animated), Three.js isometric shop, optional MapLibre maps |
| Tests | Vitest (67 unit) · 3 end-to-end API suites (214 checks) · Playwright visual checks |

## Quick start

```bash
npm install
cp .env.example .env            # defaults work locally; every integration is optional
npm run db:migrate              # prisma migrate deploy (SQLite dev.db)
npm run db:seed                 # pets, 86 items (incl. 47 wardrobe pieces), missions, 136 badges, plans, flags — no fake users
npm run admin:create            # interactive: creates your ADMIN account
npm run dev                     # http://localhost:3000
```

Production: point `DATABASE_URL` at PostgreSQL, run `node scripts/use-postgres.mjs`, then `npx prisma migrate deploy`, `npm run db:seed` and `npm run build && npm start`. Schedule the two cron endpoints hourly (see `docs/OPERATIONS.md`).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest unit tests (fitness maths, rewards, badges, referral signals, leaderboard periods) |
| `npm run test:e2e` | Core + referral suites against a running server. Also run `node scripts/e2e-leaderboard.mjs`. All three need `ADMIN_EMAIL`/`ADMIN_PASSWORD` of an existing admin. |
| `npm run db:migrate` · `db:seed` · `admin:create` | Database setup |
| `npm run cap:sync` · `cap:ios` · `cap:android` | Native shells (see `docs/MOBILE.md`) |

## What's inside

- **Tracking (walk / run / cycle, 12 activity types)**
  - Server-authoritative sessions with a pause/resume state machine.
  - GPS route cleaning: jitter, teleports and vehicle-speed segments are removed, and a track that is mostly impossible-speed is flagged.
  - Splits and records.
  - Points per active minute with admin-set rates; paused time earns nothing.
  - Daily caps, idempotent replays, and delete with reward reversal.
  - Strava-style completion card and privacy-aware share cards (9:16 / square).
- **Walkie, alive**
  - Layered SVG character with shading, fur texture and gaze-tracking eyes.
  - Idle micro-behaviours; tap / multi-tap / press-and-hold-to-pet reactions; outfit "ooh" reactions.
  - 19 moods and time-of-day scenes. Respects reduced motion and pauses off-screen.
- **Wardrobe**
  - 47 pieces across hats, glasses, neck, tops, back, shoes, costumes, fitness, seasonal and premium.
  - Free try-on, buy & wear, saved looks, reset and twirl.
  - Classic / Boy-style / Girl-style presentation (optional, never gender-gated) and 5 fur tones.
  - Your outfit appears on every screen and on leaderboard podiums.
- **Economy & pets**
  - Ledger-backed coins/XP/points, so nothing can be double-granted.
  - Missions, a 7-day treat, streaks with freezes, and 14 pets with stats and evolution.
- **Pet shop:** a 3D isometric builder with placement validation, expansions and friend visits.
- **Badges:** 136 original badges in 6 rarities, with an unlock queue that never interrupts tracking, share cards and public badge links.
- **Leaderboards**
  - Daily / weekly / monthly / all-time boards; Overall / Walking / Running / Cycling / Steps; friends, global, country and community scopes.
  - Animated podium showing each user's dressed Walkie.
  - Tiers that reward every pace, a personal-best bonus, friendly duels, cheers and team challenges.
  - Admin integrity console with reversible holds and disputes.
- **Referrals**
  - Invite links, a stacking VIP credit ledger and layered fraud signals (hashed IPs, signed install IDs, alias detection).
  - Risk scoring; admin review and appeals.
- **Onboarding:** a 13-step first-run flow derived from a frame-by-frame reference analysis. It persists and resumes, primes permissions, and lets you choose a look.
- **Accounts & payments**
  - Accounts: email + Google + Apple sign-in, verification, password reset, data export and account deletion.
  - Payments: Stripe and PayMongo (GCash/Maya, web) plus RevenueCat (stores), with webhook-verified entitlements only.
- **Maps:** the admin picks Google / Apple / open map per platform, with honest fallback.
- **Admin:** users, support tickets, catalogue CRUD (activities and rewards, pets, items, missions, challenges, badges, plans, ads, flags), settings, subscriptions, badge analytics, referrals, leaderboards and the audit log.

Docs: `docs/ENVIRONMENT.md` · `docs/SECURITY.md` · `docs/MAPS.md` · `docs/MOBILE.md` · `docs/API.md` · `docs/OPERATIONS.md` · `docs/FTUE_ANALYSIS.md` · `docs/VISUAL_REFERENCE_ANALYSIS.md`.

## Ground rules baked into the code
- **The server decides.** Coins, rewards, pet ownership, entitlements, activity completion, missions, badges, referral rewards, VIP days, leaderboard scores and admin roles are all decided on the server. Client values are never trusted.
- **No faked data.** No fake reviews, users, store links, scores or payment states. Features without credentials say so instead of pretending.
- **Privacy:**
  - Routes are private by default; shares trim the start and end.
  - IPs are only ever stored as HMAC hashes, with 30-day retention.
  - No invasive fingerprinting.
  - Leaderboards expose display names, Walkie looks and totals only.
- **Secrets:** no hard-coded secrets; privileged keys are server-only. Passwords, tokens and GPS points are never logged.
