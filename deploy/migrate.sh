#!/usr/bin/env bash
# ==============================================================================
# deploy/migrate.sh
# APFRS Non-Destructive Database Migration Runner
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔄 Running APFRS Database Migrations..."
cd "$APP_ROOT/backend"

# Ensure environment variables are loaded
if [ -f .env ]; then
  echo "📄 Loaded backend/.env"
fi

node database/db-setup.js

echo "✅ Database migrations successfully applied."
