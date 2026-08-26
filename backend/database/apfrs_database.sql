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
-- INSERT DEFAULT FACULTY
-- ============================================
INSERT INTO users (id, cfms_id, email, password_hash, name, designation, department, mobile, job_status, role) VALUES
('f-1', '14406143', 'aee@gmail.com', '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Sri.L.Hari Prakash', 'Assistant Engineer', 'CIVIL', '8008484236', 'AEE', 'faculty'),
('f-2', '1009385182', 'vkaneela.maths@gmail.com', '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Vemuri KrishnaAnila', 'Assistant Professor', 'Math', '9704117814', 'contract', 'faculty'),
('f-4', '1000218038', 'btirimula.it@jntugvcev.edu.in', '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'B.Tirumula Rao', 'Assistant Professor', 'IT', '8374033622', 'Regular', 'faculty'),
('f-5', '15166317', 'gjsuma.it@jntugvcev.edu.in', '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'G. Jaya Suma', 'Professor', 'IT', '8897344078', 'Regular', 'faculty'),
('f-6', '1000218016', 'chbmadhuri.it@jntugvcev.edu.in', '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Ch. Bindu Madhuri', 'Assistant Professor', 'IT', '9704955762', 'Regular', 'faculty'),
('f-7', '1000218088', 'anilwurity.it@jntugvcev.edu.in', '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Anil Wurity', 'Assistant Professor', 'IT', '8500669667', 'Regular', 'faculty'),
('f-8', '1000218041', 'vnaresh.it@jntugvcev.edu.in', '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'V.Naresh Kumar', 'Assistant Professor', 'IT', '9494545673', 'Regular', 'faculty'),
('f-9', '1000218055', 'mphani.it@jntugvcev.edu.in', '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'M.Phani Kumar', 'Assistant Professor', 'IT', '9440244793', 'Regular', 'faculty'),
('f-10', '15050742', 'kkalyan.it@jntugvcev.edu.in', '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'K.Kalyan Kumar', 'Assistant Professor', 'IT', '9000464942', 'Regular', 'faculty'),
('f-11', '1000218048', 'ssuresh.it@jntugvcev.edu.in', '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'S.Suresh', 'Assistant Professor', 'IT', '9866219492', 'Regular', 'faculty'),
('f-12', '1000218045', 'dvrao.it@jntugvcev.edu.in', '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'D.Venkata Rao', 'Assistant Professor', 'IT', '7893042093', 'Regular', 'faculty'),
('f-13', '1000218066', 'umarani.it@jntugvcev.edu.in', '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'Uma Rani K', 'Assistant Professor', 'IT', '9701153741', 'Regular', 'faculty'),
('f-14', '1000218071', 'rramesh.cse@jntugvcev.edu.in', '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'R.Ramesh', 'Assistant Professor', 'CSE', '9989453455', 'Regular', 'faculty'),
('f-15', '1000218072', 'nchand.cse@jntugvcev.edu.in', '$2a$10$Q7eY4t8c7/GfH3lq21wW5uLz1fEeqiKspvC0K.F1oK76m2tQe/7zK', 'N.Chandra Sekhar', 'Assistant Professor', 'CSE', '9949464745', 'Regular', 'faculty')
ON DUPLICATE KEY UPDATE email = VALUES(email);
