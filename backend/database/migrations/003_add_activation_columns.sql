-- backend/database/migrations/003_add_activation_columns.sql
--
-- Adds columns to support the one-time faculty activation flow.
-- Previously new faculty accounts used cfms_id as the initial password,
-- which is a predictable credential (cfms_id values are known/discoverable).
-- This migration enables a cryptographically random activation token pattern.
--
-- Run: mysql -u root -p apfrs_db < backend/database/migrations/003_add_activation_columns.sql

USE apfrs_db;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS activation_token_hash  VARCHAR(64)  NULL    COMMENT 'SHA-256 hash of one-time activation token; cleared after use',
  ADD COLUMN IF NOT EXISTS activation_expires_at  TIMESTAMP    NULL    COMMENT 'Expiry timestamp for the activation token (72h window)',
  ADD COLUMN IF NOT EXISTS must_change_password   BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'Forces password change on first login';

-- Index for fast token lookup (activation endpoint looks up by hash)
CREATE INDEX IF NOT EXISTS idx_activation_token_hash ON users (activation_token_hash);
