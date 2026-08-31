# APFRS — AWS EC2 + MySQL Production Deployment Guide

## 1. Architecture Overview

APFRS (Attendance and Faculty Reporting System) is deployed on an **AWS EC2 instance running Ubuntu Linux**, with an internal **MySQL 8.0 database**, **Nginx reverse proxy**, and **Node.js application backend**.

```
Internet (Users & Faculty)
  │
  │  HTTPS :443 (HTTP :80 -> 301 Permanent Redirect)
  ▼
┌────────────────────────────────────────────────────────────────────────┐
│ AWS EC2 Instance (Ubuntu 24.04 LTS — VPC Security Group)               │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Nginx Web Server & Reverse Proxy (:80 / :443)                  │   │
│   │  ├── / (Static SPA) ──────► /var/www/apfrs/frontend/dist       │   │
│   │  └── /api (API Proxy) ────► http://127.0.0.1:8001              │   │
│   └───────────────────────────┬────────────────────────────────────┘   │
│                               │ (Loopback only)                        │
│                               ▼                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Node.js Application Process (systemd: apfrs.service)           │   │
│   │  ├── Express HTTP REST API (:8001)                            │   │
│   │  └── Durable In-Process Job Queue Poller / Worker              │   │
│   └───────────────────────────┬────────────────────────────────────┘   │
│                               │ (127.0.0.1:3306 loopback)              │
│                               ▼                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ MySQL 8.0 Daemon (mysqld bound to 127.0.0.1)                   │   │
│   │  ├── Database: apfrs_db                                        │   │
│   │  └── Dedicated User: apfrs_app (least privilege)               │   │
│   └────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬────────────────────────────────────────┘
                                │
                                ▼ Outbound TLS (587 / 465 / 443)
                  SMTP Relay / Resend Email Provider
```

---

## 2. AWS Prerequisites & Security Group Model

### EC2 Sizing Recommendations
* **Instance Type**: `t3.medium` or `t4g.medium` (2 vCPU, 4 GiB RAM minimum recommended for Node.js + MySQL + Puppeteer PDF generation).
* **Storage**: 30 GiB+ gp3 EBS volume (encrypted at rest).
* **Operating System**: Ubuntu 24.04 LTS or Ubuntu 22.04 LTS.

### AWS Security Group Configuration (Least Privilege)
| Direction | Type | Port / Range | Protocol | Source | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Inbound** | HTTPS | 443 | TCP | `0.0.0.0/0` | Public Web Traffic |
| **Inbound** | HTTP | 80 | TCP | `0.0.0.0/0` | Certbot ACME & Redirect to HTTPS |
| **Inbound** | SSH | 22 | TCP | `YOUR_IP_CIDR/32` | Administrative Access Only |
| **Inbound** | Node API | 8001 / 3000 | TCP | **NONE (BLOCKED)** | Internal Loopback Only |
| **Inbound** | MySQL | 3306 | TCP | **NONE (BLOCKED)** | High-risk port — Never expose! |
| **Outbound** | All Traffic | All | All | `0.0.0.0/0` | Outbound updates, SMTP, S3 |

---

## 3. Server Provisioning & Step-by-Step Setup

### Step 1: Connect to EC2
```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### Step 2: Clone Repository & Run Automated Bootstrap
```bash
sudo git clone https://github.com/tarunbommali/apfrs.git /var/www/apfrs
cd /var/www/apfrs

# Run server provisioning script (installs Node 20, MySQL 8.0, Nginx, UFW)
sudo bash deploy/setup-ec2.sh
```

### Step 3: Configure Production Environment Variables
```bash
sudo cp backend/.env.example /var/www/apfrs/backend/.env
sudo nano /var/www/apfrs/backend/.env
```
Ensure the following variables are set:
* `NODE_ENV=production`
* `FRONTEND_URL=https://your-domain.com`
* `DB_HOST=127.0.0.1`
* `DB_PORT=3306`
* `DB_NAME=apfrs_db`
* `DB_USER=apfrs_app`
* `DB_PASSWORD=<YourSecureDbPassword>`
* `JWT_SECRET=<Generate with: openssl rand -hex 32>`
* `ADMIN_EMAIL=admin@your-domain.com`
* `ADMIN_PASSWORD=<StrongAdminPassword>`
* `SMTP_EMAIL` and `SMTP_PASSWORD` (or `RESEND_API_KEY`)

Secure permissions:
```bash
sudo chown apfrs:apfrs /var/www/apfrs/backend/.env
sudo chmod 600 /var/www/apfrs/backend/.env
```

### Step 4: Run Initial Deployment
```bash
sudo bash deploy/deploy.sh
```

