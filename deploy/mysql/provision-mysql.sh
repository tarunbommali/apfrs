#!/usr/bin/env bash
# ==============================================================================
# deploy/mysql/provision-mysql.sh
# APFRS Automated MySQL 8.0 Provisioning & Security Hardening for Ubuntu Linux
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_NAME="${DB_NAME:-apfrs_db}"
DB_USER="${DB_USER:-apfrs_app}"

echo "========================================================="
echo "APFRS — MySQL 8.0 Provisioning & Security Configuration"
echo "========================================================="

# 1. Verify root privileges
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: This script must be run as root or with sudo." >&2
  exit 1
fi

# 2. Install MySQL Server if not present
if ! command -v mysql &>/dev/null; then
  echo "📦 Installing MySQL Server 8.0..."
  apt-get update -y
  apt-get install -y mysql-server
fi

# 3. Ensure MySQL service is running and enabled on boot
echo "⚙️ Enabling and starting MySQL service..."
systemctl enable mysql
systemctl start mysql

# 4. Enforce MySQL Loopback Binding (127.0.0.1) — High Security Boundary
echo "🔒 Enforcing 127.0.0.1 bind-address in MySQL configuration..."
MYSQL_CONF_FILE="/etc/mysql/mysql.conf.d/mysqld.cnf"
if [ -f "$MYSQL_CONF_FILE" ]; then
  if grep -q "^bind-address" "$MYSQL_CONF_FILE"; then
    sed -i 's/^bind-address.*/bind-address = 127.0.0.1/' "$MYSQL_CONF_FILE"
  else
    echo "bind-address = 127.0.0.1" >> "$MYSQL_CONF_FILE"
  fi
  systemctl restart mysql
fi

# 5. Generate a high-entropy password if not provided
if [ -z "${DB_PASSWORD:-}" ]; then
  DB_PASSWORD=$(openssl rand -hex 24)
  GENERATED_PWD=1
else
  GENERATED_PWD=0
fi

# 6. Create Database and Dedicated User with Least Privileges
echo "👤 Configuring MySQL Database '$DB_NAME' and User '$DB_USER'..."

mysql --defaults-file=/etc/mysql/debian.cnf <<EOF
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';

ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, DROP, LOCK TABLES
  ON \`${DB_NAME}\`.*
  TO '${DB_USER}'@'127.0.0.1';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, DROP, LOCK TABLES
  ON \`${DB_NAME}\`.*
  TO '${DB_USER}'@'localhost';

FLUSH PRIVILEGES;
EOF

echo "✅ MySQL Database and User provisioned successfully."
echo "---------------------------------------------------------"
echo "Database:  $DB_NAME"
echo "Username:  $DB_USER"
echo "Host:      127.0.0.1"
echo "Port:      3306"
if [ "$GENERATED_PWD" -eq 1 ]; then
  echo "Password:  $DB_PASSWORD"
  echo "⚠️  SAVE THIS PASSWORD! Set DB_PASSWORD in backend/.env"
else
  echo "Password:  [Configured from environment]"
fi
echo "---------------------------------------------------------"
