# APFRS — Attendance and Faculty Reporting System

APFRS is a high-performance system for attendance tracking, verification, reporting, and secure dispatch of monthly statement PDFs to faculty members.

---

## Database Architecture & Setup

APFRS uses a clean, consolidated MySQL schema with a strict separation between canonical schema creation and idempotent seed data injection.

### Prerequisites
- MySQL Server 8.0+ installed and running.
- An empty database schema created (e.g. `apfrs_db`).

### Configuration
1. Create a `.env` file in the `backend/` directory by copying `backend/.env.example`.
2. Configure the database connection parameters:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=apfrs_db
   ```

---

## Database Commands

Run these commands from the workspace root directory:

### 1. Fresh Production Setup
To build the complete database schema from scratch on a blank database and inject initial required master records (default departments, initial admin accounts, default email configurations):

```bash
# 1. Create tables, indexes, and constraints
npm run db:setup

# 2. Populate required system configuration and reference data
npm run db:seed
```

### 2. Development Database Reset
To drop all existing tables/views, rebuild the schema from zero, and run the seeding script (contains safety checks blocking execution in `production` environments):

```bash
# WARNING: This deletes all data! Development environments only.
npm run db:reset
```

---

## Database Backup and Restore

Since APFRS runs on-premises, backing up the database is simple using standard MySQL utility tools.

### Creating a Backup
Run `mysqldump` from your terminal to export the complete database structure and records:

```bash
mysqldump -u root -p apfrs_db > apfrs_db_backup.sql
```

### Restoring from a Backup
To restore the database structure and records from an existing SQL backup file:

```bash
# 1. Ensure the database exists
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS apfrs_db;"

# 2. Import the backup file
mysql -u root -p apfrs_db < apfrs_db_backup.sql
```

---

## Development Server Launch

To launch both the backend API server and frontend development client concurrently:

```bash
npm run dev
```
