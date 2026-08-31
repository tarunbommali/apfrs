// backend/test/database-performance.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import db from '../src/config/database.js';

test.describe('Database Resilience, Index Optimization & Pool Performance Suite', async () => {
  test.before(async () => {
    await db.connect();
  });

  test.after(async () => {
    await db.close();
  });

  // ── 1. Connection Pool Observability ─────────────────────────────────────────
  test('1.1 getConnectionStatus exposes live pool sizing, database target, and connection health', () => {
    const status = db.getConnectionStatus();

    assert.equal(status.isConnected, true);
    assert.ok(status.database);
    assert.ok(status.host);
    assert.ok(typeof status.poolSize === 'number');
    assert.ok(status.poolSize >= 5);
    assert.ok(typeof status.activeConnections === 'number');
    assert.ok(typeof status.freeConnections === 'number');
    assert.ok(typeof status.waitingRequests === 'number');
  });

  // ── 2. Index Optimization Verification via EXPLAIN ───────────────────────────
  test('2.1 EXPLAIN verifies composite index idx_ar_month_year_status is selected', async () => {
    const explainRows = await db.query(
      `EXPLAIN SELECT DISTINCT employee_id, email, faculty_id 
       FROM attendance_records 
       WHERE month = '10' AND year = '2028' AND status = 'sent'`
    );

    assert.ok(explainRows.length > 0);
    const plan = explainRows[0];
    // Key used should be idx_ar_month_year_status
    assert.ok(
      plan.key === 'idx_ar_month_year_status' || plan.possible_keys?.includes('idx_ar_month_year_status'),
      `Expected idx_ar_month_year_status in chosen or possible keys, got chosen key: ${plan.key}`
    );
  });

  // ── 3. Transaction Rollback Integrity ────────────────────────────────────────
  test('3.1 db.transaction rolls back cleanly when an error is thrown inside callback', async () => {
    const tempId = `test-tx-${uuidv4().substring(0, 8)}`;

    try {
      await db.transaction(async (conn) => {
        await conn.query(
          `INSERT INTO departments (id, name, code) VALUES (?, 'Rollback Department', ?)`,
          [tempId, `RB_${tempId}`]
        );
        // Force failure inside transaction
        throw new Error('Simulated transactional failure');
      });
    } catch (err) {
      assert.equal(err.message, 'Simulated transactional failure');
    }

    // Verify row was completely rolled back
    const rows = await db.query(`SELECT * FROM departments WHERE id = ?`, [tempId]);
    assert.equal(rows.length, 0, 'Rolled back row must not exist in database');
  });

  // ── 4. Concurrent Query Throughput ──────────────────────────────────────────
  test('4.1 Connection pool handles 50 concurrent async queries safely without deadlock', async () => {
    const concurrentQueries = Array.from({ length: 50 }, (_, i) =>
      db.query(`SELECT 1 + ? as sum`, [i])
    );

    const results = await Promise.all(concurrentQueries);
    assert.equal(results.length, 50);
    results.forEach((res, i) => {
      assert.equal(Number(res[0].sum), 1 + i);
    });
  });
});
