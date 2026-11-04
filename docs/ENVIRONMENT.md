# Environment variables

**Integration keys can also be set in Admin → Settings → Integrations & API keys** (OWNER only, password re-entry). Keys saved there:
- are encrypted with `CONFIG_ENCRYPTION_KEY`;
- override the values below;
- take effect within seconds, with no restart.

Infrastructure values can only be set here, never from the web: `DATABASE_URL`, `APP_URL`, `SESSION_SECRET`, `CRON_SECRET`, `SIGNAL_SECRET` and `CONFIG_ENCRYPTION_KEY`.

Every integration is optional. When credentials are missing, the related feature turns itself off and says so: buttons are disabled with an explanation, and the admin "Integrations" panel shows the status. Nothing is faked.

| Variable | Required | Used for | Without it |
|---|---|---|---|
| `DATABASE_URL` | yes | Prisma. `file:./dev.db` locally; `postgresql://…` in production | — |
| `APP_URL` | yes | Absolute links: emails, invite links, OAuth callbacks, share pages | — |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | scripts only | `npm run admin:create` (non-interactive) and the E2E suites | Interactive prompt |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional | Google sign-in (PKCE) | Button hidden |
| `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | optional | Sign in with Apple | Button hidden |
| `RESEND_API_KEY`, `EMAIL_FROM` | optional (needed in prod) | Verification, password-reset and support email | Emails logged to the server console (subject only) in dev |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PLUS_MONTHLY`, `STRIPE_PRICE_PLUS_YEARLY` | optional | Web subscriptions; entitlement comes **only** from verified webhooks | "Subscriptions aren't open yet"; nothing is charged |
| `REVENUECAT_WEBHOOK_AUTH`, `REVENUECAT_SECRET_API_KEY` | optional | App Store / Google Play subscriptions | Native purchase disabled |
| `GOOGLE_MAPS_WEB_KEY`, `GOOGLE_MAPS_IOS_KEY`, `GOOGLE_MAPS_ANDROID_KEY` | optional | Google Maps (JS API on web; native SDK in the apps when enabled in admin). Browser-visible by design, so restrict each key | Google shows as "not ready" in admin and is skipped |
| `APPLE_MAPKIT_TEAM_ID`, `APPLE_MAPKIT_KEY_ID`, `APPLE_MAPKIT_PRIVATE_KEY` | optional | Apple MapKit JS on web and iOS. The .p8 key stays on the server, which signs short-lived tokens | Apple shows as "not ready" and is skipped |
| `MAP_STYLE_URL` (or `NEXT_PUBLIC_MAP_STYLE_URL`) | optional | Open map (MapLibre) style | OpenFreeMap "liberty" style; if every enabled provider fails, a plain SVG route is drawn |
| `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `PAYMONGO_PAYMENT_METHODS` | optional | PayMongo (GCash, Maya, cards, QR Ph) Walkie+ passes on the web. VIP comes only from a verified webhook plus a server re-check | PayMongo buttons hidden |
| `POSTHOG_API_KEY`, `POSTHOG_HOST` | optional | Forwarding first-party analytics (property-sanitised) | Events stay in your DB |
| `FCM_SERVICE_ACCOUNT_JSON` | optional | Push notifications (FCM v1, for Android and iOS through APNs-in-FCM) | In-app notifications only |
| `ADS_PROVIDER`, `ADS_PUBLISHER_ID` | optional | Rewarded ads (off by default; also gated by a flag + setting) | No ads |
| `UPLOAD_DIR` | optional | Avatar and admin image uploads (use a persistent volume, or swap for object storage) | `./public/uploads` |
| `CAP_SERVER_URL` | native builds | URL the Capacitor shell loads | — |
| `CRON_SECRET` | prod | Bearer token for `POST /api/cron/referrals` and `POST /api/cron/leaderboard` | Cron endpoints return 401; leaderboards still settle lazily when someone opens them |
| `CONFIG_ENCRYPTION_KEY` | to edit keys in admin | AES-256-GCM key for integration keys saved in the admin panel | Admin shows status only; keys come from this file |
| `SIGNAL_SECRET` | prod | HMAC key for IP hashes and install tokens (referral anti-abuse) | Uses `CRON_SECRET`. Without either in production, a random per-process key is used, so hashes don't survive restarts |

## Credential-gated features (summary)
- **Payments:** Stripe and RevenueCat.
- **Social sign-in:** Google and Apple.
- **Transactional email:** Resend.
- **Push:** FCM.
- **Maps:** Google keys, Apple MapKit key, or the open style (works with no key).
- **PayMongo:** secret key + webhook secret.
- **Analytics forwarding:** PostHog.
- **Ads.**
- **HealthKit / Health Connect:** need native builds with the entitlements in `docs/MOBILE.md`; there is no key.

## Trust & proxies
Rate limits and hashed-IP risk signals read the first `X-Forwarded-For` hop. Deploy behind a proxy that **overwrites** that header, such as Vercel, Cloudflare or nginx with `real_ip`.

The in-memory rate limiter is per instance. For multiple instances, swap `src/lib/rate-limit.ts` for Redis/Upstash; the interface is one function.
