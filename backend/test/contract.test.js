// backend/test/contract.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../src/config/database.js';
import { request, startTestServer, stopTestServer } from './helpers/test-server.js';
import { seedTestUsers, getAdminToken } from './helpers/test-auth.js';

test.describe('API Contract & Schema Standardization Suite', async () => {
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

  // ── 1. Error Contract Standardization ─────────────────────────────────────────
  test('1.1 Standard error shape { success: false, error: ... } across 404', async () => {
    const res = await request('/api/non-existent-endpoint-route');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error);
    assert.ok(res.body.requestId);
  });

  test('1.2 Standard error shape on 400 Bad Request validation error', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {},
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error);
  });

  test('1.3 Standard error shape on 401 Unauthorized', async () => {
    const res = await request('/api/admin/stats');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error);
  });

  // ── 2. Health & Liveness Contracts ──────────────────────────────────────────
  test('2.1 /api/health contract returns status, service, database status, and uptime', async () => {
    const res = await request('/api/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'APFRS API Backend');
    assert.ok(res.body.timestamp);
    assert.ok(typeof res.body.uptime === 'number');
    assert.equal(res.body.database.isConnected, true);
  });

  // ── 3. Frontend-Backend Data Contract for Dashboard Stats ────────────────────
  test('3.1 /api/admin/stats contract returns totalBatches, sentBatches, pendingBatches, failedBatches, and totalFacultySent', async () => {
    const res = await request('/api/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.stats);

    const stats = res.body.stats;
    assert.ok(typeof stats.totalBatches === 'number', 'totalBatches must be a number');
    assert.ok(typeof stats.sentBatches === 'number', 'sentBatches must be a number');
    assert.ok(typeof stats.pendingBatches === 'number', 'pendingBatches must be a number');
    assert.ok(typeof stats.failedBatches === 'number', 'failedBatches must be a number');
    assert.ok(typeof stats.totalFacultySent === 'number', 'totalFacultySent must be a number');
  });
});
