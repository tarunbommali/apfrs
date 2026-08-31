-- Migration: 20260829_optimize_indexes.sql
-- Purpose: Add high-selectivity composite indexes for attendance dispatch, batch monitoring, and report queries.
-- Impact: Accelerates already-sent lookups, batch status aggregations, and individual faculty report generation.

-- 1. Accelerate already-sent deduplication query in attendance.service.js
-- Query: SELECT DISTINCT employee_id, email, faculty_id FROM attendance_records WHERE month = ? AND year = ? AND status = 'sent'
ALTER TABLE attendance_records ADD INDEX idx_ar_month_year_status (month, year, status);

-- 2. Accelerate batch items retrieval and batch status recalculation
-- Query: SELECT COUNT(*), SUM(...) FROM attendance_records WHERE batch_id = ?
ALTER TABLE attendance_records ADD INDEX idx_ar_batch_status (batch_id, status);

-- 3. Accelerate batch cockpit filtering by period and status
-- Query: SELECT * FROM attendance_batches WHERE month = ? AND year = ?
ALTER TABLE attendance_batches ADD INDEX idx_ab_month_year (month, year);

-- 4. Accelerate batch status sorting and pagination
-- Query: SELECT * FROM attendance_batches WHERE status = ? ORDER BY created_at DESC
ALTER TABLE attendance_batches ADD INDEX idx_ab_status_created (status, created_at);

-- 5. Accelerate individual monthly report data queries
-- Query: SELECT * FROM faculty_monthly_attendance WHERE faculty_id = ? AND month = ? AND year = ?
ALTER TABLE faculty_monthly_attendance ADD INDEX idx_fma_fac_month_year (faculty_id, month, year);
