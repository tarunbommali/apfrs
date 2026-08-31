// backend/test/rbac.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../src/config/database.js';
import { request, startTestServer, stopTestServer } from './helpers/test-server.js';
import { seedTestUsers, getAdminToken, getFacultyToken } from './helpers/test-auth.js';

test.describe('RBAC & Object-Level Authorization Security Regression Suite', async () => {
  let adminToken = '';
  let facultyToken = '';

  test.before(async () => {
    await db.connect();
    await seedTestUsers();
    await startTestServer();
    adminToken = getAdminToken();
    facultyToken = getFacultyToken();
  });

  test.after(async () => {
    await stopTestServer();
    await db.close();
  });

  // ── 1. RBAC Route Protection Matrix ─────────────────────────────────────────
  const routeMatrix = [
    // Admin-only endpoints (Faculty must receive 403, Unauthenticated must receive 401, Admin allowed 200)
    { path: '/api/admin/faculty', method: 'GET', adminStatus: 200, facultyStatus: 403, unauthStatus: 401 },
    { path: '/api/admin/departments', method: 'GET', adminStatus: 200, facultyStatus: 403, unauthStatus: 401 },
    { path: '/api/admin/attendance/batches', method: 'GET', adminStatus: 200, facultyStatus: 403, unauthStatus: 401 },
    { path: '/api/admin/email-config', method: 'GET', adminStatus: 200, facultyStatus: 403, unauthStatus: 401 },
    { path: '/api/admin/stats', method: 'GET', adminStatus: 200, facultyStatus: 403, unauthStatus: 401 },

    // Faculty endpoints (Faculty allowed 200, Unauthenticated 401)
    { path: '/api/faculty/profile', method: 'GET', facultyStatus: 200, unauthStatus: 401 },
    { path: '/api/faculty/attendance', method: 'GET', facultyStatus: 200, unauthStatus: 401 },
    { path: '/api/faculty/colleagues', method: 'GET', facultyStatus: 200, unauthStatus: 401 },
  ];

  for (const route of routeMatrix) {
    test(`RBAC Matrix: ${route.method} ${route.path} enforces unauthenticated(401) & faculty role permissions`, async () => {
      // 1. Unauthenticated
      const unauthRes = await request(route.path, { method: route.method });
      assert.equal(unauthRes.status, route.unauthStatus, `Unauthenticated expected ${route.unauthStatus}`);

      // 2. Faculty Token
      const facultyRes = await request(route.path, {
        method: route.method,
        headers: { Authorization: `Bearer ${facultyToken}` },
      });
      assert.equal(facultyRes.status, route.facultyStatus, `Faculty expected ${route.facultyStatus}`);

      // 3. Admin Token (if adminStatus specified)
      if (route.adminStatus) {
        const adminRes = await request(route.path, {
          method: route.method,
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert.equal(adminRes.status, route.adminStatus, `Admin expected ${route.adminStatus}`);
      }
    });
  }

  // ── 2. Object-Level Access (BOLA / IDOR Protection) ─────────────────────────
  test('2.1 Requesting non-existent batch items returns 404', async () => {
    const res = await request('/api/admin/attendance/batches/non-existent-batch-id-999/items', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  test('2.2 Retrying non-existent record returns 404', async () => {
    const res = await request('/api/admin/attendance/records/non-existent-record-id-999/retry', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  test('2.3 Faculty cannot trigger arbitrary batch retry or item retry', async () => {
    const res = await request('/api/admin/attendance/records/any-record-id/retry', {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });
});
