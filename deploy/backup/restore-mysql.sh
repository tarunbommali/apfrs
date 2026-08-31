#!/usr/bin/env bash
# ==============================================================================
# deploy/backup/restore-mysql.sh
# APFRS MySQL Database Restore & Recovery Verification Engine
# ==============================================================================
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path-to-backup-archive.sql.gz> [target_database_name]"
  echo "Example: $0 /var/backups/apfrs/mysql/apfrs_db_20260831_120000.sql.gz apfrs_db"
  exit 1
fi

ARCHIVE_PATH="$1"
TARGET_DB="${2:-apfrs_db}"
CHECKSUM_FILE="${ARCHIVE_PATH}.sha256"

if [ ! -f "$ARCHIVE_PATH" ]; then
  echo "❌ Error: Backup archive not found at: $ARCHIVE_PATH" >&2
  exit 1
fi

echo "========================================================="
echo "🔄 APFRS MySQL Database Restore & Recovery Process"
echo "Archive:   $ARCHIVE_PATH"
echo "Target DB: $TARGET_DB"
echo "========================================================="

# 1. Verify SHA-256 Checksum if available
if [ -f "$CHECKSUM_FILE" ]; then
  echo "🔍 Verifying SHA-256 archive integrity..."
  sha256sum -c "$CHECKSUM_FILE"
  echo "✅ Checksum verification passed."
else
  echo "⚠️ Warning: No .sha256 checksum file found. Proceeding with caution."
fi

# 2. Decompress archive to temporary SQL dump
TEMP_SQL=$(mktemp /tmp/apfrs_restore_XXXXXX.sql)
trap 'rm -f "$TEMP_SQL"' EXIT

echo "🗜️ Decompressing archive to temporary workspace..."
gunzip -c "$ARCHIVE_PATH" > "$TEMP_SQL"

# 3. Confirm Database Restoration
echo "⚠️  CAUTION: Restoring into database '$TARGET_DB' will replace matching tables."
read -r -p "Are you sure you want to proceed with restore? [y/N]: " CONFIRM
if [[ ! "$CONFIRM" =~ ^[yY](es)?$ ]]; then
  echo "Restore aborted by operator."
  exit 0
fi

# 4. Perform Restore
echo "⏳ Restoring database tables from dump..."
if [ -f "/etc/mysql/debian.cnf" ] && [ "$EUID" -eq 0 ]; then
  mysql --defaults-file=/etc/mysql/debian.cnf "$TARGET_DB" < "$TEMP_SQL"
else
  if [ -z "${DB_PASSWORD:-}" ]; then
    read -r -s -p "Enter MySQL password for user ${DB_USER:-apfrs_app}: " DB_PASSWORD
    echo ""
  fi
  MYSQL_PWD="$DB_PASSWORD" mysql \
    -h "${DB_HOST:-127.0.0.1}" \
    -P "${DB_PORT:-3306}" \
    -u "${DB_USER:-apfrs_app}" \
    "$TARGET_DB" < "$TEMP_SQL"
fi

echo "========================================================="
echo "✅ Database restore completed successfully."
echo "========================================================="
