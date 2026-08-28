// backend/database/seed.js
import db from '../src/config/database.js';
import bcrypt from 'bcryptjs';
import { logger } from '../src/utils/logger.js';
import { persons } from './seed-faculty-dataset.js';

const DEFAULT_FACULTY_PASSWORD = 'faculty@123';
const DEFAULT_ADMIN_PASSWORD = 'admin@123';

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

const departments = [
  { id: 'dept-cse', name: 'Computer Science & Engineering', code: 'CSE', description: 'Department of Computer Science & Engineering', status: 'active', hod_id: null, eapcet_code: 'CSE', branch_code: '05' },
  { id: 'dept-ece', name: 'Electronics & Communication Engineering', code: 'ECE', description: 'Department of Electronics & Communication Engineering', status: 'active', hod_id: null, eapcet_code: 'ECE', branch_code: '04' },
  { id: 'dept-eee', name: 'Electrical & Electronics Engineering', code: 'EEE', description: 'Department of Electrical & Electronics Engineering', status: 'active', hod_id: null, eapcet_code: 'EEE', branch_code: '02' },
  { id: 'dept-it', name: 'Information Technology', code: 'IT', description: 'Department of Information Technology', status: 'active', hod_id: null, eapcet_code: 'IT', branch_code: '06' },
  { id: 'dept-me', name: 'Mechanical Engineering', code: 'ME', description: 'Department of Mechanical Engineering', status: 'active', hod_id: null, eapcet_code: 'MEC', branch_code: '03' },
  { id: 'dept-civil', name: 'Civil Engineering', code: 'CIVIL', description: 'Department of Civil Engineering', status: 'active', hod_id: null, eapcet_code: 'CIV', branch_code: '01' },
  { id: 'dept-bsh', name: 'Basic Sciences & Humanities', code: 'BS&HSS', description: 'Department of Basic Sciences & Humanities', status: 'active', hod_id: null, eapcet_code: 'BS&HSS', branch_code: '99' },
  { id: 'dept-admin', name: 'Administration', code: 'Administration', description: 'College Administration', status: 'active', hod_id: null, eapcet_code: 'ADMIN', branch_code: '00' }
];

const summary = {
  departmentsCount: 0,
  adminsCount: 0,
  facultyCount: 0,
  skippedCount: 0,
  emailSettingsCount: 0,
  duplicatesDetected: []
};

function validateSeedData() {
  const seenEmails = new Set();
  const seenCfms = new Set();
  const seenUsernames = new Map();
  const adminEmails = new Set(adminAccounts.map(a => a.email.toLowerCase().trim()));

  for (const person of persons) {
    const email = String(person.email || '').trim().toLowerCase();
    const cfmsId = String(person.cfms_id || '').trim();
    const name = String(person.name || '').trim();

    if (!name || !email || !cfmsId) {
      continue;
    }

    if (adminEmails.has(email)) {
      summary.duplicatesDetected.push({
        name,
        reason: 'Collision with Admin Account (Sri.K.Srinivasa Rao)'
      });
      continue;
    }

    if (seenEmails.has(email)) {
      summary.duplicatesDetected.push({
        name,
        reason: `Duplicate Email: ${email}`
      });
      continue;
    }

    if (seenCfms.has(cfmsId)) {
      summary.duplicatesDetected.push({
        name,
        reason: `Duplicate CFMS ID: ${cfmsId}`
      });
      continue;
    }

    // Flag potential duplicates with matching username prefix (e.g. Vemuri Krishna Aneela)
    const username = email.split('@')[0];
    if (seenUsernames.has(username)) {
      const otherPerson = seenUsernames.get(username);
      summary.duplicatesDetected.push({
        name,
        reason: `Potential duplicate candidate of "${otherPerson.name}" (matching email username prefix: ${username})`
      });
    } else {
      seenUsernames.set(username, person);
    }

    seenEmails.add(email);
    seenCfms.add(cfmsId);
  }
}

async function seedDepartments() {
  for (const d of departments) {
    await db.query(`
      INSERT INTO departments (id, name, code, description, status, hod_id, eapcet_code, branch_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        code = VALUES(code),
        description = VALUES(description),
        status = VALUES(status),
        eapcet_code = VALUES(eapcet_code),
        branch_code = VALUES(branch_code)
    `, [d.id, d.name, d.code, d.description, d.status, d.hod_id, d.eapcet_code, d.branch_code]);
  }
  summary.departmentsCount = departments.length;
}

