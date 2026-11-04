# API reference

All endpoints return `{ ok: true, data }` or `{ ok: false, error: { code, message } }`. They share these rules:
- **Auth:** the `walkie_session` cookie (web) or `Authorization: Bearer <token>` (native).
- **CSRF:** mutating requests must come from the app origin.
- **Validation:** bodies and queries are validated with zod.
- **Rate limits:** per route, with errors such as `rate_limited`.
- **Database contention:** returns `409 conflict` / `503 busy`, never a 500.

Auth column: `public` · `user` (signed in) · `support`/`moderator`/`admin` (minimum role) · `signature` (provider-verified webhook) · `CRON_SECRET`.

Generated from `src/app/api/**/route.ts`.

## achievements

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/achievements` | GET | user |  |
| `/api/achievements/[id]/share` | POST,DELETE | user | Public achievement link. Contains badge + first name + unlock date only — never activity routes or health data |
| `/api/achievements/unseen` | GET,POST | user | Unlocks not yet celebrated in the UI (so an unlock earned via sync/other device still gets its moment). |

## activities

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/activities` | GET,POST | user |  |
| `/api/activities/[id]` | GET,PATCH,DELETE | user | Soft-delete + reward reversal (see deleteActivity). |
| `/api/activities/[id]/share` | POST,DELETE | user | Opt-in public link. Route, name and details are each hidden unless the user chooses to show them. |
| `/api/activities/sessions` | POST,GET | user | Start: the server records the authoritative start time. Any older open session is abandoned. |
| `/api/activities/sessions/[id]` | PATCH | user | Pause / resume / abandon. Paused time is accumulated server-side and never earns points. |
| `/api/activities/stats` | GET | user | Totals per sport for an arbitrary range (defaults to last 7 days). |

## admin

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/admin/audit` | GET | admin |  |
| `/api/admin/catalog/[resource]` | GET,POST | admin |  |
| `/api/admin/catalog/[resource]/[id]` | PATCH,DELETE | admin |  |
| `/api/admin/leaderboard` | GET,POST | moderator | Integrity console: top scores with review flags, disqualifications, disputes, settlement. |
| `/api/admin/referrals` | GET | moderator |  |
| `/api/admin/referrals/[id]` | PATCH | admin |  |
| `/api/admin/settings` | GET,PATCH | admin |  |
| `/api/admin/stats` | GET | support |  |
| `/api/admin/subscriptions` | GET | admin |  |
| `/api/admin/tickets` | GET | support |  |
| `/api/admin/tickets/[id]` | PATCH | support |  |
| `/api/admin/upload` | POST | admin |  |
| `/api/admin/users` | GET | support |  |
| `/api/admin/users/[id]` | GET,PATCH | support |  |
| `/api/admin/users/[id]/coins` | POST | admin | Support adjustments (e.g. compensating a bug). Always ledgered and audited. |
| `/api/admin/users/export` | GET | admin | CSV of account metadata only — no health, location or activity data. |

## ads

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/ads` | GET | user |  |

## analytics

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/analytics` | POST | public |  |

## auth

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/auth/forgot` | POST | public |  |
| `/api/auth/login` | POST | public |  |
| `/api/auth/logout` | POST | public |  |
| `/api/auth/oauth/[provider]` | GET | public |  |
| `/api/auth/oauth/[provider]/callback` | GET,POST | public |  |
| `/api/auth/reset` | POST | public |  |
| `/api/auth/signup` | POST | public |  |
| `/api/auth/verify` | POST | public |  |
| `/api/auth/verify/resend` | POST | user |  |

## billing

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/billing/checkout` | POST | user |  |
| `/api/billing/portal` | POST | user |  |
| `/api/billing/restore` | POST | user | "Restore purchases": re-reads entitlement state from RevenueCat for this user (app_user_id = our user id). |

## challenges

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/challenges` | GET | user |  |
| `/api/challenges/[id]/claim` | POST | user |  |
| `/api/challenges/[id]/join` | POST | user |  |

