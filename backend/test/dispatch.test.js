// backend/test/dispatch.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../src/config/database.js';
import { attendanceRepository } from '../src/repositories/attendance.repository.js';
import { attendanceService } from '../src/services/attendance.service.js';
import { jobQueueService } from '../src/services/job-queue.service.js';
import { v4 as uuidv4 } from 'uuid';

test.describe('APFRS Attendance Dispatch Reliability & State Machine Tests', async () => {
  const testSheetId = `sheet-test-${uuidv4().substring(0, 8)}`;
  const testMonth = 11;
  const testYear = 2029; // Safe future date

  // Setup: Connect to DB and insert isolated test fixtures
  test.before(async () => {
    await db.connect();

    // 1. Insert test users
    await db.query(`
      INSERT INTO users (id, email, name, department, role) VALUES
      ('f-test-1', 'ftest1@jntugvcev.edu.in', 'Faculty Test 1', 'CIVIL', 'faculty'),
      ('f-test-2', 'ftest2@jntugvcev.edu.in', 'Faculty Test 2', 'CSE', 'faculty'),
      ('f-test-3', 'ftest3@jntugvcev.edu.in', 'Faculty Test 3', 'ECE', 'faculty')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);

    // 2. Insert test monthly attendance sheet
    await db.query(`
      INSERT INTO monthly_attendance_sheets (id, month, year, file_name, total_faculty, working_days, uploaded_by)
      VALUES (?, ?, ?, 'test.xlsx', 3, 24, 'Admin')
      ON DUPLICATE KEY UPDATE file_name = VALUES(file_name)
    `, [testSheetId, testMonth, testYear]);

    // 3. Insert test faculty monthly attendance records
    await db.query(`
      INSERT INTO faculty_monthly_attendance (
        id, sheet_id, faculty_id, cfms_id, name, email, department, designation,
        job_status, gender, incharge, month, year, present_days, absent_days,
        leave_days, half_days, late_days, holiday_days, total_working_days,
        attendance_percentage, daily_records
      ) VALUES 
      ('fma-t1', ?, 'f-test-1', 'CFMS_T1', 'Faculty Test 1', 'ftest1@jntugvcev.edu.in', 'CIVIL', 'Assistant Professor', 'Regular', 'male', 'None', ?, ?, 22, 2, 0, 0, 0, 4, 24, 91.67, '[]'),
      ('fma-t2', ?, 'f-test-2', 'CFMS_T2', 'Faculty Test 2', 'ftest2@jntugvcev.edu.in', 'CSE', 'Assistant Professor', 'Regular', 'male', 'None', ?, ?, 20, 4, 0, 0, 0, 4, 24, 83.33, '[]'),
      ('fma-t3', ?, 'f-test-3', 'CFMS_T3', 'Faculty Test 3', 'ftest3@jntugvcev.edu.in', 'ECE', 'Assistant Professor', 'Regular', 'male', 'None', ?, ?, 24, 0, 0, 0, 0, 4, 24, 100.0, '[]')
      ON DUPLICATE KEY UPDATE present_days = VALUES(present_days)
    `, [testSheetId, testMonth, testYear, testSheetId, testMonth, testYear, testSheetId, testMonth, testYear]);
  });

  // Teardown: Clean up test fixtures
  test.after(async () => {
    try {
      await db.query(`DELETE FROM faculty_monthly_attendance WHERE sheet_id = ?`, [testSheetId]);
      await db.query(`DELETE FROM monthly_attendance_sheets WHERE id = ?`, [testSheetId]);
      await db.query(`DELETE FROM users WHERE id IN ('f-test-1', 'f-test-2', 'f-test-3')`);
    } catch (e) {
      // Ignore cleanup error
    }
    await db.close();
  });

  // ── TEST 1: Recalculate Batch Status Permutations ──────────────────────────
  test('1. Recalculate batch status: pending -> processing -> completed / partial_failed / failed', async () => {
    const batchId = `b-test-${uuidv4().substring(0, 8)}`;
    await db.query(
      `INSERT INTO attendance_batches (id, batch_id, status, triggered_by, sent_by, total_faculty, month, year, created_at, updated_at)
       VALUES (?, ?, 'pending', 'TestAdmin', 'TestAdmin', 3, ?, ?, NOW(), NOW())`,
      [batchId, batchId, String(testMonth), String(testYear)]
    );

    const rec1 = uuidv4();
    const rec2 = uuidv4();
    const rec3 = uuidv4();

    await db.query(
      `INSERT INTO attendance_records (id, batch_id, faculty_id, employee_id, employee_name, email, month, year, status, created_at, updated_at) VALUES 
       (?, ?, 'f-test-1', 'CFMS_T1', 'Faculty Test 1', 'ftest1@jntugvcev.edu.in', ?, ?, 'queued', NOW(), NOW()),
       (?, ?, 'f-test-2', 'CFMS_T2', 'Faculty Test 2', 'ftest2@jntugvcev.edu.in', ?, ?, 'queued', NOW(), NOW()),
       (?, ?, 'f-test-3', 'CFMS_T3', 'Faculty Test 3', 'ftest3@jntugvcev.edu.in', ?, ?, 'queued', NOW(), NOW())`,
      [rec1, batchId, String(testMonth), String(testYear),
       rec2, batchId, String(testMonth), String(testYear),
       rec3, batchId, String(testMonth), String(testYear)]
    );

    // Initial state: all queued -> pending
    let status = await attendanceRepository.recalculateBatchStatus(batchId);
    assert.equal(status, 'pending');

    // Active state: 1 processing, 2 queued -> processing
    await db.query(`UPDATE attendance_records SET status = 'processing' WHERE id = ?`, [rec1]);
    status = await attendanceRepository.recalculateBatchStatus(batchId);
    assert.equal(status, 'processing');

    // All sent -> completed
    await db.query(`UPDATE attendance_records SET status = 'sent' WHERE batch_id = ?`, [batchId]);
    status = await attendanceRepository.recalculateBatchStatus(batchId);
    assert.equal(status, 'completed');

    // 2 sent, 1 failed -> partial_failed
    await db.query(`UPDATE attendance_records SET status = 'failed' WHERE id = ?`, [rec3]);
    status = await attendanceRepository.recalculateBatchStatus(batchId);
    assert.equal(status, 'partial_failed');

    // All failed -> failed
    await db.query(`UPDATE attendance_records SET status = 'failed' WHERE batch_id = ?`, [batchId]);
    status = await attendanceRepository.recalculateBatchStatus(batchId);
    assert.equal(status, 'failed');

    // Cleanup
    await db.query(`DELETE FROM attendance_records WHERE batch_id = ?`, [batchId]);
    await db.query(`DELETE FROM attendance_batches WHERE batch_id = ?`, [batchId]);
  });

  // ── TEST 2: Atomic Claim and Race Condition Protection ────────────────────
  test('2. Atomic state transition: Only one worker can claim a queued record', async () => {
    const batchId = `b-claim-${uuidv4().substring(0, 8)}`;
    await db.query(
      `INSERT INTO attendance_batches (id, batch_id, status, triggered_by, sent_by, total_faculty, month, year, created_at, updated_at)
       VALUES (?, ?, 'pending', 'TestAdmin', 'TestAdmin', 1, ?, ?, NOW(), NOW())`,
      [batchId, batchId, String(testMonth), String(testYear)]
    );

    const recId = uuidv4();
    await db.query(
      `INSERT INTO attendance_records (id, batch_id, faculty_id, employee_id, employee_name, email, month, year, status, attempts, created_at, updated_at)
       VALUES (?, ?, 'f-test-1', 'CFMS_T1', 'Faculty Test 1', 'ftest1@jntugvcev.edu.in', ?, ?, 'queued', 0, NOW(), NOW())`,
      [recId, batchId, String(testMonth), String(testYear)]
    );

    // Worker 1 claims
    const claim1 = await db.query(
      `UPDATE attendance_records
       SET status = 'processing', attempts = attempts + 1, updated_at = NOW()
       WHERE id = ? AND status = 'queued' AND attempts < 3`,
      [recId]
    );
    assert.equal(claim1.affectedRows, 1, 'Worker 1 must successfully claim the record');

    // Worker 2 attempts concurrent claim on the same record
    const claim2 = await db.query(
      `UPDATE attendance_records
       SET status = 'processing', attempts = attempts + 1, updated_at = NOW()
       WHERE id = ? AND status = 'queued' AND attempts < 3`,
      [recId]
    );
    assert.equal(claim2.affectedRows, 0, 'Worker 2 must NOT claim already processing record');

    // Cleanup
    await db.query(`DELETE FROM attendance_records WHERE batch_id = ?`, [batchId]);
    await db.query(`DELETE FROM attendance_batches WHERE batch_id = ?`, [batchId]);
  });

  // ── TEST 3: Retry Attempt Limits (Max 3 Attempts) ─────────────────────────
  test('3. Retry enforcement: Cannot exceed maximum 3 attempts', async () => {
    const batchId = `b-retry-${uuidv4().substring(0, 8)}`;
    await db.query(
      `INSERT INTO attendance_batches (id, batch_id, status, triggered_by, sent_by, total_faculty, month, year, created_at, updated_at)
       VALUES (?, ?, 'failed', 'TestAdmin', 'TestAdmin', 1, ?, ?, NOW(), NOW())`,
      [batchId, batchId, String(testMonth), String(testYear)]
    );

    const recId = uuidv4();
    // Record with 3 failed attempts
    await db.query(
      `INSERT INTO attendance_records (id, batch_id, faculty_id, employee_id, employee_name, email, month, year, status, attempts, created_at, updated_at)
       VALUES (?, ?, 'f-test-1', 'CFMS_T1', 'Faculty Test 1', 'ftest1@jntugvcev.edu.in', ?, ?, 'failed', 3, NOW(), NOW())`,
      [recId, batchId, String(testMonth), String(testYear)]
    );

    // Attempting retryItem should be rejected
    await assert.rejects(
      async () => {
        await attendanceService.retryItem(recId);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes('Maximum retry limit'));
        return true;
      }
    );

    // Cleanup
    await db.query(`DELETE FROM attendance_records WHERE batch_id = ?`, [batchId]);
    await db.query(`DELETE FROM attendance_batches WHERE batch_id = ?`, [batchId]);
  });

  // ── TEST 4: Single Item Manual Retry & Idempotency ─────────────────────────
  test('4. Single-item retry: Successfully resets failed record to queued and queues job', async () => {
    const batchId = `b-single-${uuidv4().substring(0, 8)}`;
    await db.query(
      `INSERT INTO attendance_batches (id, batch_id, status, triggered_by, sent_by, total_faculty, month, year, created_at, updated_at)
       VALUES (?, ?, 'partial_failed', 'TestAdmin', 'TestAdmin', 1, ?, ?, NOW(), NOW())`,
      [batchId, batchId, String(testMonth), String(testYear)]
    );

    const recId = uuidv4();
    await db.query(
      `INSERT INTO attendance_records (id, batch_id, faculty_id, employee_id, employee_name, email, month, year, status, attempts, created_at, updated_at)
       VALUES (?, ?, 'f-test-1', 'CFMS_T1', 'Faculty Test 1', 'ftest1@jntugvcev.edu.in', ?, ?, 'failed', 1, NOW(), NOW())`,
      [recId, batchId, String(testMonth), String(testYear)]
    );

    const res = await attendanceService.retryItem(recId);
    assert.equal(res.success, true);

    // Verify DB state transitioned to 'queued'
    const [updated] = await db.query(`SELECT status FROM attendance_records WHERE id = ?`, [recId]);
    assert.equal(updated.status, 'queued');

    // Duplicate call when already queued should return friendly message without creating duplicates
    const resDuplicate = await attendanceService.retryItem(recId);
    assert.equal(resDuplicate.success, true);
    assert.ok(resDuplicate.message.includes('already queued'));

    // Cleanup
    await db.query(`DELETE FROM attendance_records WHERE batch_id = ?`, [batchId]);
    await db.query(`DELETE FROM attendance_batches WHERE batch_id = ?`, [batchId]);
    await db.query(`DELETE FROM jobs WHERE payload LIKE ?`, [`%${batchId}%`]);
  });

  // ── TEST 5: Stale Processing Recovery Simulation ──────────────────────────
  test('5. Stale worker crash recovery: Recovers abandoned processing items', async () => {
    const batchId = `b-stale-${uuidv4().substring(0, 8)}`;
    await db.query(
      `INSERT INTO attendance_batches (id, batch_id, status, triggered_by, sent_by, total_faculty, month, year, created_at, updated_at)
       VALUES (?, ?, 'processing', 'TestAdmin', 'TestAdmin', 2, ?, ?, NOW(), NOW())`,
      [batchId, batchId, String(testMonth), String(testYear)]
    );

    const recStale1 = uuidv4();
    const recStale2 = uuidv4();

    // Insert record 1: processing, updated 15 minutes ago, attempts = 1
    // Insert record 2: processing, updated 15 minutes ago, attempts = 3
    await db.query(
      `INSERT INTO attendance_records (id, batch_id, faculty_id, employee_id, employee_name, email, month, year, status, attempts, updated_at, created_at)
       VALUES 
       (?, ?, 'f-test-1', 'CFMS_T1', 'Faculty Test 1', 'ftest1@jntugvcev.edu.in', ?, ?, 'processing', 1, DATE_SUB(NOW(), INTERVAL 15 MINUTE), NOW()),
       (?, ?, 'f-test-2', 'CFMS_T2', 'Faculty Test 2', 'ftest2@jntugvcev.edu.in', ?, ?, 'processing', 3, DATE_SUB(NOW(), INTERVAL 15 MINUTE), NOW())`,
      [recStale1, batchId, String(testMonth), String(testYear),
       recStale2, batchId, String(testMonth), String(testYear)]
    );

    // Simulate startup recovery routine
    const timeoutSec = 600; // 10 minutes
    const staleResult = await db.query(
      `UPDATE attendance_records
       SET status = 'queued', error_message = 'Reset after server restart / crash recovery', updated_at = NOW()
       WHERE batch_id = ?
         AND status = 'processing'
         AND attempts < 3
         AND updated_at < DATE_SUB(NOW(), INTERVAL ? SECOND)`,
      [batchId, timeoutSec]
    );
    assert.equal(staleResult.affectedRows, 1, 'Should reset attempt 1 item to queued');

    const maxFailResult = await db.query(
      `UPDATE attendance_records
       SET status = 'failed', error_message = 'Max attempts reached after crash recovery', updated_at = NOW()
       WHERE batch_id = ?
         AND status = 'processing'
         AND attempts >= 3
         AND updated_at < DATE_SUB(NOW(), INTERVAL ? SECOND)`,
      [batchId, timeoutSec]
    );
    assert.equal(maxFailResult.affectedRows, 1, 'Should mark attempt 3 item as permanently failed');

    // Verify final statuses
    const [r1] = await db.query(`SELECT status FROM attendance_records WHERE id = ?`, [recStale1]);
    const [r2] = await db.query(`SELECT status FROM attendance_records WHERE id = ?`, [recStale2]);
    assert.equal(r1.status, 'queued');
    assert.equal(r2.status, 'failed');

    // Cleanup
    await db.query(`DELETE FROM attendance_records WHERE batch_id = ?`, [batchId]);
    await db.query(`DELETE FROM attendance_batches WHERE batch_id = ?`, [batchId]);
  });
});
