#!/usr/bin/env bash
set -euo pipefail

PORT=8913
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$APP_DIR"

echo "==> Installing dependencies"
npm ci --prefer-offline

echo "==> Setting up Python venv"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install -q -r scripts/requirements.txt

echo "==> Running database migrations"
npx prisma migrate deploy

echo "==> Building Next.js"
npm run build

echo "==> Updating PORT in ecosystem.config.js"
sed -i.bak "s/PORT: [0-9]*/PORT: $PORT/" ecosystem.config.js
rm -f ecosystem.config.js.bak

echo "==> Starting / reloading via PM2 on port $PORT"
if pm2 list | grep -q "credi-insights"; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
fi

pm2 save

echo ""
echo "Deployed. Listening on http://localhost:$PORT"
