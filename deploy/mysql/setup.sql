-- deploy/mysql/setup.sql
-- APFRS MySQL Database & Dedicated Application User Provisioning
--
-- RUN THIS SCRIPT AS MYSQL ROOT:
--   sudo mysql < deploy/mysql/setup.sql
-- (Or customize credentials via deploy/mysql/provision-mysql.sh)

-- 1. Create Database with utf8mb4 collation
CREATE DATABASE IF NOT EXISTS `apfrs_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2. Create Dedicated Application User (Loopback / Localhost Only)
-- Note: Replace 'APFRS_DB_PASSWORD_PLACEHOLDER' with a secure random password!
CREATE USER IF NOT EXISTS 'apfrs_app'@'127.0.0.1' IDENTIFIED BY 'APFRS_DB_PASSWORD_PLACEHOLDER';
CREATE USER IF NOT EXISTS 'apfrs_app'@'localhost' IDENTIFIED BY 'APFRS_DB_PASSWORD_PLACEHOLDER';

-- 3. Grant Application Privileges (Least Privilege Required for App & Migrations)
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, DROP, LOCK TABLES
  ON `apfrs_db`.*
  TO 'apfrs_app'@'127.0.0.1';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, DROP, LOCK TABLES
  ON `apfrs_db`.*
  TO 'apfrs_app'@'localhost';

-- 4. Apply Privilege Updates
FLUSH PRIVILEGES;
