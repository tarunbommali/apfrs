-- backend/database/migrations/005_create_academic_calendar_table.sql
-- Schema only. No seed data — holidays are entered dynamically
-- via the Academic Calendar admin UI (POST /api/admin/calendar).

USE apfrs_db;

CREATE TABLE IF NOT EXISTS academic_calendar (
    id         VARCHAR(50)  NOT NULL PRIMARY KEY,
    date       DATE         NOT NULL UNIQUE,
    label      VARCHAR(255) NOT NULL,
    type       ENUM('Public holiday', 'Institutional', 'Academic', 'Vacation') NOT NULL DEFAULT 'Public holiday',
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (date),
    INDEX idx_type (type)
);
