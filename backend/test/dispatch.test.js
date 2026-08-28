// backend/test/dispatch.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../src/config/database.js';
import { attendanceRepository } from '../src/repositories/attendance.repository.js';
import { attendanceService } from '../src/services/attendance.service.js';
import { AttendanceBatch } from '../src/models/Attendance.js';
import { v4 as uuidv4 } from 'uuid';

test.describe('Attendance Dispatch & Status Recalculation Tests', async () => {
  // Setup: Connect to DB
  test.before(async () => {
    await db.connect();
  });

  // Teardown: Close DB Connection
  test.after(async () => {
    await db.close();
  });

  test('Should correctly recalculate batch status based on record statuses', async () => {
    const testBatchId = `test-batch-${uuidv4().substring(0, 8)}`;
    
    // Create a mock batch
    await db.query(
      `INSERT INTO attendance_batches (id, batch_id, status, triggered_by, sent_by, total_faculty, created_at, updated_at)
       VALUES (?, ?, 'pending', 'TestAdmin', 'TestAdmin', 3, NOW(), NOW())`,
      [testBatchId, testBatchId]
    );

    // Create 3 mock records: 2 queued, 1 sending initially
    const rec1 = uuidv4();
    const rec2 = uuidv4();
    const rec3 = uuidv4();
    
    await db.query(
      `INSERT INTO attendance_records (id, batch_id, faculty_id, employee_id, employee_name, email, month, year, status, created_at, updated_at) VALUES 
       (?, ?, 'f-1', 'EMP001', 'Faculty 1', 'f1@example.com', 1, 2025, 'queued', NOW(), NOW()),
       (?, ?, 'f-2', 'EMP002', 'Faculty 2', 'f2@example.com', 1, 2025, 'queued', NOW(), NOW()),
       (?, ?, 'f-4', 'EMP004', 'Faculty 4', 'f4@example.com', 1, 2025, 'queued', NOW(), NOW())`,
      [rec1, testBatchId, rec2, testBatchId, rec3, testBatchId]
    );

    // 1. Initial State: all queued -> batch status should be 'pending'
    let batchStatus = await attendanceRepository.recalculateBatchStatus(testBatchId);
    assert.equal(batchStatus, 'pending');

    let updatedBatch = await attendanceRepository.findBatchById(testBatchId);
    assert.equal(updatedBatch.status, 'pending');
    assert.equal(updatedBatch.sentCount, 0);
    assert.equal(updatedBatch.failedCount, 0);

    // 2. Active State: 1 sending, 2 queued -> batch status should be 'processing'
    await db.query(`UPDATE attendance_records SET status = 'sending' WHERE id = ?`, [rec1]);
    batchStatus = await attendanceRepository.recalculateBatchStatus(testBatchId);
    assert.equal(batchStatus, 'processing');

    // 3. Completed State: all sent -> batch status should be 'completed'
    await db.query(`UPDATE attendance_records SET status = 'sent' WHERE batch_id = ?`, [testBatchId]);
    batchStatus = await attendanceRepository.recalculateBatchStatus(testBatchId);
    assert.equal(batchStatus, 'completed');

    updatedBatch = await attendanceRepository.findBatchById(testBatchId);
    assert.equal(updatedBatch.status, 'completed');
    assert.equal(updatedBatch.sentCount, 3);
    assert.equal(updatedBatch.failedCount, 0);

    // 4. Partial Failure State: 2 sent, 1 failed -> batch status should be 'partial_failed'
    await db.query(`UPDATE attendance_records SET status = 'failed' WHERE id = ?`, [rec3]);
    batchStatus = await attendanceRepository.recalculateBatchStatus(testBatchId);
    assert.equal(batchStatus, 'partial_failed');

    updatedBatch = await attendanceRepository.findBatchById(testBatchId);
    assert.equal(updatedBatch.status, 'partial_failed');
    assert.equal(updatedBatch.sentCount, 2);
    assert.equal(updatedBatch.failedCount, 1);

    // 5. Full Failure State: all failed -> batch status should be 'failed'
    await db.query(`UPDATE attendance_records SET status = 'failed' WHERE batch_id = ?`, [testBatchId]);
    batchStatus = await attendanceRepository.recalculateBatchStatus(testBatchId);
    assert.equal(batchStatus, 'failed');

    updatedBatch = await attendanceRepository.findBatchById(testBatchId);
    assert.equal(updatedBatch.status, 'failed');
    assert.equal(updatedBatch.sentCount, 0);
    assert.equal(updatedBatch.failedCount, 3);

    // Cleanup
    await db.query(`DELETE FROM attendance_records WHERE batch_id = ?`, [testBatchId]);
    await db.query(`DELETE FROM attendance_batches WHERE batch_id = ?`, [testBatchId]);
  });

  test('Retry batch logic should only include failed records and link to original batch', async () => {
    const originalBatchId = `orig-batch-${uuidv4().substring(0, 8)}`;
    
    // Create original batch
    await db.query(
      `INSERT INTO attendance_batches (id, batch_id, status, triggered_by, sent_by, total_faculty, month, year, created_at, updated_at)
       VALUES (?, ?, 'partial_failed', 'TestAdmin', 'TestAdmin', 3, 1, 2025, NOW(), NOW())`,
      [originalBatchId, originalBatchId]
    );

    // 2 sent, 1 failed
    const rec1 = uuidv4();
    const rec2 = uuidv4();
    const rec3 = uuidv4();
    await db.query(
      `INSERT INTO attendance_records (id, batch_id, faculty_id, employee_id, employee_name, email, month, year, status, created_at, updated_at) VALUES 
       (?, ?, 'f-1', 'EMP001', 'Faculty 1', 'f1@example.com', 1, 2025, 'sent', NOW(), NOW()),
       (?, ?, 'f-2', 'EMP002', 'Faculty 2', 'f2@example.com', 1, 2025, 'sent', NOW(), NOW()),
       (?, ?, 'f-4', 'EMP004', 'Faculty 4', 'f4@example.com', 1, 2025, 'failed', NOW(), NOW())`,
      [rec1, originalBatchId, rec2, originalBatchId, rec3, originalBatchId]
    );

    // Call retryBatch
    const result = await attendanceService.retryBatch(originalBatchId, {
      triggeredBy: 'TestAdmin',
      sentBy: 'admin@apfrs.in'
    });

    assert.equal(result.success, true);
    const retryBatchId = result.batchId;

    // Verify retry batch properties
    const retryBatch = await attendanceRepository.findBatchById(retryBatchId);
    assert.ok(retryBatch);
    assert.equal(retryBatch.retryOfBatchId, originalBatchId);
    assert.equal(retryBatch.totalFaculty, 1); // Only the 1 failed record should be retried!
    assert.equal(retryBatch.status, 'pending');

    // Verify retry batch records
    const retryRecords = await db.query(
      `SELECT * FROM attendance_records WHERE batch_id = ?`,
      [retryBatchId]
    );
    assert.equal(retryRecords.length, 1);
    assert.equal(retryRecords[0].faculty_id, 'f-4');
    assert.equal(retryRecords[0].status, 'queued');

    // Cleanup
    await db.query(`DELETE FROM attendance_records WHERE batch_id IN (?, ?)`, [originalBatchId, retryBatchId]);
    await db.query(`DELETE FROM attendance_batches WHERE batch_id IN (?, ?)`, [originalBatchId, retryBatchId]);
    // Also remove any queued jobs created for the retry
    await db.query(`DELETE FROM jobs WHERE payload LIKE ?`, [`%${retryBatchId}%`]);
  });

  test('Duplicate protection should throw a 409 Conflict for overlapping active dispatches', async () => {
    const activeBatchId = `active-batch-${uuidv4().substring(0, 8)}`;
    
    // Create an active batch created "just now"
    await db.query(
      `INSERT INTO attendance_batches (id, batch_id, status, triggered_by, sent_by, total_faculty, month, year, created_at, updated_at)
       VALUES (?, ?, 'pending', 'TestAdmin', 'TestAdmin', 2, 1, 2025, NOW(), NOW())`,
      [activeBatchId, activeBatchId]
    );

    await db.query(
      `INSERT INTO attendance_records (id, batch_id, faculty_id, employee_id, employee_name, email, month, year, status, created_at, updated_at) VALUES 
       (?, ?, 'f-1', 'EMP001', 'Faculty 1', 'f1@example.com', 1, 2025, 'queued', NOW(), NOW()),
       (?, ?, 'f-2', 'EMP002', 'Faculty 2', 'f2@example.com', 1, 2025, 'queued', NOW(), NOW())`,
      [uuidv4(), activeBatchId, uuidv4(), activeBatchId]
    );

    // Call sendAttendance with overlapping faculty ID 'f-1'
    await assert.rejects(
      async () => {
        await attendanceService.sendAttendance({
          month: 1,
          year: 2025,
          facultyIds: ['f-1'],
          triggeredBy: 'TestAdmin',
          sentBy: 'admin@apfrs.in',
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.ok(err.message.includes('already being processed'));
        return true;
      }
    );

    // Cleanup
    await db.query(`DELETE FROM attendance_records WHERE batch_id = ?`, [activeBatchId]);
    await db.query(`DELETE FROM attendance_batches WHERE batch_id = ?`, [activeBatchId]);
  });
});
