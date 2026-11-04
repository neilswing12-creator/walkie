# Walkie.run — security assessment & release gate

**Scope:** web app, REST API, admin, auth, storage, payments (PayMongo / Stripe / RevenueCat), database and the deployment kit (`deploy/`).
**Method:**
- Code review of every route handler (98 routes) and of the shared auth / role / CSRF / rate-limit wrapper.
- Dependency audit (`npm audit --omit=dev`).
- **Active testing:** `scripts/e2e-security.mjs` makes 76 attack-style checks against a production build with test secrets and a mocked PayMongo API. The core, referral and leaderboard suites add 214 more checks.
- A live nginx run of the shipped config with throwaway certificates.

Testing used test accounts and test secrets only; no real payment details were involved.

**This is not a claim that Walkie is unhackable.** It is what was implemented, what was tested, and what remains.

## Release gate

| Area | Status | Evidence |
|---|---|---|
| **Password storage** (bcrypt cost 12, salted; never logged or returned) | PASS | Unit + E2E. No hash in any API response; audit/analytics rows scanned for test passwords. |
| **Login** (generic errors, constant-time, brute-force limits) | PASS | Identical 401 for an unknown email and a wrong password (~580 ms each). 9th attempt → 429. nginx adds a per-IP auth limit. |
| **Registration** | PARTIALLY VERIFIED | Signup returns 409 for an existing email (enumeration). Kept for UX; mitigated by per-network signup limits. See R-3. |
| **Password reset** (hashed, single-use, 1 h expiry, signs out everywhere) | PASS | Reuse, expiry and wrong token type are all rejected; sessions revoked. |
| **Password change** (needs current password, revokes other sessions, emails the user) | PASS | E2E: second device signed out, current device kept. |
| **Sessions** (opaque random tokens, SHA-256 at rest, HttpOnly, SameSite=Lax, Secure in prod, 30-day expiry, revocation, "sign out other devices") | PASS | Forged token → 401; demotion and bans revoke sessions; expired sessions are purged hourly. |
| **Staff sessions** (12 h max for admin tools; step-up password for roles, bans and coins) | PASS | E2E: 13 h-old staff session gets `reauth_required`; role change without password → 401. |
| **OAuth** (Google / Apple: PKCE + state, ID-token JWKS check; links only verified emails) | PARTIALLY VERIFIED | Code-reviewed; pre-account-takeover guard added (F-4). Live provider round trip needs credentials → BLOCKED for end-to-end. |
| **CSRF** (Origin allow-list on every mutating request; no-Origin rejected in prod) | PASS | E2E. |
| **IDOR / broken access control** | PASS | E2E: activities, shares, pets, equip, pet actions, saved looks, friendships, duels, referral appeals and admin APIs all checked with another user's IDs. |
| **Mass assignment** | PASS | zod schemas strip unknown fields. E2E: role/status/password/VIP/rewards fields ignored. |
| **Injection** (SQL) | PASS | Prisma parameterised queries only (no `$queryRaw` with input; one constant `PRAGMA` on SQLite). Injection-style inputs tested. |
| **XSS** | PASS (with caveat) | React escaping; no `dangerouslySetInnerHTML` with user data; stored-XSS probe escaped on public pages. CSP added, but it allows `'unsafe-inline'` scripts (R-2). |
| **Security headers** (CSP, HSTS preload, nosniff, X-Frame-Options DENY, COOP, Referrer-Policy, Permissions-Policy, no X-Powered-By, nginx `server_tokens off`) | PASS | E2E + live nginx (single HSTS header). |
| **Uploads** (magic-byte sniffing, SVG/HTML/EXE rejected, random names, size caps, no path traversal; nginx denies scripts in /uploads) | PASS | E2E + live nginx (`.html` in uploads → 403). |
| **Private file storage** | N/A | Walkie stores no private user files. Avatars are public by design. Exports are generated on demand for the owner only. |
| **Request size / DoS** (2 MB JSON cap before validation; nginx 6 MB; per-route rate limits) | PASS | E2E: 3 MB body → 413. |
| **Payments: PayMongo** | PASS | Server prices; signed webhook (`li`/`te`, 5-min window); amount, currency and order re-verified with PayMongo's API; test-mode events ignored in prod; replay-safe; passes stack; refunds revoke. 21 E2E checks. |
| **Payments: Stripe** | PASS | Signature required; out-of-order events can't resurrect canceled subscriptions; full refund revokes; idempotent per event. |
| **Payments: RevenueCat** | PARTIALLY VERIFIED | Webhook secret enforced and out-of-order guard added. A real store sandbox purchase needs credentials → BLOCKED. |
| **Payments: client-side bypass** | PASS | No endpoint grants Plus; the success redirect grants nothing; the VIP fields can't be written. |
| **Virtual economy** (coins, rewards, referrals, leaderboards, inventory) | PASS | Ledger with unique idempotency keys; conditional updates; concurrency tests in the core, referral and leaderboard suites. |
| **Admin RBAC** (USER < SUPPORT < MODERATOR < ADMIN < OWNER) | PASS | E2E: users locked out; admins can't create admins/owners or touch the owner; no self coin grants; moderators can't change roles; audit-logged. |
| **Secrets** | PASS | No secrets in source or client bundles (bundle scan). `.env` git-ignored and `chmod 600` on the server. Production refuses hardcoded fallbacks. |
| **Logging** (no passwords, tokens or query args) | PASS | Error logs keep only the error code and first line; DB scan for test secrets. |
| **Monitoring** (failed logins, throttling, forbidden admin attempts, forged webhooks, payment verification failures → Admin › Security) | PASS | Events recorded with hashed IP; thresholds highlighted. No external alerting yet (R-6). |
| **Dependencies** | PARTIALLY VERIFIED | Criticals fixed. Remaining highs are build/CLI-only (R-1). |
| **VPS: firewall, SSH, TLS, DB exposure** | BLOCKED | Script hardens (ufw 22/80/443, fail2ban, unattended upgrades, localhost-only Postgres, non-root systemd service, TLS); the nginx config was validated live. It can't be verified on your server without access. |
| **Privacy (PH DPA)** | PARTIALLY VERIFIED | Policy updated (rights, NPC, DPO contact, processors, retention); export and deletion exist. A DPO appointment and NPC registration (if thresholds apply) are organisational steps for you. |

