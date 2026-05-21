#!/usr/bin/env bash
# Cholon Bil Organic — production deployment script
# Usage: bash deploy.sh
# Run from the repo root on the VPS.

set -euo pipefail

APP_DIR="/var/www/cholonbil"
PNPM="pnpm"

echo "▶ Pulling latest code..."
git pull origin main

echo "▶ Installing dependencies..."
$PNPM install --frozen-lockfile

echo "▶ Building shared packages..."
$PNPM --filter @cholonbil/types build 2>/dev/null || true
$PNPM --filter @cholonbil/config build 2>/dev/null || true

echo "▶ Building API..."
$PNPM --filter @cholonbil/api build

echo "▶ Building web..."
$PNPM --filter @cholonbil/web build

echo "▶ Reloading PM2 (zero-downtime)..."
pm2 reload ecosystem.config.cjs --env production

echo "▶ Saving PM2 process list..."
pm2 save

echo "✅ Deployment complete."
pm2 status
