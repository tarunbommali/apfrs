-- schema.sql
-- Canonical database schema for APFRS (Attendance and Faculty Reporting System)
-- Creates the entire database structure from scratch on a fresh installation.


-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    cfms_id VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    photo_url VARCHAR(500) NULL,
    password_hash VARCHAR(255) NULL,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(100) DEFAULT 'Assistant Professor',
    department VARCHAR(100) DEFAULT 'General',
    mobile VARCHAR(20) DEFAULT '',
    gender ENUM('male', 'female', 'other') NOT NULL DEFAULT 'male',
    job_status ENUM('Regular', 'Contract') NOT NULL DEFAULT 'Regular',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. FACULTY INCHARGE ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS faculty_incharge_assignments (
    id VARCHAR(50) NOT NULL PRIMARY KEY,
    faculty_id VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_faculty_id (faculty_id),
    INDEX idx_dates (start_date, end_date),
    CONSTRAINT fk_incharge_faculty FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(50) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    hod_id VARCHAR(50) NULL,
    eapcet_code VARCHAR(50) NULL,
    branch_code VARCHAR(50) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_dept_hod FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_code (code),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. MONTHLY ATTENDANCE SHEETS TABLE
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. FACULTY MONTHLY ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS faculty_monthly_attendance (
    id                    VARCHAR(50)   NOT NULL PRIMARY KEY,
    sheet_id              VARCHAR(50)   NOT NULL,
    faculty_id            VARCHAR(50)   NULL,
    cfms_id               VARCHAR(50)   NULL,
    name                  VARCHAR(255)  NOT NULL,
    email                 VARCHAR(255)  NOT NULL,
    department            VARCHAR(100)  NOT NULL,
    designation           VARCHAR(100)  NULL DEFAULT 'Assistant Professor',
    job_status            ENUM('Regular', 'Contract') NOT NULL DEFAULT 'Regular',
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
    CONSTRAINT fk_fma_sheet FOREIGN KEY (sheet_id) REFERENCES monthly_attendance_sheets(id) ON DELETE CASCADE,
    INDEX idx_faculty_id (faculty_id),
    INDEX idx_cfms_id (cfms_id),
    INDEX idx_email (email),
    INDEX idx_department (department),
    INDEX idx_month_year (month, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ACADEMIC CALENDAR TABLE
CREATE TABLE IF NOT EXISTS academic_calendar (
    id         VARCHAR(50)  NOT NULL PRIMARY KEY,
    date       DATE         NOT NULL UNIQUE,
    label      VARCHAR(255) NOT NULL,
    type       ENUM('Public holiday', 'Institutional', 'Academic', 'Vacation') NOT NULL DEFAULT 'Public holiday',
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (date),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. JOBS TABLE
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. LOGIN ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    attempt_count INT DEFAULT 1,
    last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    locked_until TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_locked_until (locked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TOKEN BLACKLIST TABLE
CREATE TABLE IF NOT EXISTS token_blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(500) NOT NULL,
    user_id VARCHAR(50),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token(255)),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. EMAIL SETTINGS TABLE
CREATE TABLE IF NOT EXISTS email_settings (
    id VARCHAR(64) PRIMARY KEY,
    active_provider VARCHAR(32) DEFAULT 'smtp',
    fallback_enabled BOOLEAN DEFAULT TRUE,
    fallback_order VARCHAR(32) DEFAULT 'smtp_first',
    smtp_host VARCHAR(255) DEFAULT 'smtp.gmail.com',
    smtp_port INT DEFAULT 587,
    smtp_encryption VARCHAR(32) DEFAULT 'tls',
    smtp_username VARCHAR(255) DEFAULT 'reports@jntugvcev.edu.in',
    smtp_password TEXT,
    smtp_pool_size INT DEFAULT 5,
    smtp_timeout INT DEFAULT 30,
    resend_api_key TEXT,
    resend_domain VARCHAR(255) DEFAULT 'notify.jntugvcev.edu.in',
    resend_webhook_url VARCHAR(255) DEFAULT '',
    resend_tag VARCHAR(128) DEFAULT 'apfrs-monthly',
    from_name VARCHAR(255) DEFAULT 'Digital Monitoring Cell',
    from_email VARCHAR(255) DEFAULT 'reports@jntugvcev.edu.in',
    reply_to VARCHAR(255) DEFAULT 'admin@apfrs.in',
    subject_template VARCHAR(500) DEFAULT 'Monthly Attendance Statement — {{month}} {{year}}',
    signature TEXT,
    retries INT DEFAULT 3,
    batch_delay INT DEFAULT 200,
    sandbox_mode BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. EMAIL CONFIG LOGS TABLE
CREATE TABLE IF NOT EXISTS email_config_logs (
    id VARCHAR(64) PRIMARY KEY,
    updated_by VARCHAR(255) NOT NULL,
    changed_fields JSON NOT NULL,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. ATTENDANCE BATCHES TABLE
CREATE TABLE IF NOT EXISTS attendance_batches (
    id VARCHAR(50) PRIMARY KEY,
    batch_id VARCHAR(50) UNIQUE NOT NULL,
    retry_of_batch_id VARCHAR(50) NULL,
    status ENUM('pending', 'processing', 'sent', 'failed', 'completed', 'partial_failed') DEFAULT 'pending',
    triggered_by VARCHAR(255) NOT NULL,
    sent_by VARCHAR(255) NULL,
    total_faculty INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    email_template_subject VARCHAR(255) NULL,
    month VARCHAR(20) NULL,
    year VARCHAR(10) NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    CONSTRAINT fk_batch_retry FOREIGN KEY (retry_of_batch_id) REFERENCES attendance_batches(batch_id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_batch_id (batch_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. ATTENDANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS attendance_records (
    id VARCHAR(50) PRIMARY KEY,
    batch_id VARCHAR(50) NOT NULL,
    faculty_id VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NULL,
    employee_name VARCHAR(255) NULL,
    email VARCHAR(255) NULL,
    month VARCHAR(20) NULL,
    year VARCHAR(10) NULL,
    status ENUM('queued', 'processing', 'sent', 'failed') DEFAULT 'queued',
    attempts INT NOT NULL DEFAULT 0,
    provider VARCHAR(32) NULL,
    message_id VARCHAR(255) NULL,
    error_message TEXT NULL,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ar_batch FOREIGN KEY (batch_id) REFERENCES attendance_batches(batch_id) ON DELETE CASCADE,
    CONSTRAINT fk_ar_faculty FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_batch_id (batch_id),
    INDEX idx_faculty_id (faculty_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. EMAIL LOGS TABLE
CREATE TABLE IF NOT EXISTS email_logs (
    id VARCHAR(50) PRIMARY KEY,
    batch_id VARCHAR(50) NULL,
    email_id VARCHAR(50) UNIQUE NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255) NULL,
    subject VARCHAR(255) NULL,
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    message_id VARCHAR(255) NULL,
    error_message TEXT NULL,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_batch_id (batch_id),
    INDEX idx_recipient_email (recipient_email),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
