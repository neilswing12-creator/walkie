#!/usr/bin/env bash
# Walkie.run — one-shot production setup for Ubuntu 22.04/24.04 or Debian 12 (run as root).
#   sudo bash setup-vps.sh you@example.com          # email is used for Let's Encrypt expiry notices
# Idempotent: safe to re-run. Installs Node 22, PostgreSQL, nginx, certbot; deploys to /var/www/walkie;
# runs the app as the unprivileged "walkie" user via systemd; configures nginx + HTTPS for walkie.run and www.walkie.run.
set -euo pipefail
DOMAIN="${DOMAIN:-walkie.run}"
APP_DIR="/var/www/walkie"
DATA_DIR="/var/www/walkie-data"           # uploads + backups live outside the git checkout
REPO="${REPO:-https://github.com/neilswing12-creator/walkie.git}"
BRANCH="${BRANCH:-main}"
EMAIL="${1:-}"
PORT=3210

[ "$(id -u)" = 0 ] || { echo "Run as root (sudo)."; exit 1; }
log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

log "Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ca-certificates gnupg nginx certbot python3-certbot-nginx postgresql openssl ufw fail2ban unattended-upgrades >/dev/null
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "node $(node -v) · npm $(npm -v)"

log "Server hardening (firewall, SSH brute-force protection, automatic security updates)"
SSH_PORTS="$( (sshd -T 2>/dev/null | awk '/^port /{print $2}') || true)"; SSH_PORTS="${SSH_PORTS:-22}"
for p in $SSH_PORTS; do ufw allow "${p}/tcp" >/dev/null; done      # never lock you out of SSH
ufw allow 80/tcp >/dev/null && ufw allow 443/tcp >/dev/null
ufw default deny incoming >/dev/null && ufw default allow outgoing >/dev/null
ufw --force enable >/dev/null && echo "firewall: only SSH (${SSH_PORTS}), 80 and 443 are open; PostgreSQL and the app port stay private"
cat > /etc/fail2ban/jail.d/walkie.local <<F2B
[sshd]
enabled = true
maxretry = 5
bantime = 1h
F2B
systemctl enable --now fail2ban >/dev/null 2>&1 || true
echo 'APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";' > /etc/apt/apt.conf.d/20auto-upgrades
# PostgreSQL listens on localhost only (Debian/Ubuntu default) — verified below

log "App user & folders"
id walkie >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/walkie --shell /usr/sbin/nologin walkie
mkdir -p "$APP_DIR" "$DATA_DIR/uploads" "$DATA_DIR/backups"
chown -R walkie:walkie "$APP_DIR" "$DATA_DIR"

log "PostgreSQL"
systemctl enable --now postgresql >/dev/null
if [ ! -f /etc/walkie/db.pass ]; then
  mkdir -p /etc/walkie && chmod 700 /etc/walkie
  openssl rand -hex 24 > /etc/walkie/db.pass && chmod 600 /etc/walkie/db.pass
fi
DBPASS="$(cat /etc/walkie/db.pass)"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='walkie'" | grep -q 1 || sudo -u postgres psql -qc "CREATE ROLE walkie LOGIN PASSWORD '$DBPASS';"
sudo -u postgres psql -qc "ALTER ROLE walkie PASSWORD '$DBPASS';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='walkie'" | grep -q 1 || sudo -u postgres psql -qc "CREATE DATABASE walkie OWNER walkie;"
sudo -u postgres psql -qc "REVOKE ALL ON DATABASE walkie FROM PUBLIC;"   # least privilege: only the app role
LISTEN="$(sudo -u postgres psql -tAc 'SHOW listen_addresses')"; [ "$LISTEN" = "localhost" ] || echo "WARNING: PostgreSQL listen_addresses=$LISTEN — set it to localhost unless you really need remote access"

log "Code ($REPO @ $BRANCH)"
if [ -d "$APP_DIR/.git" ]; then
  sudo -u walkie git -C "$APP_DIR" fetch -q origin "$BRANCH"
  sudo -u walkie git -C "$APP_DIR" reset -q --hard "origin/$BRANCH"
  sudo -u walkie git -C "$APP_DIR" clean -qfd prisma
else
  [ -z "$(ls -A "$APP_DIR")" ] || { echo "$APP_DIR is not empty and not a git checkout — move its contents away first."; exit 1; }
  sudo -u walkie git clone -q --branch "$BRANCH" "$REPO" "$APP_DIR"
fi

log "Environment (.env — secrets generated once, never overwritten)"
ENV="$APP_DIR/.env"
if [ ! -f "$ENV" ]; then
  cat > "$ENV" <<ENVEOF
NODE_ENV=production
DATABASE_URL="postgresql://walkie:${DBPASS}@127.0.0.1:5432/walkie?schema=public"
APP_URL="https://${DOMAIN}"
CRON_SECRET="$(openssl rand -hex 32)"
SIGNAL_SECRET="$(openssl rand -hex 32)"
UPLOAD_DIR="${DATA_DIR}/uploads"
# Optional integrations — fill in when ready, then: sudo systemctl restart walkie
PAYMONGO_SECRET_KEY=""
PAYMONGO_WEBHOOK_SECRET=""
PAYMONGO_PAYMENT_METHODS="gcash,paymaya,card,qrph"
EMAIL_FROM="Walkie <hello@${DOMAIN}>"
RESEND_API_KEY=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
APPLE_CLIENT_ID=""
APPLE_TEAM_ID=""
APPLE_KEY_ID=""
APPLE_PRIVATE_KEY=""
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PRICE_PLUS_MONTHLY=""
STRIPE_PRICE_PLUS_YEARLY=""
REVENUECAT_WEBHOOK_AUTH=""
REVENUECAT_SECRET_API_KEY=""
NEXT_PUBLIC_MAP_STYLE_URL=""
POSTHOG_API_KEY=""
POSTHOG_HOST=""
FCM_SERVICE_ACCOUNT_JSON=""
ENVEOF
fi
chown walkie:walkie "$ENV" && chmod 600 "$ENV"
chmod 750 "$APP_DIR"

