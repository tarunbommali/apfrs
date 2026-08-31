#!/usr/bin/env bash
# ==============================================================================
# deploy/setup-ec2.sh
# APFRS EC2 Ubuntu 24.04/22.04 LTS Initial Server Provisioning Script
# ==============================================================================
set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: This script must be run as root or with sudo." >&2
  exit 1
fi

APP_USER="apfrs"
APP_DIR="/var/www/apfrs"
BACKUP_DIR="/var/backups/apfrs/mysql"

echo "========================================================="
echo "🚀 APFRS EC2 Server Bootstrap & Hardening"
echo "========================================================="

# 1. Update OS packages & security patches
echo "📦 Updating OS packages and applying security updates..."
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget git build-essential ufw certbot python3-certbot-nginx fail2ban gzip

# 2. Install Node.js 20 LTS (NodeSource)
if ! command -v node &>/dev/null; then
  echo "📦 Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "NPM version:     $(npm -v)"

# 3. Create unprivileged application system user
if ! id "$APP_USER" &>/dev/null; then
  echo "👤 Creating dedicated system user '$APP_USER'..."
  useradd -m -s /bin/bash "$APP_USER"
fi

# 4. Create directory structure
echo "📁 Setting up application directory at $APP_DIR..."
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/backend/logs"
mkdir -p "$BACKUP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$BACKUP_DIR"
chmod 750 "$APP_DIR"
chmod 700 "$BACKUP_DIR"

# 5. Provision MySQL Server & Dedicated User
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/mysql/provision-mysql.sh" ]; then
  chmod +x "$SCRIPT_DIR/mysql/provision-mysql.sh"
  "$SCRIPT_DIR/mysql/provision-mysql.sh"
fi

# 6. Configure UFW Firewall (Least-permissive ports: 22, 80, 443 only)
echo "🔒 Configuring UFW Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH - Restrict to Admin IP in AWS SG'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
# Explicitly block direct external access to internal services
ufw deny 8001/tcp comment 'APFRS Internal API'
ufw deny 3306/tcp comment 'MySQL Internal DB'
ufw --force enable
echo "✅ UFW Firewall enabled."

# 7. Configure Log Rotation
echo "📝 Configuring logrotate for APFRS logs..."
cat <<EOF > /etc/logrotate.d/apfrs
/var/www/apfrs/backend/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 apfrs apfrs
    sharedscripts
}
EOF

# 8. Install Systemd Service Unit
if [ -f "$SCRIPT_DIR/systemd/apfrs.service" ]; then
  echo "⚙️ Installing systemd service unit..."
  cp "$SCRIPT_DIR/systemd/apfrs.service" /etc/systemd/system/apfrs.service
  systemctl daemon-reload
  systemctl enable apfrs.service
fi

# 9. Configure Nginx Virtual Host
if [ -f "$SCRIPT_DIR/nginx/apfrs.conf" ]; then
  echo "🌐 Installing Nginx virtual host..."
  cp "$SCRIPT_DIR/nginx/apfrs.conf" /etc/nginx/sites-available/apfrs
  ln -sf /etc/nginx/sites-available/apfrs /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl restart nginx
  systemctl enable nginx
fi

echo "========================================================="
echo "🎉 EC2 Server Setup Complete!"
echo "Next steps:"
echo "1. Clone repository to $APP_DIR"
echo "2. Populate /var/www/apfrs/backend/.env from backend/.env.example"
echo "3. Run: bash deploy/deploy.sh"
echo "4. Obtain SSL certificate: sudo certbot --nginx -d your-domain.com"
echo "========================================================="
