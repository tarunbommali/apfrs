-- apfrs_database.sql
-- Run this in MySQL Workbench or mysql CLI: mysql -u root -p < apfrs_database.sql

CREATE DATABASE IF NOT EXISTS apfrs_db;
USE apfrs_db;

-- ============================================
-- USERS TABLE (Admin + Faculty)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    cfms_id VARCHAR(50) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(100) DEFAULT 'Assistant Professor',
    department VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) DEFAULT '',
    job_status ENUM('Regular', 'contract', 'AEE', 'N/A') DEFAULT 'Regular',
    role ENUM('admin', 'faculty') NOT NULL DEFAULT 'faculty',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_department (department),
    INDEX idx_role (role)
);

-- ============================================
-- ATTENDANCE BATCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_batches (
    id VARCHAR(50) PRIMARY KEY,
    batch_id VARCHAR(50) UNIQUE NOT NULL,
    status ENUM('pending', 'processing', 'sent', 'failed', 'completed') DEFAULT 'pending',
    triggered_by VARCHAR(255) NOT NULL,
    sent_by VARCHAR(255),
    total_faculty INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    email_template_subject VARCHAR(255),
    month VARCHAR(20),
    year VARCHAR(10),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_batch_id (batch_id),
    INDEX idx_created_at (created_at)
);

-- ============================================
-- ATTENDANCE RECORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_records (
    id VARCHAR(50) PRIMARY KEY,
    batch_id VARCHAR(50) NOT NULL,
    faculty_id VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50),
    employee_name VARCHAR(255),
    email VARCHAR(255),
    month VARCHAR(20),
    year VARCHAR(10),
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES attendance_batches(batch_id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_batch_id (batch_id),
    INDEX idx_faculty_id (faculty_id),
    INDEX idx_status (status)
);

-- ============================================
-- EMAIL LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_logs (
    id VARCHAR(50) PRIMARY KEY,
    batch_id VARCHAR(50),
    email_id VARCHAR(50) UNIQUE,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(255),
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_batch_id (batch_id),
    INDEX idx_recipient_email (recipient_email),
    INDEX idx_status (status)
);

-- ============================================
-- LOGIN ATTEMPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    attempt_count INT DEFAULT 1,
    last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    locked_until TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_locked_until (locked_until)
);

-- ============================================
-- TOKEN BLACKLIST TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS token_blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(500) NOT NULL,
    user_id VARCHAR(50),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token(255)),
    INDEX idx_expires_at (expires_at)
);

-- ============================================
-- DEPARTMENT STATS VIEW
-- ============================================
CREATE OR REPLACE VIEW vw_department_stats AS
SELECT 
    department,
    COUNT(*) as total_faculty,
    SUM(CASE WHEN job_status = 'Regular' THEN 1 ELSE 0 END) as regular_count,
    SUM(CASE WHEN job_status = 'contract' THEN 1 ELSE 0 END) as contract_count,
    SUM(CASE WHEN job_status = 'AEE' THEN 1 ELSE 0 END) as aee_count
FROM users
WHERE role = 'faculty' AND is_active = TRUE
GROUP BY department;

-- ============================================
-- INSERT DEFAULT ADMIN USER
-- ============================================
INSERT INTO users (id, email, password_hash, name, designation, department, role)
VALUES (
    'admin-001',
    'admin@apfrs.in',
    '$2b$10$v2ziCbkNa/lxes0FkI6.luPqbPV/YxVKUmX3la7URhNgov0LBpBbq',
    'APFRS Administrator',
    'Administrator',
    'Administration',
    'admin'
) ON DUPLICATE KEY UPDATE email = email;

-- ============================================
-- INSERT DEFAULT FACULTY (SYNTHETIC FIXTURES)
-- Real faculty data must NEVER be committed to source control.
-- Use backend/database/seed.js or an admin import to load real records.
-- All values below are intentionally fictional.
-- ============================================
INSERT INTO users (id, cfms_id, email, password_hash, name, designation, department, mobile, job_status, role) VALUES
  ('f-1',  'CFMS-SYN-001', 'faculty.civil.001@example.com',    '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Faculty Civil 001',   'Assistant Engineer',   'CIVIL', '0000000000', 'AEE',      'faculty'),
  ('f-2',  'CFMS-SYN-002', 'faculty.maths.001@example.com',    '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Faculty Maths 001',   'Assistant Professor',  'Math', '0000000000', 'contract', 'faculty'),
  ('f-4',  'CFMS-SYN-004', 'faculty.it.001@example.com',       '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Faculty IT 001',      'Assistant Professor',  'IT',   '0000000000', 'Regular',  'faculty'),
  ('f-5',  'CFMS-SYN-005', 'faculty.it.002@example.com',       '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Faculty IT 002',      'Professor',            'IT',   '0000000000', 'Regular',  'faculty'),
  ('f-6',  'CFMS-SYN-006', 'faculty.it.003@example.com',       '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Faculty IT 003',      'Assistant Professor',  'IT',   '0000000000', 'Regular',  'faculty'),
  ('f-7',  'CFMS-SYN-007', 'faculty.it.004@example.com',       '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Faculty IT 004',      'Assistant Professor',  'IT',   '0000000000', 'Regular',  'faculty'),
  ('f-8',  'CFMS-SYN-008', 'faculty.it.005@example.com',       '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Faculty IT 005',      'Assistant Professor',  'IT',   '0000000000', 'Regular',  'faculty'),
  ('f-9',  'CFMS-SYN-009', 'faculty.it.006@example.com',       '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Faculty IT 006',      'Assistant Professor',  'IT',   '0000000000', 'Regular',  'faculty'),
  ('f-10', 'CFMS-SYN-010', 'faculty.it.007@example.com',       '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Faculty IT 007',      'Assistant Professor',  'IT',   '0000000000', 'Regular',  'faculty'),
  ('f-11', 'CFMS-SYN-011', 'faculty.it.008@example.com',       '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Faculty IT 008',      'Assistant Professor',  'IT',   '0000000000', 'Regular',  'faculty'),
  ('f-12', 'CFMS-SYN-012', 'faculty.it.009@example.com',       '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Faculty IT 009',      'Assistant Professor',  'IT',   '0000000000', 'Regular',  'faculty'),
  ('f-13', 'CFMS-SYN-013', 'faculty.it.010@example.com',       '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Faculty IT 010',      'Assistant Professor',  'IT',   '0000000000', 'Regular',  'faculty'),
  ('f-14', 'CFMS-SYN-014', 'faculty.cse.001@example.com',      '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Faculty CSE 001',     'Assistant Professor',  'CSE',  '0000000000', 'Regular',  'faculty'),
  ('f-15', 'CFMS-SYN-015', 'faculty.cse.002@example.com',      '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Faculty CSE 002',     'Assistant Professor',  'CSE',  '0000000000', 'Regular',  'faculty')
ON DUPLICATE KEY UPDATE email = VALUES(email);

