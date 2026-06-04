#!/usr/bin/env bash
# Shukhi Life — production deployment script
# Usage: bash deploy.sh
# Run from the repo root on the VPS.

set -euo pipefail

# Run from the repo root regardless of where this script is invoked from
# (works for the CloudPanel site path, e.g. /home/<site-user>/htdocs/shukhilife.com).
cd "$(dirname "$(readlink -f "$0")")"
PNPM="pnpm"

echo "▶ Pulling latest code..."
git pull origin main

echo "▶ Installing dependencies..."
$PNPM install --frozen-lockfile

echo "▶ Building shared packages..."
$PNPM --filter @shukhilife/types build 2>/dev/null || true
$PNPM --filter @shukhilife/config build 2>/dev/null || true

echo "▶ Building API..."
$PNPM --filter @shukhilife/api build

echo "▶ Building web..."
$PNPM --filter @shukhilife/web build

echo "▶ Reloading PM2 (zero-downtime)..."
pm2 reload ecosystem.config.cjs --env production

echo "▶ Saving PM2 process list..."
pm2 save

echo "✅ Deployment complete."
pm2 status
