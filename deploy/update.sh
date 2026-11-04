#!/usr/bin/env bash
# Pull the latest code, migrate, rebuild, restart (≈1–2 min of build; the old version keeps serving until restart).
set -euo pipefail
APP_DIR=/var/www/walkie; BRANCH="${BRANCH:-main}"
[ "$(id -u)" = 0 ] || { echo "Run as root (sudo)."; exit 1; }
cd "$APP_DIR"
sudo -u walkie git fetch -q origin "$BRANCH"
sudo -u walkie git reset -q --hard "origin/$BRANCH"
sudo -u walkie git clean -qfd prisma          # undo the previous Postgres switch before re-applying it
sudo -u walkie node scripts/use-postgres.mjs
sudo -u walkie npm ci --no-audit --no-fund --loglevel=error
sudo -u walkie npx prisma migrate deploy
sudo -u walkie npm run -s db:seed
sudo -u walkie npm run -s build
systemctl restart walkie
sleep 3; curl -fs -o /dev/null -w "local app → HTTP %{http_code}\n" http://127.0.0.1:3210/
