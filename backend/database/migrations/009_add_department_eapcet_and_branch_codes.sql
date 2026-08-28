-- backend/database/migrations/009_add_department_eapcet_and_branch_codes.sql
USE apfrs_db;

ALTER TABLE departments
ADD COLUMN eapcet_code VARCHAR(50) NULL,
ADD COLUMN branch_code VARCHAR(50) NULL;

-- Seed default eapcet and branch codes for the existing seeded departments
UPDATE departments SET eapcet_code = 'CIV', branch_code = '01' WHERE code = 'CIVIL';
UPDATE departments SET eapcet_code = 'EEE', branch_code = '02' WHERE code = 'EEE';
UPDATE departments SET eapcet_code = 'MEC', branch_code = '03' WHERE code = 'ME';
UPDATE departments SET eapcet_code = 'ECE', branch_code = '04' WHERE code = 'ECE';
UPDATE departments SET eapcet_code = 'CSE', branch_code = '05' WHERE code = 'CSE';
UPDATE departments SET eapcet_code = 'IT', branch_code = '06' WHERE code = 'IT';
UPDATE departments SET eapcet_code = 'ADMIN', branch_code = '00' WHERE code = 'ADMINISTRATION';
UPDATE departments SET eapcet_code = 'BS&HSS', branch_code = '99' WHERE code = 'BS&HSS';