## cron

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/cron/leaderboard` | POST | CRON_SECRET | Schedule hourly: settles finished weeks/months (rewards once) and expired friendly challenges. Authorization:  |
| `/api/cron/referrals` | POST | CRON_SECRET | Schedule hourly: releases delayed referrer rewards and purges expired IP signals. Authorization: Bearer CRON_S |

## daily-reward

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/daily-reward` | GET | user |  |
| `/api/daily-reward/claim` | POST | user | One claim per user per local day — enforced by the (userId, date) unique index, not just this check. |

## device

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/device/token` | GET | public | Issues a server-signed install identifier. Clients can't mint their own; forged tokens are ignored. |

## duels

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/duels` | GET,POST | user |  |
| `/api/duels/[id]` | POST | user |  |

## friends

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/friends` | GET,POST | user |  |
| `/api/friends/[id]` | PATCH,DELETE | user |  |

## health

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/health/sync` | POST | user |  |

## home

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/home` | GET | user |  |

## insights

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/insights` | GET | user |  |

## leaderboard

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/leaderboard` | GET | user | Server-ranked boards. Exposes display names, Walkie looks and totals only — never routes, locations or health  |
| `/api/leaderboard/cheer` | POST | user | Friendly encouragement — one cheer per friend per day. |
| `/api/leaderboard/dispute` | POST | user |  |
| `/api/leaderboard/results` | GET | user |  |

## me

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/me` | GET,DELETE | admin | Account deletion: personal data is erased (cascade). Requires password or typed confirmation for OAuth-only ac |
| `/api/me/avatar` | POST | user |  |
| `/api/me/export` | GET | user | GDPR-style export of everything we hold about the caller (including their private routes). |
| `/api/me/password` | POST | user |  |
| `/api/me/profile` | PATCH | user |  |

## missions

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/missions` | GET | user |  |
| `/api/missions/[id]/claim` | POST | user |  |

## notifications

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/notifications` | GET | user |  |
| `/api/notifications/read` | POST | user |  |

## pets

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/pets` | GET | user |  |
| `/api/pets/[id]` | GET,PATCH | user |  |
| `/api/pets/[id]/action` | POST | user |  |
| `/api/pets/[id]/active` | POST | user |  |
| `/api/pets/[id]/equip` | POST | user |  |
| `/api/pets/adopt` | POST | user |  |

## plans

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/plans` | GET | user |  |

## push

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/push/register` | POST | user | Called by the native app after the user grants push permission. |

## referrals

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/referrals` | GET | user |  |
| `/api/referrals/[id]/appeal` | POST | user |  |
| `/api/referrals/regenerate` | POST | user |  |
| `/api/referrals/visit` | GET | public | Invite link handler: remembers a valid code for 30 days (httpOnly cookie), then starts onboarding. |

## rewards

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/rewards/config` | GET | public | Public reward configuration so clients can *estimate* rewards. The server always recalculates. |

## shop

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/shop/buy` | POST | user |  |
| `/api/shop/catalog` | GET | user |  |
| `/api/shop/expand` | POST | user |  |
| `/api/shop/layout` | GET,PATCH | user |  |
| `/api/shop/place` | POST | user |  |
| `/api/shop/place/[id]` | PATCH,DELETE | user | Removing returns the item to inventory. |
| `/api/shop/surface` | POST | user | Apply an owned floor, wall or environment. These aren't consumed. |
| `/api/shop/visit` | POST | user |  |

## support

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/support` | POST | public |  |

## users

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/users/[id]/shop` | GET | user | Read-only view of another user's pet shop. Respects their profile visibility. |

## waitlist

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/waitlist` | POST | public |  |

## wardrobe

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/wardrobe` | GET | user |  |
| `/api/wardrobe/appearance` | PATCH | user | Presentation style + fur tone (optional, changeable any time, never inferred from gender). `reset` re-dresses  |
| `/api/wardrobe/looks` | POST | user |  |
| `/api/wardrobe/looks/[id]` | DELETE,POST | user | Wear a saved look (items no longer owned are skipped, never granted). |
| `/api/wardrobe/outfit` | POST | user |  |

## webhooks

| Endpoint | Methods | Auth | Notes |
|---|---|---|---|
| `/api/webhooks/revenuecat` | POST | signature |  |
| `/api/webhooks/stripe` | POST | signature |  |
