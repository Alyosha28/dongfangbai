#!/usr/bin/env bash
set -euo pipefail

SERVER_HOST="${SERVER_HOST:-root@168.144.109.12}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/finalwhite.lol}"

echo "==> Building..."
npm run build

echo "==> Syncing dist/ to ${SERVER_HOST}:${REMOTE_DIR}"
rsync -avz --delete \
  --exclude='_worker.js' \
  --exclude='_routes.json' \
  --exclude='.wrangler' \
  dist/ "${SERVER_HOST}:${REMOTE_DIR}/"

echo "==> Done. Visit https://finalwhite.lol"
