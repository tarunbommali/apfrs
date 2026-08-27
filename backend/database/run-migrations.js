// backend/database/run-migrations.js
import db from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';

async function columnExists(table, column) {
  const rows = await db.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function runMigrations() {
  try {
    await db.connect();
    logger.info('Running database migrations...');

    // ────────────────────────────────────────────────
    // 1. Users base table verification
    // ────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        cfms_id VARCHAR(50) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NULL,
        name VARCHAR(255) NOT NULL,
        designation VARCHAR(100) DEFAULT 'Assistant Professor',
        department VARCHAR(100) DEFAULT 'General',
        mobile VARCHAR(20) DEFAULT '',
        gender ENUM('male', 'female', 'other') NOT NULL DEFAULT 'male',
        job_status ENUM('Regular', 'contract') NOT NULL DEFAULT 'Regular',
        incharge VARCHAR(50) NOT NULL DEFAULT 'None',
        role ENUM('admin', 'faculty') NOT NULL DEFAULT 'faculty',
        is_active BOOLEAN DEFAULT TRUE,
        activation_token_hash VARCHAR(64) NULL,
        activation_expires_at TIMESTAMP NULL,
        must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_role (role),
        INDEX idx_dept (department),
        INDEX idx_cfms (cfms_id)
      )
    `);
    logger.info('✅ users table verified/created');

    // ────────────────────────────────────────────────
    // 2. Jobs table (durable background queue)
    // ────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id           VARCHAR(50)  NOT NULL PRIMARY KEY,
        type         VARCHAR(100) NOT NULL,
        payload      JSON         NOT NULL,
        status       ENUM('queued', 'running', 'done', 'failed') NOT NULL DEFAULT 'queued',
        attempts     INT          NOT NULL DEFAULT 0,
        max_attempts INT          NOT NULL DEFAULT 3,
        run_after    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        started_at   TIMESTAMP    NULL,
        done_at      TIMESTAMP    NULL,
        error        TEXT         NULL,
        created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status_run_after (status, run_after),
        INDEX idx_type (type),
        INDEX idx_created_at (created_at)
      )
    `);
    logger.info('✅ jobs table verified/created');

    // ────────────────────────────────────────────────
    // 3. Activation columns on users
    // ────────────────────────────────────────────────
    if (!(await columnExists('users', 'activation_token_hash'))) {
      await db.query(`
        ALTER TABLE users
          ADD COLUMN activation_token_hash VARCHAR(64) NULL,
          ADD COLUMN activation_expires_at TIMESTAMP NULL,
          ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE
      `);
      await db.query(`CREATE INDEX idx_activation_token_hash ON users (activation_token_hash)`);
      logger.info('✅ activation columns added to users table');
    } else {
      logger.info('✅ activation columns already present');
    }

    // ────────────────────────────────────────────────
    // 4. Monthly attendance sheets
    // ────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS monthly_attendance_sheets (
        id             VARCHAR(50)  NOT NULL PRIMARY KEY,
        month          INT          NOT NULL,
        year           INT          NOT NULL,
        file_name      VARCHAR(255) NOT NULL,
        total_faculty  INT          NOT NULL DEFAULT 0,
        working_days   INT          NOT NULL DEFAULT 24,
        uploaded_by    VARCHAR(255) NULL,
        created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_month_year (month, year),
        INDEX idx_month_year (month, year),
        INDEX idx_created_at (created_at)
      )
    `);
    logger.info('✅ monthly_attendance_sheets table verified/created');

    // ────────────────────────────────────────────────
    // 5. Faculty monthly attendance
    // ────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS faculty_monthly_attendance (
        id                    VARCHAR(50)   NOT NULL PRIMARY KEY,
        sheet_id              VARCHAR(50)   NOT NULL,
        faculty_id            VARCHAR(50)   NULL,
        cfms_id               VARCHAR(50)   NULL,
        name                  VARCHAR(255)  NOT NULL,
        email                 VARCHAR(255)  NOT NULL,
        department            VARCHAR(100)  NOT NULL,
        designation           VARCHAR(100)  NULL DEFAULT 'Assistant Professor',
        job_status            ENUM('Regular', 'contract') NOT NULL DEFAULT 'Regular',
        gender                ENUM('male', 'female', 'other') NOT NULL DEFAULT 'male',
        incharge              VARCHAR(50)   NOT NULL DEFAULT 'None',
        month                 INT           NOT NULL,
        year                  INT           NOT NULL,
        present_days          INT           NOT NULL DEFAULT 0,
        absent_days           INT           NOT NULL DEFAULT 0,
        leave_days            INT           NOT NULL DEFAULT 0,
        half_days             INT           NOT NULL DEFAULT 0,
        late_days             INT           NOT NULL DEFAULT 0,
        holiday_days          INT           NOT NULL DEFAULT 0,
        total_working_days    INT           NOT NULL DEFAULT 0,
        attendance_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        daily_records         JSON          NOT NULL,
        created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (sheet_id) REFERENCES monthly_attendance_sheets(id) ON DELETE CASCADE,
        INDEX idx_faculty_id (faculty_id),
        INDEX idx_cfms_id (cfms_id),
        INDEX idx_email (email),
        INDEX idx_department (department),
        INDEX idx_month_year (month, year)
      )
    `);
    logger.info('✅ faculty_monthly_attendance table verified/created');

    // ────────────────────────────────────────────────
    // 6. Academic calendar — SCHEMA ONLY, no seed data.
    //    All holidays are entered dynamically via UI.
    // ────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS academic_calendar (
        id         VARCHAR(50)  NOT NULL PRIMARY KEY,
        date       DATE         NOT NULL UNIQUE,
        label      VARCHAR(255) NOT NULL,
        type       ENUM('Public holiday', 'Institutional', 'Academic', 'Vacation') NOT NULL DEFAULT 'Public holiday',
        created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_date (date),
        INDEX idx_type (type)
      )
    `);
    logger.info('✅ academic_calendar table verified/created (empty — populate via UI)');

    // ────────────────────────────────────────────────
    // 7. users.job_status enum normalization
    // ────────────────────────────────────────────────
    await db.query(`
      UPDATE users
      SET job_status = 'contract'
      WHERE job_status NOT IN ('Regular', 'contract') OR job_status IS NULL
    `);
    await db.query(`
      ALTER TABLE users
      MODIFY COLUMN job_status ENUM('Regular', 'contract') NOT NULL DEFAULT 'Regular'
    `);
    logger.info('✅ users.job_status enum normalized to (Regular, contract)');

    // ────────────────────────────────────────────────
    // 8. gender column on users
    // ────────────────────────────────────────────────
    if (!(await columnExists('users', 'gender'))) {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN gender ENUM('male', 'female', 'other') NOT NULL DEFAULT 'male' AFTER mobile
      `);
      logger.info('✅ gender column added to users');
    } else {
      logger.info('✅ gender column already present on users');
    }

    // ────────────────────────────────────────────────
    // 9. incharge column on users
    // ────────────────────────────────────────────────
    if (!(await columnExists('users', 'incharge'))) {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN incharge VARCHAR(50) NOT NULL DEFAULT 'None' AFTER job_status
      `);
      logger.info('✅ incharge column added to users');
    } else {
      logger.info('✅ incharge column already present on users');
    }

    // ────────────────────────────────────────────────
    // 10. Ensure columns on faculty_monthly_attendance
    // ────────────────────────────────────────────────
    if (!(await columnExists('faculty_monthly_attendance', 'job_status'))) {
      await db.query(`
        ALTER TABLE faculty_monthly_attendance
        ADD COLUMN job_status ENUM('Regular', 'contract') NOT NULL DEFAULT 'Regular' AFTER designation
      `);
      logger.info('✅ job_status column added to faculty_monthly_attendance');
    }

    if (!(await columnExists('faculty_monthly_attendance', 'gender'))) {
      await db.query(`
        ALTER TABLE faculty_monthly_attendance
        ADD COLUMN gender ENUM('male', 'female', 'other') NOT NULL DEFAULT 'male' AFTER designation
      `);
      logger.info('✅ gender column added to faculty_monthly_attendance');
    }

    if (!(await columnExists('faculty_monthly_attendance', 'incharge'))) {
      await db.query(`
        ALTER TABLE faculty_monthly_attendance
        ADD COLUMN incharge VARCHAR(50) NOT NULL DEFAULT 'None' AFTER job_status
      `);
      logger.info('✅ incharge column added to faculty_monthly_attendance');
    }

    if (!(await columnExists('monthly_attendance_sheets', 'working_days'))) {
      await db.query(`
        ALTER TABLE monthly_attendance_sheets
        ADD COLUMN working_days INT NOT NULL DEFAULT 24 AFTER total_faculty
      `);
      logger.info('✅ working_days added to monthly_attendance_sheets');
    }

    // ────────────────────────────────────────────────
    // 11. Faculty photo_url column on users
    // ────────────────────────────────────────────────
    if (!(await columnExists('users', 'photo_url'))) {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN photo_url VARCHAR(500) NULL AFTER email
      `);
      logger.info('✅ photo_url column added to users');
    } else {
      logger.info('✅ photo_url column already present on users');
    }

    // ────────────────────────────────────────────────
    // 12. Faculty incharge assignments table & backfill
    // ────────────────────────────────────────────────
    await db.query(`
      CREATE TABLE IF NOT EXISTS faculty_incharge_assignments (
        id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY,
        faculty_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        role VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_faculty_id (faculty_id),
        INDEX idx_dates (start_date, end_date),
        FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    logger.info('✅ faculty_incharge_assignments table verified/created');

    // Backfill legacy incharge assignments if present
    if (await columnExists('users', 'incharge')) {
      await db.query(`
        INSERT INTO faculty_incharge_assignments (id, faculty_id, role, start_date, end_date, created_at, updated_at)
        SELECT 
          CONCAT('inc-', SUBSTRING(MD5(CONCAT(id, incharge, created_at)), 1, 12)),
          id,
          incharge,
          DATE(created_at),
          NULL,
          created_at,
          updated_at
        FROM users
        WHERE incharge IS NOT NULL 
          AND incharge != 'None' 
          AND incharge != ''
        ON DUPLICATE KEY UPDATE updated_at = NOW()
      `);
      logger.info('✅ Backfilled existing user incharge roles to faculty_incharge_assignments');
    }

    logger.info('🎉 All migrations applied successfully.');
    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
