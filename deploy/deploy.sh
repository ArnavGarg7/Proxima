#!/usr/bin/env bash
#
# First-boot deploy helper for a single Ubuntu (ARM) VM — e.g. an Oracle Cloud
# Always Free Ampere instance. Run it from the repo root AFTER creating your
# env files:
#
#   cp deploy/.env.example .env      && nano .env            # topology
#   cp backend/.env.example backend/.env    && nano backend/.env    # secrets
#   ./deploy/deploy.sh
#
# Safe to re-run (idempotent). Adds firewall ACCEPT rules only — never drops.
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml -f deploy/docker-compose.deploy.yml"

echo "==> Checking env files"
[ -f .env ] || { echo "ERROR: missing repo-root .env  (cp deploy/.env.example .env)"; exit 1; }
[ -f backend/.env ] || { echo "ERROR: missing backend/.env  (cp backend/.env.example backend/.env)"; exit 1; }

echo "==> Installing Docker (if missing)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER" || true
fi

echo "==> Opening HTTP/HTTPS in the instance firewall"
# Oracle's Ubuntu images ship an iptables INPUT chain that rejects everything
# except SSH. Insert ACCEPT rules for 80/443 at the top so Caddy can serve and
# complete the Let's Encrypt HTTP-01 challenge. (Also open them in the VCN
# Security List in the Oracle console — see deploy/README.md.)
for port in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT -p tcp --dport "$port" -j ACCEPT
  fi
done
if command -v netfilter-persistent >/dev/null 2>&1; then
  sudo netfilter-persistent save || true
fi

echo "==> Building and starting the stack (this pulls/builds images the first time)"
sudo $COMPOSE up -d --build

echo
echo "==> Done. The 'migrate' service runs alembic upgrade head before the app starts."
echo "    Watch TLS provisioning + startup:"
echo "      sudo $COMPOSE logs -f caddy backend migrate"
echo "    Once Caddy reports a certificate, visit: https://\$(grep '^SITE_ADDRESS' .env | cut -d= -f2)"
