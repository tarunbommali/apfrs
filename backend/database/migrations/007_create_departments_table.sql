-- backend/database/migrations/007_create_departments_table.sql
--
-- Schema for storing colleges departments, codes, descriptions, status, and HOD assignments.

USE apfrs_db;

CREATE TABLE IF NOT EXISTS departments (
    id             VARCHAR(50)  NOT NULL PRIMARY KEY,
    name           VARCHAR(255) NOT NULL UNIQUE,
    code           VARCHAR(50)  NOT NULL UNIQUE,
    description    TEXT         NULL,
    status         ENUM('active', 'inactive') DEFAULT 'active',
    hod_id         VARCHAR(50)  NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_code (code),
    INDEX idx_status (status)
);

-- Seed default departments
INSERT INTO departments (id, name, code, description, status, hod_id) VALUES
('dept-cse', 'Computer Science & Engineering', 'CSE', 'Department of Computer Science & Engineering', 'active', NULL),
('dept-ece', 'Electronics & Communication Engineering', 'ECE', 'Department of Electronics & Communication Engineering', 'active', NULL),
('dept-eee', 'Electrical & Electronics Engineering', 'EEE', 'Department of Electrical & Electronics Engineering', 'active', NULL),
('dept-it', 'Information Technology', 'IT', 'Department of Information Technology', 'active', NULL),
('dept-me', 'Mechanical Engineering', 'ME', 'Department of Mechanical Engineering', 'active', NULL),
('dept-civil', 'Civil Engineering', 'CIVIL', 'Department of Civil Engineering', 'active', NULL),
('dept-bsh', 'Basic Sciences & Humanities', 'BS&HSS', 'Department of Basic Sciences & Humanities', 'active', NULL),
('dept-admin', 'Administration', 'Administration', 'College Administration', 'active', NULL)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
