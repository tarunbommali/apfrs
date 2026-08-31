#!/usr/bin/env bash
# ==============================================================================
# deploy/backup/backup-mysql.sh
# APFRS Automated Consistent Database Backup Engine
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/apfrs/mysql}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
DB_NAME="${DB_NAME:-apfrs_db}"
DB_USER="${DB_USER:-apfrs_app}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"

# Create backup directory if missing
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

DUMP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"
ARCHIVE_FILE="${DUMP_FILE}.gz"
CHECKSUM_FILE="${ARCHIVE_FILE}.sha256"

echo "========================================================="
echo "📦 Starting APFRS Consistent MySQL Database Backup"
echo "Timestamp: $TIMESTAMP"
echo "Database:  $DB_NAME"
echo "========================================================="

# 1. Perform consistent dump using --single-transaction
# --single-transaction ensures consistent snapshot without locking tables for InnoDB
# --quick dumps rows row-by-row to avoid memory exhaustion on large datasets
echo "⏳ Exporting database tables..."

if [ -f "/etc/mysql/debian.cnf" ] && [ "$EUID" -eq 0 ]; then
  # Use system credentials if running as root
  mysqldump --defaults-file=/etc/mysql/debian.cnf \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --events \
    --databases "$DB_NAME" > "$DUMP_FILE"
else
  # Use application user credentials (DB_PASSWORD from environment or prompt)
  if [ -z "${DB_PASSWORD:-}" ]; then
    echo "❌ Error: DB_PASSWORD environment variable is required." >&2
    exit 1
  fi
  MYSQL_PWD="$DB_PASSWORD" mysqldump \
    -h "${DB_HOST:-127.0.0.1}" \
    -P "${DB_PORT:-3306}" \
    -u "$DB_USER" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --databases "$DB_NAME" > "$DUMP_FILE"
fi

# 2. Compress the dump file
echo "🗜️ Compressing backup archive..."
gzip -f "$DUMP_FILE"

# 3. Generate SHA-256 checksum for integrity verification
echo "🔒 Generating SHA-256 checksum..."
sha256sum "$ARCHIVE_FILE" > "$CHECKSUM_FILE"

FILE_SIZE=$(du -h "$ARCHIVE_FILE" | awk '{print $1}')
echo "✅ Backup created successfully: $ARCHIVE_FILE ($FILE_SIZE)"

# 4. Optional Remote Sync to AWS S3 (if S3_BACKUP_BUCKET configured)
if [ -n "$S3_BUCKET" ] && command -v aws &>/dev/null; then
  echo "☁️ Syncing backup to S3 bucket: $S3_BUCKET..."
  aws s3 cp "$ARCHIVE_FILE" "s3://$S3_BUCKET/mysql-backups/$(basename "$ARCHIVE_FILE")" --sse AES256
  aws s3 cp "$CHECKSUM_FILE" "s3://$S3_BUCKET/mysql-backups/$(basename "$CHECKSUM_FILE")" --sse AES256
  echo "✅ S3 sync completed with AES256 encryption."
fi

# 5. Apply Retention Policy (Purge backups older than RETENTION_DAYS)
echo "🧹 Applying retention policy (purging backups older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz*" -mtime +"$RETENTION_DAYS" -delete
echo "✅ Retention cleanup complete."
