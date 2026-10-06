#!/usr/bin/env bash
# Deploy AuditKit to the VPS. Adds only: one container, one nginx site, one web root. Never touches other services.
# Usage: deploy/deploy.sh [host]   (default root@187.77.15.149, key ~/.ssh/hostinger_vps)
set -euo pipefail
HOST=${1:-root@187.77.15.149}
SSH="ssh -i $HOME/.ssh/hostinger_vps $HOST"
ROOT=$(cd "$(dirname "$0")/.." && pwd)

echo "== build site locally"
(cd "$ROOT" && pnpm --filter @auditkit/web build)

echo "== sync source and site"
$SSH "mkdir -p /opt/auditkit /var/www/auditkit"
rsync -az --delete -e "ssh -i $HOME/.ssh/hostinger_vps" --exclude node_modules --exclude '.venv' --exclude 'packages/web/dist' --exclude 'data' --exclude 'deploy/.env' --exclude '.git' "$ROOT/" "$HOST:/opt/auditkit/src/"
rsync -az --delete -e "ssh -i $HOME/.ssh/hostinger_vps" "$ROOT/packages/web/dist/" "$HOST:/var/www/auditkit/"

echo "== container"
$SSH "test -f /opt/auditkit/src/deploy/.env || { cp /opt/auditkit/src/deploy/.env.example /opt/auditkit/src/deploy/.env; echo 'created deploy/.env from example: fill RESEND/STRIPE later'; }"
$SSH "cd /opt/auditkit/src/deploy && docker compose up -d --build"

echo "== nginx (only if our site file is missing)"
$SSH "test -f /etc/nginx/sites-available/auditkit.dev || { cp /opt/auditkit/src/deploy/nginx-auditkit.conf /etc/nginx/sites-available/auditkit.dev; ln -s /etc/nginx/sites-available/auditkit.dev /etc/nginx/sites-enabled/auditkit.dev; }"
$SSH "nginx -t && systemctl reload nginx"

echo "== smoke"
$SSH "curl -s http://127.0.0.1:3001/health && echo && docker ps --filter name=auditkit --format '{{.Names}} {{.Status}}'"
echo "done. Next: certbot --nginx -d auditkit.dev -d www.auditkit.dev -d api.auditkit.dev"
