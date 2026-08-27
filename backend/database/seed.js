// backend/database/seed.js
import db from '../src/config/database.js';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/index.js';
import { logger } from '../src/utils/logger.js';
import { persons } from './seed-faculty-dataset.js';

async function seedDatabase() {
  try {
    await db.connect();
    logger.info('🌱 Starting consolidated database seeding...');

    // ────────────────────────────────────────────────
    // 1. Seed Admin Accounts
    // ────────────────────────────────────────────────
    const adminHash = await bcrypt.hash('admin@123', 10);
    const adminAccounts = [
      {
        id: 'admin-001',
        email: 'admin@apfrs.in',
        name: 'e-Office Administrator',
        designation: 'System Administrator',
        department: 'Administration',
      },
      {
        id: 'admin-002',
        email: 'admins@jntugbcev.edu.in',
        name: 'Sri.K.Srinivasa Rao',
        designation: 'SA',
        department: 'Administration',
      },
    ];

    for (const adm of adminAccounts) {
      await db.query(`
        INSERT INTO users (id, email, password_hash, name, designation, department, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 'admin', 1)
        ON DUPLICATE KEY UPDATE
          password_hash = VALUES(password_hash),
          name = VALUES(name),
          designation = VALUES(designation),
          department = VALUES(department),
          role = 'admin',
          is_active = 1
      `, [adm.id, adm.email, adminHash, adm.name, adm.designation, adm.department]);
    }
    logger.info('✅ Admin accounts verified/seeded (admin@apfrs.in / admin@123)');

    // ────────────────────────────────────────────────
    // 2. Seed Complete Faculty Dataset
    // ────────────────────────────────────────────────
    const facultyHash = await bcrypt.hash('faculty@123', 10);
    const seenEmails = new Set();
    const seenCfms = new Set();
    let facultyCount = 0;

    for (const person of persons) {
      let email = (person.email || '').toLowerCase().trim();
      if (!email) {
        email = `faculty_${person.id}@jntugvcev.edu.in`;
      }

      if (seenEmails.has(email)) continue;
      seenEmails.add(email);

      let cfms = (person.cfms_id || '').trim();
      if (cfms && seenCfms.has(cfms)) {
        cfms = `${cfms}_${person.id}`;
      }
      if (cfms) seenCfms.add(cfms);

      const name = person.name.trim();
      const designation = person.designation.trim();
      const department = person.department.trim() || 'General';
      const mobile = (person.mobile || '').trim();
      const gender = (person.gender || 'male').toLowerCase().trim();

      const rawStatus = (person.job_status || '').toLowerCase().trim();
      const jobStatus = rawStatus === 'regular' ? 'Regular' : 'contract';
      const incharge = person.incharge || 'None';

      const userId = `fac-${person.id}`;

      await db.query(`
        INSERT INTO users (id, cfms_id, email, password_hash, name, designation, department, mobile, gender, job_status, incharge, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'faculty', 1)
        ON DUPLICATE KEY UPDATE
          cfms_id = VALUES(cfms_id),
          name = VALUES(name),
          designation = VALUES(designation),
          department = VALUES(department),
          mobile = VALUES(mobile),
          gender = VALUES(gender),
          job_status = VALUES(job_status),
          incharge = VALUES(incharge),
          password_hash = VALUES(password_hash),
          is_active = 1
      `, [
        userId,
        cfms || null,
        email,
        facultyHash,
        name,
        designation,
        department,
        mobile,
        gender,
        jobStatus,
        incharge,
      ]);

      facultyCount += 1;
    }

    logger.info(`✅ Successfully seeded/verified ${facultyCount} faculty members with password faculty@123.`);
    logger.info('🎉 Consolidated database seeding complete.');
    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
