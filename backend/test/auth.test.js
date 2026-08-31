// backend/test/auth.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import db from '../src/config/database.js';
import { config } from '../src/config/index.js';
import { request, startTestServer, stopTestServer } from './helpers/test-server.js';
import { seedTestUsers, TEST_ADMIN, TEST_FACULTY, getAdminToken, getFacultyToken, generateToken } from './helpers/test-auth.js';

test.describe('Authentication & JWT Security Regression Suite', async () => {
  test.before(async () => {
    await db.connect();
    await seedTestUsers();
    await startTestServer();
  });

  test.after(async () => {
    await stopTestServer();
    await db.close();
  });

  // ── 1. Login Success ─────────────────────────────────────────────────────────
  test('1.1 Login success with valid admin credentials returns JWT and user profile', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: TEST_ADMIN.email,
        password: TEST_ADMIN.password,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token, 'Must return JWT token');
    assert.equal(res.body.user.email, TEST_ADMIN.email);
    assert.equal(res.body.user.role, 'admin');
  });

  test('1.2 Login success with valid faculty credentials returns correct role', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: TEST_FACULTY.email,
        password: TEST_FACULTY.password,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.role, 'faculty');
    assert.equal(res.body.user.cfms_id, TEST_FACULTY.cfms_id);
  });

  // ── 2. Login Failure & Generic Error Messages ──────────────────────────────
  test('2.1 Login failure with incorrect password returns 401 generic error', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: TEST_ADMIN.email,
        password: 'WrongPassword999!',
      },
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error);
  });

  test('2.2 Login failure with unknown email returns 401 without leaking user existence', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'nonexistent.user999@jntugvcev.edu.in',
        password: 'AnyPassword123!',
      },
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('2.3 Login validation failure on missing or malformed email returns 400', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'invalid-email-format',
        password: 'password',
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  // ── 3. JWT Security Boundaries ──────────────────────────────────────────────
  test('3.1 Protected route /api/auth/me returns 200 with valid Bearer token', async () => {
    const token = getAdminToken();
    const res = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, TEST_ADMIN.email);
  });

  test('3.2 Expired JWT token is rejected with 401', async () => {
    const expiredToken = generateToken(TEST_ADMIN, { expiresIn: '-10s' });
    const res = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('3.3 Tampered signature JWT is rejected with 401', async () => {
    const invalidSignatureToken = generateToken(TEST_ADMIN, { secret: 'wrong-secret-key-attacker' });
    const res = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${invalidSignatureToken}` },
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('3.4 Malformed Authorization headers (undefined, null, garbage) return 401', async () => {
    const payloads = [
      'Bearer undefined',
      'Bearer null',
      'Bearer',
      'Basic 12345',
      'InvalidGarbageHeader',
    ];

    for (const header of payloads) {
      const res = await request('/api/auth/me', {
        headers: { Authorization: header },
      });
      assert.equal(res.status, 401, `Failed to reject malformed header: ${header}`);
    }
  });

  // ── 4. Token Blacklist & Logout ────────────────────────────────────────────
  test('4.1 Logging out blacklists the token and prevents further usage', async () => {
    const token = generateToken(TEST_ADMIN);

    // 1. Verify token works initially
    const resBefore = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resBefore.status, 200);

    // 2. Call logout
    const logoutRes = await request('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(logoutRes.status, 200);

    // 3. Verify token is now rejected as blacklisted
    const resAfter = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resAfter.status, 401);
  });
});
