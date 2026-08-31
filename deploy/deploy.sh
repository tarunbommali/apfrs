#!/usr/bin/env bash
# ==============================================================================
# deploy/deploy.sh
# APFRS Production Release Deployment Script
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "========================================================="
echo "🚀 Deploying APFRS Release"
echo "Directory: $APP_ROOT"
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%SZ")"
echo "========================================================="

cd "$APP_ROOT"

# 1. Update source code if under git version control
if [ -d ".git" ]; then
  echo "📥 Pulling latest git release..."
  git pull --ff-only
fi

# 2. Install Backend Dependencies
echo "📦 Installing backend production dependencies..."
cd "$APP_ROOT/backend"
npm ci --omit=dev

# 3. Install Frontend Dependencies & Build Static Assets
echo "📦 Installing frontend dependencies & building SPA..."
cd "$APP_ROOT/frontend"
npm ci
npm run build

# Verify frontend build artifact exists
if [ ! -f "$APP_ROOT/frontend/dist/index.html" ]; then
  echo "❌ Error: Frontend build failed. dist/index.html not found. Deployment aborted." >&2
  exit 1
fi
echo "✅ Frontend production build succeeded."

# 4. Execute Non-Destructive Database Migrations
echo "🗄️ Running database schema setup & forward-only migrations..."
cd "$APP_ROOT/backend"
node database/db-setup.js
echo "✅ Database schema & migrations verified."

# 5. Restart Application Service via systemd
echo "🔄 Restarting APFRS backend application service..."
if command -v systemctl &>/dev/null; then
  sudo systemctl restart apfrs.service
  echo "⏳ Awaiting service warmup (3 seconds)..."
  sleep 3
  sudo systemctl status apfrs.service --no-pager
else
  echo "⚠️ systemctl not detected. Please restart your process manager manually."
fi

# 6. Reload Nginx Web Server
if command -v nginx &>/dev/null; then
  echo "🌐 Reloading Nginx configuration..."
  sudo nginx -t
  sudo systemctl reload nginx
fi

# 7. Execute Post-Deployment Smoke Verification
echo "🧪 Running post-deployment smoke tests..."
if [ -f "$SCRIPT_DIR/smoke-test.sh" ]; then
  bash "$SCRIPT_DIR/smoke-test.sh" "http://127.0.0.1"
fi

echo "========================================================="
echo "🎉 APFRS Deployment Completed Successfully!"
echo "========================================================="
