-- backend/database/migrations/004_create_attendance_sheets_and_monthly_records.sql
--
-- Schema for storing consolidated monthly attendance sheets,
-- faculty-wise metrics, and day-by-day attendance matrices from uploaded Excel files.

USE apfrs_db;

-- 1. Table for monthly uploaded attendance workbooks
CREATE TABLE IF NOT EXISTS monthly_attendance_sheets (
    id             VARCHAR(50)  NOT NULL PRIMARY KEY,
    month          INT          NOT NULL,
    year           INT          NOT NULL,
    file_name      VARCHAR(255) NOT NULL,
    total_faculty  INT          NOT NULL DEFAULT 0,
    uploaded_by    VARCHAR(255) NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_month_year (month, year),
    INDEX idx_month_year (month, year),
    INDEX idx_created_at (created_at)
);

-- 2. Table for per-faculty consolidated monthly attendance + daily status JSON
CREATE TABLE IF NOT EXISTS faculty_monthly_attendance (
    id                    VARCHAR(50)   NOT NULL PRIMARY KEY,
    sheet_id              VARCHAR(50)   NOT NULL,
    faculty_id            VARCHAR(50)   NULL,
    cfms_id               VARCHAR(50)   NULL,
    name                  VARCHAR(255)  NOT NULL,
    email                 VARCHAR(255)  NOT NULL,
    department            VARCHAR(100)  NOT NULL,
    designation           VARCHAR(100)  NULL DEFAULT 'Assistant Professor',
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
);