## Findings (this audit)

| # | Severity | Component | Finding | Fix | Retest |
|---|---|---|---|---|---|
| F-1 | **Critical** | Dependencies | Capacitor Android/iOS 7.4: remote content could be loaded at runtime | Upgraded to 7.6.10 | `npm audit`: cleared |
| F-2 | **Critical** | Dependencies | maplibre-gl 5.x XSS sanitiser bypass | Upgraded to 6.16 | cleared; typecheck/build OK |
| F-3 | **High** | Payments / Stripe | Older webhook events delivered late could re-activate a canceled subscription | `providerEventAt` ordering guard (Stripe + RevenueCat) | E2E PASS |
| F-4 | **High** | Auth / OAuth | Pre-account takeover: an attacker registers a victim's email with a password, and the victim later signs in with Google/Apple | Verified OAuth wipes the unverified password and revokes its sessions | Code-reviewed (needs live OAuth) |
| F-5 | **High** | Payments / Stripe | A full refund without cancellation kept Plus active | `charge.refunded` (full) revokes | E2E PASS |
| F-6 | **Medium** | Auth | Password change didn't sign out other devices | Revokes all other sessions and sends an email | E2E PASS |
| F-7 | **Medium** | Admin | No Owner role; admins could create admins; no step-up; admin could adjust own coins; 30-day admin sessions | OWNER role, owner-only admin grants, password step-up, self-adjust blocked, 12 h staff sessions, demotion revokes sessions | E2E PASS (14 checks) |
| F-8 | **Medium** | Headers | No Content-Security-Policy | CSP added (no `unsafe-eval` in prod; frame-ancestors/object-src none) | E2E PASS |
| F-9 | **Medium** | Logging | Prisma errors could echo query arguments into logs | Logs now carry only the error code and first line | Reviewed |
| F-10 | **Medium** | API | Unbounded JSON bodies (zod memory advisory) | 2 MB cap before parsing | E2E PASS |
| F-11 | **Medium** | Auth | Login `next=` accepted `/\evil.com` (open redirect in some browsers) | Strict same-site path check | Reviewed |
| F-12 | **Low** | Monitoring | No security event trail | SecurityEvent table + Admin › Security page + 180-day retention | E2E (events written) |
| F-13 | **Low** | Retention | Expired sessions and used tokens were kept forever | Hourly purge | Reviewed |
| F-14 | **Low** | Deploy | nginx `http2 on;` breaks on Ubuntu's nginx 1.24; HSTS duplicated | Compatible `listen … http2`; single HSTS | Live nginx PASS |
| (earlier) | High | Shop / Activities | 0-coin reward items purchasable; car-speed GPS walks earning points | Fixed in the previous phase | E2E PASS |