### Step 5: Configure SSL Certificate (Let's Encrypt)
Update `server_name` in `/etc/nginx/sites-available/apfrs` to your actual domain name:
```bash
sudo sed -i 's/YOUR_DOMAIN_OR_EC2_PUBLIC_IP/your-domain.com/g' /etc/nginx/sites-available/apfrs
sudo nginx -t && sudo systemctl reload nginx

# Issue free SSL certificate with automatic renewal
sudo certbot --nginx -d your-domain.com
```

---

## 4. Operational Runbooks

### Service Control
```bash
# Check API Service Status
sudo systemctl status apfrs.service

# Restart API Service
sudo systemctl restart apfrs.service

# View Real-time Application Logs
sudo journalctl -u apfrs.service -f

# Check Nginx Status
sudo systemctl status nginx
```

### Database Backup Runbook
Consistent MySQL dumps are generated via `deploy/backup/backup-mysql.sh`:
```bash
# Run manual backup
sudo bash /var/www/apfrs/deploy/backup/backup-mysql.sh

# Automate daily backup via crontab (2:00 AM daily)
echo "0 2 * * * root /var/www/apfrs/deploy/backup/backup-mysql.sh >> /var/log/apfrs_backup.log 2>&1" | sudo tee -a /etc/crontab
```

### Database Restore Runbook
```bash
# Restore specific backup archive
sudo bash /var/www/apfrs/deploy/backup/restore-mysql.sh /var/backups/apfrs/mysql/apfrs_db_YYYYMMDD_HHMMSS.sql.gz apfrs_db
```

### Smoke Test Verification
```bash
bash /var/www/apfrs/deploy/smoke-test.sh "https://your-domain.com"
```

---

## 5. Deployment Rollback Strategy

In production, **Application Rollback** is distinct from **Database Rollback**:

1. **Application Code Rollback**:
   ```bash
   cd /var/www/apfrs
   git checkout <PREVIOUS_RELEASE_TAG_OR_COMMIT>
   npm ci --prefix backend --omit=dev
   npm run build --prefix frontend
   sudo systemctl restart apfrs.service
   ```
2. **Database Rollback**:
   * APFRS migrations are designed to be **backward-compatible** (additive columns and composite indexes).
   * If a destructive schema rollback is strictly necessary, restore from the pre-deployment consistent backup:
     ```bash
     sudo bash deploy/backup/restore-mysql.sh /var/backups/apfrs/mysql/apfrs_db_PRE_DEPLOYMENT.sql.gz
     ```

---

## 6. Architecture Component Analysis

| Component | Purpose | Failure Mode | Recovery Path | Security Boundary |
| :--- | :--- | :--- | :--- | :--- |
| **Nginx** | Reverse proxy, static assets, TLS termination | Crashed process or invalid config | Systemd auto-restarts; rollback config via `nginx -t` | Exposed on 80/443; rate-limited; security headers |
| **APFRS API** | REST API endpoints, business logic | Unhandled crash, memory leak | Systemd restarts in 5s; state recovered from DB | Bound to `127.0.0.1:8001`; non-root `apfrs` user |
| **Job Worker** | Durable attendance & email dispatch | Crash during job run | Lease expires after 600s; next tick re-claims job | In-process, non-root user execution |
| **MySQL** | Persistent relational storage | Process crash, corrupted disk | InnoDB crash recovery; restore from S3 backup | Bound to `127.0.0.1:3306`; isolated `apfrs_app` user |

---

## 7. Explicit Production Limitations & Future Migration Paths

### Current Single-EC2 Constraints (Phase 1 Baseline)
* **Single EC2 = Single Point of Failure (SPOF)**: Hardware degradation or availability zone outage causes temporary downtime.
* **Co-located MySQL = Shared Resources**: High database load competes with CPU/memory used for PDF generation and API endpoints.
* **In-Process Worker**: Heavy background tasks scale with the single server rather than independently.

### Phased Evolution Roadmap
```
Phase 1 (Current)
  EC2 (Nginx + Node API + Worker + MySQL)
    │
    ▼
Phase 2 (Managed Database)
  EC2 (Nginx + Node API + Worker) ──────► AWS RDS MySQL (Automated Multi-AZ & Backups)
    │
    ▼
Phase 3 (High Availability Web Tier)
  AWS Application Load Balancer (ALB)
    ├── EC2 Instance A (Node API + Nginx) ──┐
    └── EC2 Instance B (Node API + Nginx) ──┼──► AWS RDS MySQL
                                            │
                                            ▼
Phase 4 (Distributed Architecture)          └──► AWS ElastiCache Redis (Shared Queue & Caching)
```
