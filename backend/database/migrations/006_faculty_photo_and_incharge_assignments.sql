-- backend/database/migrations/006_faculty_photo_and_incharge_assignments.sql
USE apfrs_db;

-- 1. Add photo_url column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500) NULL AFTER email;

-- 2. Create faculty_incharge_assignments table
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
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. Backfill existing incharge roles from users into faculty_incharge_assignments
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
ON DUPLICATE KEY UPDATE updated_at = NOW();
