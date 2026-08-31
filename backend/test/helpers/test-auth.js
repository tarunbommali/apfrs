// backend/test/helpers/test-auth.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../../src/config/index.js';
import db from '../../src/config/database.js';

export const TEST_ADMIN = {
  id: 'admin-001',
  email: 'admin@apfrs.in',
  name: 'APFRS Administrator',
  role: 'admin',
  department: 'Administration',
  password: 'AdminPassword123!',
};

export const TEST_FACULTY = {
  id: 'test-faculty-uid-1',
  email: 'faculty.test@jntugvcev.edu.in',
  name: 'Prof. Test Faculty',
  cfms_id: 'CFMS_TEST_99',
  role: 'faculty',
  department: 'Computer Science and Engineering',
  designation: 'Associate Professor',
  password: 'FacultyPassword123!',
};

export async function seedTestUsers() {
  await db.query(`DELETE FROM token_blacklist`);

  const adminHash = await bcrypt.hash(TEST_ADMIN.password, 10);
  const facultyHash = await bcrypt.hash(TEST_FACULTY.password, 10);

  await db.query(`
    INSERT INTO users (id, email, name, role, department, password_hash, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = 1
  `, [TEST_ADMIN.id, TEST_ADMIN.email, TEST_ADMIN.name, TEST_ADMIN.role, TEST_ADMIN.department, adminHash]);

  await db.query(`
    INSERT INTO users (id, cfms_id, email, name, role, department, designation, password_hash, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = 1, cfms_id = VALUES(cfms_id)
  `, [TEST_FACULTY.id, TEST_FACULTY.cfms_id, TEST_FACULTY.email, TEST_FACULTY.name, TEST_FACULTY.role, TEST_FACULTY.department, TEST_FACULTY.designation, facultyHash]);
}

import { v4 as uuidv4 } from 'uuid';

export function generateToken(user, options = {}) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    cfms_id: user.cfms_id || null,
  };

  const signOptions = {
    expiresIn: options.expiresIn || '1h',
    issuer: options.issuer || config.jwt.issuer,
    audience: options.audience || config.jwt.audience,
    jwtid: options.jwtid || uuidv4(),
  };

  return jwt.sign(payload, options.secret || config.jwt.secret, signOptions);
}

export function getAdminToken() {
  return generateToken(TEST_ADMIN);
}

export function getFacultyToken() {
  return generateToken(TEST_FACULTY);
}
