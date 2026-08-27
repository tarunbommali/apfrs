-- backend/database/migrations/002_add_jobs_table.sql
--
-- Adds a durable job queue table.
-- The attendance dispatch previously ran fire-and-forget inside the API process;
-- if the process crashed mid-dispatch the entire batch would silently disappear.
-- With this table, jobs survive restarts and can be retried up to max_attempts times.
--
-- Run: mysql -u root -p apfrs_db < backend/database/migrations/002_add_jobs_table.sql

USE apfrs_db;

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
);
