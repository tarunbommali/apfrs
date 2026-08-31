// backend/test/faculty.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import db from '../src/config/database.js';
import { request, startTestServer, stopTestServer } from './helpers/test-server.js';
import { seedTestUsers, getAdminToken } from './helpers/test-auth.js';

test.describe('Faculty Management & Pagination Regression Suite', async () => {
  let adminToken = '';

  test.before(async () => {
    await db.connect();
    await seedTestUsers();
    await startTestServer();
    adminToken = getAdminToken();
  });

  test.after(async () => {
    await stopTestServer();
    await db.close();
  });

  // ── 1. Create Faculty ───────────────────────────────────────────────────────
  test('1.1 Admin creates a new faculty member with valid payload', async () => {
    const cfmsId = `CFMS_${uuidv4().substring(0, 6)}`;
    const email = `faculty_${uuidv4().substring(0, 6)}@jntugvcev.edu.in`;

    const res = await request('/api/admin/faculty', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        cfms_id: cfmsId,
        email: email,
        name: 'Dr. Automated Tester',
        department: 'Computer Science and Engineering',
        designation: 'Professor',
        gender: 'female',
        job_status: 'Regular',
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.faculty.email, email);

    // Verify DB insertion
    const [row] = await db.query(`SELECT * FROM users WHERE email = ?`, [email]);
    assert.ok(row);
    assert.equal(row.cfms_id, cfmsId);

    // Cleanup
    await db.query(`DELETE FROM users WHERE email = ?`, [email]);
  });

  test('1.2 Duplicate email or CFMS ID creation is rejected with 409 Conflict', async () => {
    const existingFaculty = `existing_${uuidv4().substring(0, 6)}@jntugvcev.edu.in`;
    const cfmsId = `CFMS_DUP_${uuidv4().substring(0, 4)}`;

    // Create initial
    await db.query(`
      INSERT INTO users (id, cfms_id, email, name, role)
      VALUES (?, ?, ?, 'Duplicate Test Faculty', 'faculty')
    `, [uuidv4(), cfmsId, existingFaculty]);

    // Attempt duplicate
    const res = await request('/api/admin/faculty', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        cfms_id: cfmsId,
        email: existingFaculty,
        name: 'Duplicate Copy',
        department: 'ECE',
      },
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);

    // Cleanup
    await db.query(`DELETE FROM users WHERE email = ?`, [existingFaculty]);
  });

  // ── 2. Querying & Pagination ─────────────────────────────────────────────────
  test('2.1 Get faculty list with pagination returns page, limit, total, and records', async () => {
    const res = await request('/api/admin/faculty?page=1&limit=5', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.faculty));
    assert.equal(res.body.page, 1);
    assert.equal(res.body.limit, 5);
    assert.ok(typeof res.body.total === 'number');
  });

  test('2.2 Get faculty by non-existent ID returns 404', async () => {
    const res = await request('/api/admin/faculty/non-existent-faculty-id-999', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});
