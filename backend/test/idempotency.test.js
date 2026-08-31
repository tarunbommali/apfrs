// backend/test/idempotency.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import db from '../src/config/database.js';
import { request, startTestServer, stopTestServer } from './helpers/test-server.js';
import { seedTestUsers, getAdminToken, TEST_FACULTY } from './helpers/test-auth.js';
import { attendanceRepository } from '../src/repositories/attendance.repository.js';
import { idempotencyRepository } from '../src/repositories/idempotency.repository.js';

test.describe('Distributed Systems Reliability & Idempotency Suite', async () => {
  let adminToken = '';

  test.before(async () => {
    await db.connect();
    await seedTestUsers();
    await idempotencyRepository.ensureTable();
    await startTestServer();
    adminToken = getAdminToken();
  });

  test.after(async () => {
    await stopTestServer();
    await db.close();
  });

  // ── 1. Idempotency Key Duplicate Submission ─────────────────────────────────
  test('1.1 First request with Idempotency-Key creates batch; duplicate request returns cached response', async () => {
    const idempotencyKey = `idemp-${uuidv4()}`;
    const payload = {
      month: 10,
      year: 2028,
      facultyIds: [TEST_FACULTY.id],
      forceResend: true,
      attendanceData: [
        {
          employeeId: TEST_FACULTY.cfms_id,
          employeeName: TEST_FACULTY.name,
          email: 'idemp.test@jntugvcev.edu.in',
          month: 10,
          year: 2028,
          presentDays: 20,
          workingDays: 22,
          absentDays: 2,
          attendancePercentage: 90.9,
          holidays: 4,
        },
      ],
    };

    // 1st request
    const res1 = await request('/api/admin/attendance/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: payload,
    });

    assert.equal(res1.status, 202);
    assert.equal(res1.body.success, true);
    const originalBatchId = res1.body.batchId;
    assert.ok(originalBatchId);

    // 2nd request with exact same Idempotency-Key
    const res2 = await request('/api/admin/attendance/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: payload,
    });

    assert.equal(res2.status, 202);
    assert.equal(res2.body.success, true);
    assert.equal(res2.body.batchId, originalBatchId, 'Must return identical cached batchId');

    // Verify only ONE batch was inserted in database for this idempotency key
    const rows = await db.query(`SELECT * FROM attendance_batches WHERE batch_id = ?`, [originalBatchId]);
    assert.equal(rows.length, 1);
  });

  // ── 2. Same Key with Different Payload Returns Conflict ─────────────────────
  test('2.1 Reusing Idempotency-Key with different payload rejects with 409 Conflict', async () => {
    const idempotencyKey = `idemp-conflict-${uuidv4()}`;

    // 1st request
    await request('/api/admin/attendance/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: {
        month: 11,
        year: 2028,
        facultyIds: [TEST_FACULTY.id],
        forceResend: true,
        attendanceData: [
          {
            employeeId: TEST_FACULTY.cfms_id,
            employeeName: TEST_FACULTY.name,
            email: 'conflict1@jntugvcev.edu.in',
            month: 11,
            year: 2028,
          },
        ],
      },
    });

    // 2nd request with DIFFERENT payload (month = 12)
    const conflictRes = await request('/api/admin/attendance/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: {
        month: 12,
        year: 2028,
        facultyIds: [TEST_FACULTY.id],
        forceResend: true,
        attendanceData: [
          {
            employeeId: TEST_FACULTY.cfms_id,
            employeeName: TEST_FACULTY.name,
            email: 'conflict2@jntugvcev.edu.in',
            month: 12,
            year: 2028,
          },
        ],
      },
    });

    assert.equal(conflictRes.status, 409);
    assert.equal(conflictRes.body.success, false);
    assert.match(conflictRes.body.error, /Idempotency key reused with a different request payload/i);
  });

  // ── 3. Atomic Worker Claiming Concurrency ────────────────────────────────────
  test('3.1 Atomic claimAttendanceRecord grants lease to only one concurrent worker', async () => {
    const batchId = `batch-claim-${uuidv4()}`;
    const recordId = `rec-claim-${uuidv4()}`;

    await db.query(`
      INSERT INTO attendance_batches (id, batch_id, status, triggered_by, total_faculty)
      VALUES (?, ?, 'pending', 'Admin Tester', 1)
    `, [batchId, batchId]);

    await db.query(`
      INSERT INTO attendance_records (id, batch_id, faculty_id, email, month, year, status, attempts)
      VALUES (?, ?, ?, 'concurrency@jntugvcev.edu.in', '10', '2028', 'queued', 0)
    `, [recordId, batchId, TEST_FACULTY.id]);

    // Simulate 2 workers concurrently claiming the record
    const [workerAClaimed, workerBClaimed] = await Promise.all([
      attendanceRepository.claimAttendanceRecord(recordId, 3),
      attendanceRepository.claimAttendanceRecord(recordId, 3),
    ]);

    // Exactly one worker must succeed
    assert.equal(workerAClaimed !== workerBClaimed, true, 'One and only one worker should claim the record');
    assert.equal(workerAClaimed || workerBClaimed, true);

    // Verify DB state
    const [row] = await db.query(`SELECT status, attempts FROM attendance_records WHERE id = ?`, [recordId]);
    assert.equal(row.status, 'processing');
    assert.equal(row.attempts, 1);
  });

  // ── 4. Max Attempts Ceiling ──────────────────────────────────────────────────
  test('4.1 claimAttendanceRecord refuses to claim if attempts >= MAX_ATTEMPTS', async () => {
    const batchId = `batch-max-${uuidv4()}`;
    const recordId = `rec-max-${uuidv4()}`;

    await db.query(`
      INSERT INTO attendance_batches (id, batch_id, status, triggered_by, total_faculty)
      VALUES (?, ?, 'pending', 'Admin Tester', 1)
    `, [batchId, batchId]);

    await db.query(`
      INSERT INTO attendance_records (id, batch_id, faculty_id, email, month, year, status, attempts)
      VALUES (?, ?, ?, 'exhausted@jntugvcev.edu.in', '10', '2028', 'queued', 3)
    `, [recordId, batchId, TEST_FACULTY.id]);

    const claimed = await attendanceRepository.claimAttendanceRecord(recordId, 3);
    assert.equal(claimed, false, 'Should not claim when attempts reach max limit');
  });
});