async function seedEmailSettings() {
  await db.query(`
    INSERT INTO email_settings (
      id, active_provider, fallback_enabled, fallback_order,
      smtp_host, smtp_port, smtp_encryption, smtp_username, smtp_password,
      smtp_pool_size, smtp_timeout, resend_api_key, resend_domain,
      from_name, from_email, reply_to, subject_template, signature,
      retries, batch_delay, sandbox_mode
    ) VALUES (
      'default', 'smtp', 1, 'smtp_first',
      'smtp.gmail.com', 465, 'ssl', 'reports@jntugvcev.edu.in', NULL,
      5, 30, NULL, 'notify.jntugvcev.edu.in',
      'Digital Monitoring Cell', 'reports@jntugvcev.edu.in', 'admin@apfrs.in',
      'Monthly Attendance Statement — {{month}} {{year}}', 'Regards,\nDigital Monitoring Cell',
      3, 200, 0
    ) ON DUPLICATE KEY UPDATE id = id
  `);
  summary.emailSettingsCount = 1;
}

async function seedAdminAccounts() {
  const adminHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
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
  summary.adminsCount = adminAccounts.length;
}

async function seedFaculty() {
  const passwordHash = await bcrypt.hash(DEFAULT_FACULTY_PASSWORD, 10);
  const seenEmails = new Set();
  const seenCfms = new Set();
  const adminEmails = new Set(adminAccounts.map(a => a.email.toLowerCase().trim()));

  for (const person of persons) {
    const email = String(person.email || '').trim().toLowerCase();
    const cfmsId = String(person.cfms_id || '').trim();
    const name = String(person.name || '').trim();

    if (!name) {
      logger.warn(`Skipping faculty ${person.id}: missing name`);
      summary.skippedCount++;
      continue;
    }

    if (!email) {
      logger.warn(`Skipping faculty ${person.id} (${name}): missing email`);
      summary.skippedCount++;
      continue;
    }

    if (!cfmsId) {
      logger.warn(`Skipping faculty ${person.id} (${name}): missing CFMS ID`);
      summary.skippedCount++;
      continue;
    }

    if (adminEmails.has(email)) {
      logger.warn(`Skipping duplicate/collision with Admin Account: ${email} (${name})`);
      summary.skippedCount++;
      continue;
    }

    if (seenEmails.has(email)) {
      logger.warn(`Skipping duplicate email: ${email} (${name})`);
      summary.skippedCount++;
      continue;
    }

    if (seenCfms.has(cfmsId)) {
      logger.warn(`Skipping duplicate CFMS ID: ${cfmsId} (${name})`);
      summary.skippedCount++;
      continue;
    }

    seenEmails.add(email);
    seenCfms.add(cfmsId);

    const designation = String(person.designation || 'Assistant Professor').trim();
    const department = String(person.department || 'General').trim();
    const mobile = String(person.mobile || '').trim();
    const gender = String(person.gender || 'male').trim().toLowerCase();
    const rawStatus = String(person.job_status || '').trim().toLowerCase();
    const jobStatus = rawStatus === 'regular' ? 'Regular' : 'Contract';

    const userId = `fac-${person.id}`;

    await db.query(`
      INSERT INTO users (
        id, cfms_id, email, password_hash, name, designation,
        department, mobile, gender, job_status, role, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'faculty', 1)
      ON DUPLICATE KEY UPDATE
        cfms_id = VALUES(cfms_id),
        email = VALUES(email),
        name = VALUES(name),
        designation = VALUES(designation),
        department = VALUES(department),
        mobile = VALUES(mobile),
        gender = VALUES(gender),
        job_status = VALUES(job_status),
        role = 'faculty',
        is_active = 1
    `, [
      userId,
      cfmsId,
      email,
      passwordHash,
      name,
      designation,
      department,
      mobile,
      gender,
      jobStatus
    ]);

    summary.facultyCount++;
  }
}

function printSeedSummary() {
  console.log('\n🌱 APFRS database initialization');
  console.log(`\n✓ Departments       ${summary.departmentsCount}`);
  console.log(`✓ Admin accounts    ${summary.adminsCount}`);
  console.log(`✓ Faculty records   ${summary.facultyCount}`);
  console.log(`✓ Skipped records    ${summary.skippedCount}`);
  console.log(`✓ Email settings     ${summary.emailSettingsCount}`);

  if (summary.duplicatesDetected.length > 0) {
    console.log('\n⚠ Duplicate records detected:');
    summary.duplicatesDetected.forEach((d) => {
      console.log(`  - ${d.name} (${d.reason})`);
    });
  }

  console.log('\n✓ Database initialization completed\n');
}

async function runSeed() {
  try {
    await db.connect();
    logger.info('🌱 Seeding database...');

    validateSeedData();
    await seedDepartments();
    await seedEmailSettings();
    await seedAdminAccounts();
    await seedFaculty();
    printSeedSummary();

    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

runSeed();