## Remaining risks (accepted / follow-up)
- **R-1 Dependencies:** `next` (nested postcss), `prisma` CLI (`@prisma/config` → effect / deepmerge-ts) and `zod` 3 have advisories.
  - postcss and the Prisma CLI run only at build/CLI time and never process user input.
  - zod is mitigated by the 2 MB body cap and `.max()` limits.
  - Plan: upgrade to Next 16, Prisma 7 and zod 4 in a dedicated release, since all three are breaking changes.
- **R-2 CSP:** CSP allows `'unsafe-inline'` scripts because Next.js injects inline bootstrap scripts. A nonce-based CSP (middleware) would remove this, at the cost of making every page dynamic.
- **R-3 Signup enumeration:** signup tells you an email is taken. Login, reset and friend search do not leak. To close it fully, switch signup to "check your email" for every address.
- **R-4 Rate limiting:** limits are in memory per process and reset on restart. For multiple instances, use Redis; nginx `limit_req` adds a persistent first layer.
- **R-5 No MFA:** there is no TOTP/passkey second factor yet. Recommended for OWNER/ADMIN accounts before scale.
- **R-6 No external alerting:** events are visible in the admin panel but not pushed to you. Connect an uptime/alert service, or email on thresholds.
- **R-7 Backups:** nightly `pg_dump` runs on the same server (mode 700). Copy them off-server, encrypted (e.g. restic to object storage).
- **R-8 Native builds** must be signed with your keys. Store keystores and Apple certificates outside the repo.

## Credentials: rotation guidance
No credentials have been committed or exposed. The repo history starts clean; `.env*`, keys and DBs are git-ignored.

If a credential is ever exposed:
1. **Rotate at the provider:**
   - PayMongo / Stripe: roll the secret key, then the webhook secret.
   - RevenueCat webhook auth.
   - Google / Apple OAuth client secret.
   - Resend.
   - FCM service account.
2. **Update the server:** put the new values in `/var/www/walkie/.env`, then `sudo systemctl restart walkie`.
3. **Specific cases:**
   - `CRON_SECRET`: also updates `/etc/cron.d/walkie`. Re-run the setup script or edit by hand.
   - `SIGNAL_SECRET`: rotating it resets referral risk hashes and install tokens. That's acceptable.
   - Database password: `ALTER ROLE walkie PASSWORD '…'`, then update `.env` and `/etc/walkie/db.pass`.

## Incident response (basic plan)
1. **Account compromise:**
   - Force a password reset (Admin → user → ban, then restore), or ask the user to reset.
   - Sessions are revoked automatically; review the user's `SecurityEvent`s and audit trail.
2. **Credential exposure:** rotate per the steps above, check provider logs for misuse, and record it in the audit log.
3. **Payment abuse:**
   - Admin › Security shows forged-webhook and verification-failure counts.
   - Reconcile `PaymentEvent` / `PaymentOrder` against the PayMongo / Stripe dashboards; revoke via refund events or a status change.
4. **Unauthorized access / privilege change:**
   - Admin › Security lists privileged changes. The Owner demotes the account, which revokes its sessions.
   - Rotate `CRON_SECRET` if admin tooling may be affected.
5. **Data breach:** contain (firewall, stop the service), preserve logs, assess what was affected, then notify the NPC and affected users within **72 hours** where required under NPC Circular 16-03, and fix root causes.
6. **Server compromise:**
   - Rebuild from a clean OS image and run `deploy/setup-vps.sh`.
   - Restore the latest clean `pg_dump`.
   - Rotate **all** secrets; revoke all sessions (`DELETE FROM "Session";`).
7. **Backup recovery:** `pg_restore -d walkie /var/www/walkie-data/backups/walkie-N.dump` (N = weekday). Test this monthly.


## Admin-managed integration keys
Owners can set payment, email, sign-in, maps, push, analytics and ads keys in Admin → Settings.

**Controls**
- OWNER role only (admins see status, not values) and password re-entry on every save.
- Rate-limited: 12 saves per 10 minutes.
- Allow-listed keys only. Infrastructure secrets are never editable from the web.
- Format checks on every key.
- Encrypted at rest with AES-256-GCM. The key name is bound as authenticated data, so a row copied onto another key fails to decrypt. The encryption key lives only in the server environment, so a database dump alone reveals nothing.
- Write-only: no API returns a saved secret, only whether it's set and where it comes from.
- Audited by key name, never by value, in the audit log and security events.

**Tests:** 13 checks in `scripts/e2e-security.mjs` (section "Integration keys").

**Status:** PASS, against a production build.

**Residual risk:** anyone with both shell access to the server and the database can decrypt these keys, the same as with the `.env` file. Rotate keys at the provider if the server is compromised.
