# APFRS Production Readiness & Deployment Checklist

Use this operational checklist before opening public access to the production instance.

## 🔐 1. Security & Network Boundary
- [ ] **AWS Security Group**: Port 80 (HTTP) and Port 443 (HTTPS) open to `0.0.0.0/0`.
- [ ] **AWS Security Group**: Port 22 (SSH) restricted to authorized administrator CIDR only (`YOUR_IP/32`).
- [ ] **AWS Security Group**: Ports `3306` (MySQL) and `8001`/`3000` (Node API) **NOT** exposed to public internet.
- [ ] **OS Firewall (UFW)**: Enabled with default deny incoming; only ports 22, 80, 443 allowed.
- [ ] **Database User**: Dedicated `apfrs_app` user created with least privileges; MySQL `root` account **NOT** used by Node.js.
- [ ] **MySQL Binding**: Verified `bind-address = 127.0.0.1` in `/etc/mysql/mysql.conf.d/mysqld.cnf`.
- [ ] **Secrets & Keys**: `.env` file permissions set to `0600` owned by `apfrs:apfrs`.
- [ ] **Git Hygiene**: No `.env`, `*.pem`, `*.key`, `*.dump`, or credentials committed to Git.

---

## ⚙️ 2. Environment & Configuration
- [ ] `NODE_ENV=production` set in `/var/www/apfrs/backend/.env`.
- [ ] `FRONTEND_URL` configured to the production HTTPS domain (e.g. `https://apfrs.example.com`).
- [ ] `JWT_SECRET` generated with at least 32 cryptographically secure random characters (`openssl rand -hex 32`).
- [ ] `ADMIN_PASSWORD` changed from initial default placeholder.
- [ ] Email credentials (SMTP or Resend API key) verified with a test email.

---

## 🗄️ 3. Database & Migrations
- [ ] Database `apfrs_db` created with `utf8mb4` character set.
- [ ] Initial schema (`backend/database/schema.sql`) executed idempotently.
- [ ] Incremental migrations applied and recorded in `schema_migrations` table.
- [ ] Automated backup script (`deploy/backup/backup-mysql.sh`) scheduled via cron.
- [ ] Backup restoration tested and verified with `deploy/backup/restore-mysql.sh`.

---

## 🌐 4. Web Server & Process Management
- [ ] Frontend production bundle built (`npm run build --prefix frontend` -> `dist/`).
- [ ] Nginx virtual host configured and tested (`sudo nginx -t`).
- [ ] SSL certificate issued via Certbot (`sudo certbot --nginx -d your-domain.com`).
- [ ] HTTP-to-HTTPS permanent redirect (301) verified.
- [ ] Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy) active.
- [ ] Systemd service `apfrs.service` enabled on boot and currently active (`systemctl is-active apfrs.service`).
- [ ] Non-root execution verified: Node.js process running under user `apfrs`.

---

## 🧪 5. Smoke Testing & Verification
- [ ] Frontend loads cleanly at root URL (`GET /` returns 200).
- [ ] API liveness endpoint returns healthy status (`GET /api/health` returns 200).
- [ ] API readiness endpoint verifies database connection (`GET /api/readiness` returns 200 with `status: ready`).
- [ ] Smoke test script executed cleanly (`bash deploy/smoke-test.sh`).
- [ ] Application logs streaming cleanly to journald (`journalctl -u apfrs.service -n 50`) with no unhandled exceptions.