log "Install, migrate, seed, build"
cd "$APP_DIR"
sudo -u walkie node scripts/use-postgres.mjs
sudo -u walkie npm ci --no-audit --no-fund --loglevel=error
sudo -u walkie npx prisma migrate deploy
sudo -u walkie npm run -s db:seed
sudo -u walkie npm run -s build

log "systemd service"
install -m 644 "$APP_DIR/deploy/walkie.service" /etc/systemd/system/walkie.service
systemctl daemon-reload
systemctl enable walkie >/dev/null
systemctl restart walkie
for i in $(seq 1 30); do curl -fs -o /dev/null "http://127.0.0.1:${PORT}/" && break; sleep 1; done
curl -fs -o /dev/null "http://127.0.0.1:${PORT}/" && echo "app is up on 127.0.0.1:${PORT}" || { journalctl -u walkie -n 40 --no-pager; exit 1; }

log "nginx"
install -m 644 "$APP_DIR/deploy/nginx/walkie.run.conf" "/etc/nginx/sites-available/${DOMAIN}.conf"
ln -sf "/etc/nginx/sites-available/${DOMAIN}.conf" "/etc/nginx/sites-enabled/${DOMAIN}.conf"
rm -f /etc/nginx/sites-enabled/default
mkdir -p /var/www/certbot
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  # temporary HTTP-only server so certbot can answer the challenge
  cat > /etc/nginx/sites-enabled/${DOMAIN}.conf <<NGX
server { listen 80; listen [::]:80; server_name ${DOMAIN} www.${DOMAIN};
  location /.well-known/acme-challenge/ { root /var/www/certbot; }
  location / { proxy_pass http://127.0.0.1:${PORT}; proxy_set_header Host \$host; proxy_set_header X-Forwarded-For \$remote_addr; proxy_set_header X-Forwarded-Proto \$scheme; } }
NGX
  nginx -t && systemctl reload nginx
  if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then ufw allow 'Nginx Full' >/dev/null; fi
  log "SSL certificate (Let's Encrypt)"
  SERVER_IP="$(curl -fs4 https://api.ipify.org || true)"; DNS_IP="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}')"
  [ -n "$SERVER_IP" ] && [ "$SERVER_IP" != "$DNS_IP" ] && echo "WARNING: ${DOMAIN} resolves to ${DNS_IP:-nothing}, this server is ${SERVER_IP}. Fix the DNS A record if certbot fails."
  WWW=""; getent ahostsv4 "www.${DOMAIN}" >/dev/null && WWW="-d www.${DOMAIN}"
  if [ -n "$EMAIL" ]; then ACCT=(--email "$EMAIL"); else ACCT=(--register-unsafely-without-email); fi
  certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" $WWW --agree-tos --non-interactive "${ACCT[@]}"
  [ -n "$WWW" ] || sed -i "s/ www.${DOMAIN}//g" "$APP_DIR/deploy/nginx/walkie.run.conf"
  install -m 644 "$APP_DIR/deploy/nginx/walkie.run.conf" "/etc/nginx/sites-available/${DOMAIN}.conf"
  ln -sf "/etc/nginx/sites-available/${DOMAIN}.conf" "/etc/nginx/sites-enabled/${DOMAIN}.conf"
fi
[ -f /etc/letsencrypt/options-ssl-nginx.conf ] || curl -fsSL https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf -o /etc/letsencrypt/options-ssl-nginx.conf
[ -f /etc/letsencrypt/ssl-dhparams.pem ] || openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048 2>/dev/null
nginx -t && systemctl reload nginx
# renewals: certbot's systemd timer is installed by the package; reload nginx after each renewal
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh && chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

log "Scheduled jobs (hourly) & nightly DB backup"
CRON_SECRET_VAL="$(grep '^CRON_SECRET=' "$ENV" | cut -d'"' -f2)"
cat > /etc/cron.d/walkie <<CRON
SHELL=/bin/sh
7 * * * * walkie curl -fs -X POST -H "Authorization: Bearer ${CRON_SECRET_VAL}" http://127.0.0.1:${PORT}/api/cron/leaderboard >/dev/null
17 * * * * walkie curl -fs -X POST -H "Authorization: Bearer ${CRON_SECRET_VAL}" http://127.0.0.1:${PORT}/api/cron/referrals >/dev/null
40 3 * * * postgres pg_dump -Fc walkie > ${DATA_DIR}/backups/walkie-\$(date +\%u).dump
CRON
chmod 600 /etc/cron.d/walkie
chown postgres "$DATA_DIR/backups" && chmod 700 "$DATA_DIR/backups"   # DB dumps contain personal data

log "Done"
curl -fs -o /dev/null -w "https://${DOMAIN} → HTTP %{http_code}\n" "https://${DOMAIN}/" || true
cat <<MSG
Create your admin account:
  sudo -u walkie bash -c 'cd ${APP_DIR} && npx tsx scripts/create-admin.ts you@example.com "a-strong-password"'
Update later:   sudo bash ${APP_DIR}/deploy/update.sh
Logs:           journalctl -u walkie -f
Secrets:        ${ENV} (chmod 600) — add API keys there, then: sudo systemctl restart walkie
Strongly recommended: use SSH keys and set "PasswordAuthentication no" in /etc/ssh/sshd_config
                (not changed automatically so you can't get locked out).
MSG
