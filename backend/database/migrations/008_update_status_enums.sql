-- backend/database/migrations/008_update_status_enums.sql
USE apfrs_db;

-- 1. Modify attendance_batches.status enum to include 'partial_failed' and 'completed' (if not present)
ALTER TABLE attendance_batches 
    MODIFY COLUMN status ENUM('pending', 'processing', 'sent', 'failed', 'completed', 'partial_failed') DEFAULT 'pending';

-- 2. Modify attendance_records.status enum to support 'queued', 'sending', 'sent', 'failed'
ALTER TABLE attendance_records 
    MODIFY COLUMN status ENUM('pending', 'queued', 'sending', 'sent', 'failed') DEFAULT 'pending';

-- Update legacy pending records to queued
UPDATE attendance_records SET status = 'queued' WHERE status = 'pending';

-- Finalize records enum
ALTER TABLE attendance_records 
    MODIFY COLUMN status ENUM('queued', 'sending', 'sent', 'failed') DEFAULT 'queued';

-- 3. Add retry_of_batch_id foreign key relationship to attendance_batches
ALTER TABLE attendance_batches
    ADD COLUMN retry_of_batch_id VARCHAR(50) NULL AFTER batch_id;

ALTER TABLE attendance_batches 
    ADD CONSTRAINT fk_retry_of_batch FOREIGN KEY (retry_of_batch_id) REFERENCES attendance_batches(batch_id) ON DELETE SET NULL;
