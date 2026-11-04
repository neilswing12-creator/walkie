# Operations

## Scheduled jobs (hourly)
```bash
curl -X POST https://walkie.run/api/cron/leaderboard -H "Authorization: Bearer $CRON_SECRET"   # settle finished weeks/months + duels
curl -X POST https://walkie.run/api/cron/referrals   -H "Authorization: Bearer $CRON_SECRET"   # release delayed referrer rewards, purge expired IP hashes
```
Both jobs are idempotent: results and rewards are keyed per user and period in the ledger. Leaderboards also settle lazily when someone opens them, as a backup.

Weeks and months settle **one grace day** after they end. Late health syncs and backfills (up to 7 days old) still count until then.

## Leaderboard integrity workflow
1. **Admin → Leaderboards** lists top scores per board with review hints:
   - `daily cap hit Nx`;
   - `flagged activities N` (failed speed/GPS checks — these never score);
   - `unverified distance excluded`.
   Hints never remove anyone automatically.
2. **Recompute** rebuilds a user's scores from the raw records.
3. **Hold entry** for one period or all boards (reversible). The user sees a neutral notice, and their activities, coins and badges are untouched.
4. The user can ask for a review (dispute). **Accept** lifts the hold; **Reject** replies. Every action goes to the audit log.

Scoring weights, caps, periods, scopes, timezone/week start, rewards, tiers and duel coins all live in **Settings → Leaderboards**.

## Referral review
**Admin → Referrals** shows status totals, conversion, flag rate, top referrers and the review queue.
- Moderators see statuses and masked emails.
- Admins see risk signals as reason codes, history and appeals, and can approve (grants both rewards once) or reject (revokes VIP credits).
- Raw IPs and device IDs are never stored or shown.

## Database
- **Production:** PostgreSQL.
  1. Run `node scripts/use-postgres.mjs` (switches the Prisma provider).
  2. Run `npx prisma migrate deploy`, then `npm run db:seed`. The seed is idempotent and keeps admin edits.
- **Local:** SQLite in WAL mode with a busy timeout. Under heavy parallel writes SQLite serialises and may return `503 busy`; PostgreSQL doesn't have this limit.
- **Back up** the database and `UPLOAD_DIR`.

## Privacy & data
- **Export / delete:** users can export (`/api/me/export`) and delete their account from Profile. Deletion cascades.
- **Risk signals:** stored only as IP HMACs, kept for `referrals.ipRetentionDays` (default 30) and purged by the cron.
- **Location:** GPS routes are private by default. Leaderboard country and community are chosen by the user and never derived from location.
