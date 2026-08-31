// backend/database/normalize-departments.js
import db from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';

async function normalizeDepartments() {
  try {
    await db.connect();
    logger.info('Starting department normalization...');

    // 1. Ensure MET department exists
    await db.query(`
      INSERT INTO departments (id, name, code, description, status, eapcet_code, branch_code, created_at, updated_at)
      VALUES ('dept-met', 'Metallurgical Engineering', 'MET', 'Department of Metallurgical Engineering', 'active', 'MET', '08', NOW(), NOW())
      ON DUPLICATE KEY UPDATE name=VALUES(name), code=VALUES(code), status='active'
    `);

    // 2. Normalize users table
    await db.query("UPDATE users SET department = 'CIVIL' WHERE department = 'CE'");
    await db.query("UPDATE users SET department = 'CSE' WHERE department = 'Computer Science and Engineering'");
    await db.query("UPDATE users SET department = 'BS&HSS' WHERE department IN ('Math', 'Maths', 'Chemistry', 'Physics', 'Commerce', 'BSH', 'BS&H')");

    // 3. Normalize faculty_monthly_attendance table
    await db.query("UPDATE faculty_monthly_attendance SET department = 'CIVIL' WHERE department = 'CE'");
    await db.query("UPDATE faculty_monthly_attendance SET department = 'CSE' WHERE department = 'Computer Science and Engineering'");
    await db.query("UPDATE faculty_monthly_attendance SET department = 'BS&HSS' WHERE department IN ('Math', 'Maths', 'Chemistry', 'Physics', 'Commerce', 'BSH', 'BS&H')");

    const usersDepts = await db.query("SELECT department, count(*) as count FROM users WHERE role='faculty' GROUP BY department ORDER BY department ASC");
    const attDepts = await db.query("SELECT department, count(*) as count FROM faculty_monthly_attendance GROUP BY department ORDER BY department ASC");
    const deptsList = await db.query("SELECT id, code, name, status FROM departments WHERE status='active' ORDER BY name ASC");

    logger.info('✅ Department normalization complete!');
    console.log('ACTIVE DEPARTMENTS IN MANAGEMENT:', deptsList);
    console.log('FACULTY PER DEPARTMENT IN USERS:', usersDepts);
    console.log('ATTENDANCE PER DEPARTMENT:', attDepts);

    process.exit(0);
  } catch (error) {
    logger.error('Failed to normalize departments:', { error: error.message });
    process.exit(1);
  }
}

normalizeDepartments();
