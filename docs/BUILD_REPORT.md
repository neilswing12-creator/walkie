# Walkie.run — build report

Everything below was implemented and verified against a production build (`next build && next start`):
- **E2E:** 302 checks across 4 suites (core 122 · referrals 45 · leaderboards 47 · security 88), also run against PostgreSQL 16;
- **Unit:** 69 Vitest tests;
- **Visual:** Playwright screenshots at 390×844 (mobile) and desktop.

## 1. Features
| Area | Status |
|---|---|
| Website | Landing, features, pets, about, blog, help (FAQ JSON-LD), contact, privacy/terms/cookies, sitemap, robots, OG image, PWA manifest, honest "early preview" waitlist |
| Auth | Email + password, Google & Apple (PKCE), email verification, reset, sessions (cookie + bearer), export, delete |
| Tracking | Walk / run / cycle (12 types), server sessions, pause/resume, GPS cleaning, **GPS-integrity flagging** (new), splits, records, points per active minute, caps, replay-safe, delete + reversal, history filters, completion + share cards |
| Walkie | Layered SVG rig with shading, fur texture, iris gradients and a gaze rig. **LivingWalkie**: idle micro-behaviours, pointer gaze, tap / multi-tap / hold-to-pet, outfit/rare/reward reactions; pauses off-screen; reduced motion supported |
| Wardrobe | 47 items in 6 slots and 10 tabs, try-on preview, buy & wear, saved looks (≤12), reset, twirl, style (Classic / Boy-style / Girl-style) + 5 fur tones, free starter kit, outfit synced app-wide |
| Premium icons | 28-icon `AppIcon` family with one shared material (Home, pet, wardrobe, explore, leaderboard, friends) |
| Scenes | Time-of-day illustrated backdrop (dawn/day/dusk/night) with clouds, grass sway, stars and fireflies |
| Economy / pets / shop | Ledger (idempotent), missions, daily treat, streaks, 14 pets, 3D isometric shop with expansion and visits |
| Badges | 136 badges (incl. 6 new leaderboard/duel badges), unlock queue, share cards, public links, admin + analytics |
| Onboarding | 13-step FTUE (analysis in `FTUE_ANALYSIS.md`), now with an optional look choice applied after sign-up |
| Referrals | Codes and links, invite landing, httpOnly cookie, VIP credit ledger (stacking), risk scoring, statuses, appeals, admin review, cron |
| Leaderboards | 4 periods × 5 boards × 4 scopes, animated podium with dressed Walkies, rank-change arrows, my-position bar, tiers + personal-best bonus, podium + monthly champion laurel, duels, cheers, team challenges (Pups vs Wolves), privacy controls, disputes |
| Payments | Stripe + RevenueCat + **PayMongo** (GCash, Maya, cards, QR Ph; web only). Entitlements come only from verified webhooks; PayMongo is re-checked against the API, refunds revoke |
| Maps | Admin-configurable Google / Apple / open map order per platform (web, iOS, Android), native Google SDK option, never uses a disabled provider, honest SVG fallback (`docs/MAPS.md`) |
| Security | Spec #12 audit: OWNER role, step-up re-auth for privileged admin actions, 12 h staff sessions, session revocation, security event log, CSP, webhook hardening (`docs/SECURITY.md`) |
| Deploy | `deploy/setup-vps.sh` (nginx + Let's Encrypt + PostgreSQL + systemd + cron + backups) for walkie.run at `/var/www/walkie` |
| Native | Generated `android/` + `ios/` Capacitor projects, permissions, offline shell, premium 3D-style app icon + splash (`design/app-icon.svg`) |
| Admin | Dashboard, users, tickets, catalogue CRUD, settings (now with JSON fields for nested rules), subscriptions, badge analytics, referrals, **leaderboards console**, audit log |

## 2. Migrations (`prisma/migrations`)
1. `init`
2. `multisport_badges`
3. `onboarding`
4. `referrals`
5. `wardrobe` — data: glasses move to the FACE slot
6. `wardrobe_schema` — SavedLook; Profile walkieLook/walkieFur
7. `leaderboards`:
   - new tables: LeaderboardScore, Result, Disqualification, Dispute, Duel, Cheer;
   - new Profile columns: publicName, country, community, showPhotoOnBoards, notifyCompetition;
   - challenge team mode.
8. `payments_hardening`: PaymentOrder, Subscription.providerEventAt, SubscriptionPlan.paymongoAmount
9. `security_events`: SecurityEvent

The PostgreSQL migration history is in `prisma/migrations-postgres`; `scripts/use-postgres.mjs` switches to it.

## 3. Key files added in this phase
- **Character:** `components/mascot/{Walkie,LivingWalkie,MyWalkie,WalkieDefs,Accessories}.tsx`, `components/wardrobe/*`, `lib/wardrobe.ts`, `lib/game/wardrobe.ts`, `app/api/wardrobe/**`
- **Icons and scene:** `components/ui/AppIcon.tsx`, `components/app/Scene.tsx`
- **Leaderboards:** `lib/leaderboard/{service,duels,settings}.ts`, `app/api/leaderboard/**`, `app/api/duels/**`, `app/api/admin/leaderboard`, `app/api/cron/leaderboard`, `components/leaderboard/*`, `components/admin/LeaderboardAdmin.tsx`
- **Referrals:** `components/referrals/InviteClient.tsx`, `components/admin/ReferralsAdmin.tsx`, `app/invite/[code]`, `app/api/referrals/**`, `app/api/device/token`, `app/api/cron/referrals`, `lib/client/device.ts`
- **Tests:** `tests/{referrals,leaderboard}.test.ts`, `scripts/e2e-{referrals,leaderboard}.mjs`, plus wardrobe checks in `scripts/e2e.mjs`
- **Docs:** `README.md`, `docs/{ENVIRONMENT,MOBILE,API,OPERATIONS,VISUAL_REFERENCE_ANALYSIS,FTUE_ANALYSIS}.md`

## 4. Integrations & environment
Every variable is listed in `docs/ENVIRONMENT.md`. New: `CRON_SECRET`, `SIGNAL_SECRET`, `PAYMONGO_*`, `GOOGLE_MAPS_*`, `APPLE_MAPKIT_*`, `MAP_STYLE_URL`.

Credential-gated features:
- payments: Stripe, RevenueCat;
- sign-in: Google, Apple;
- email: Resend;
- push: FCM;
- other: map tiles, PostHog, ads;
- native-only: HealthKit / Health Connect.

## 5. Security fixes found while testing
- **Reward-only items:** items priced at 0 coins (medal, helmet, laurel) could be bought through `/api/shop/buy`. Now refused.
- **Car-speed GPS:** a "walk" whose GPS points were all discarded as impossible-speed still earned points from moving time. It is now flagged and earns nothing.
- **Concurrent writes:** unique-constraint races and DB contention returned 500s. They now map to 409/503; local SQLite runs in WAL mode.
- **Referral state race:** a stale status update could overwrite a newer referral state. Status writes are now conditional; reward transactions retry and stay idempotent.
- **Leaked hold reasons:** the admin's internal hold reason was exposed to the user. Users now see a neutral notice only.
- **Hardcoded fallback secret:** the dev signal secret could have been used in production. Production now uses an ephemeral random key when `SIGNAL_SECRET` is unset.

## 6. Tests
- **E2E security (88):** CSRF, auth brute force, IDOR, role escalation, step-up, session revocation, upload types, payment webhooks (forged, replayed, test-mode, amount mismatch), PayMongo against a local mock, headers/CSP.
- **Unit (69):** fitness maths, rewards, badges, referral signals and install-token forgery, leaderboard periods and tiers.
- **E2E core (122):** auth & CSRF, activities & anti-cheat, multi-sport, missions, economy, pets, health, social, payments/webhooks, admin, badges, **wardrobe ownership/slot validation, looks, styles, reward-only items**, SEO, cleanup.
- **E2E referrals (45):** codes and links, legit flow, 7-day trial, stacking, replay, concurrency, shared Wi-Fi not rejected, self-referral via alias, same-device accounts, forged tokens, disposable email, appeals, admin approve/reject/revoke, audit, cron auth, code regeneration.
- **E2E leaderboards (47):**
  - scoring: server-side ranking, overall = awarded points;
  - scopes: friends / global / country / community, privacy and visibility;
  - manipulation: client writes refused, replays, vehicle-speed, unverified indoor distance, cycling can't dominate, deletion;
  - social: duels, cheers;
  - integrity: hold, dispute, lift;
  - settlement: can't settle early, rewards once, non-public never podium;
  - access: admin, cron.

## 7. Known limitations (honest)
- **No 3D Walkie.** He is a 2D vector character. "Rotate" is a twirl turn-around, not a 3D spin. A rigged 3D/Rive character would need an artist (see `VISUAL_REFERENCE_ANALYSIS.md` §6).
- **Hand slot:** the reference's hand-held items with animation previews are not implemented.
- **Premium icons aren't everywhere yet.** They cover Home, pet, wardrobe, explore, leaderboard and friends. Bottom nav, profile rows, insights and admin still use the clean line-icon set.
- **Rank-change arrows** are tracked for global boards (a daily snapshot), not for friends/country/community.
- **Share rank** is a text share; no image card yet.
- **Streak challenges:** there is no "7-day streak" challenge type (streaks are covered by missions and badges).
- **Scale:** leaderboards scale through an indexed materialised table, but were not load-tested with very large user counts. The rate limiter is in-memory per instance (swap for Redis when running multiple instances).
- **Local SQLite contention:** it can return `503 busy` under heavy parallel writes; use PostgreSQL in production.
- **Mobile:** the iOS/Android projects are generated but must be signed and built on your machines (iOS needs macOS). HealthKit / Health Connect, push and the native Google Maps SDK are NOT TESTED on real devices.
- **Maps:** Google and Apple were verified only up to config/fallback logic, because no real keys were available; the open map renders.
- **Not deployed yet:** walkie.run needs `deploy/setup-vps.sh` run on the VPS (SSH access wasn't available from this workspace).
- **Security:** see the release gate in `docs/SECURITY.md`. Items marked NOT TESTED / PARTIALLY VERIFIED must be closed before calling it production-ready.
