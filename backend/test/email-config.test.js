// backend/test/email-config.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../src/config/database.js';
import { request, startTestServer, stopTestServer } from './helpers/test-server.js';
import { seedTestUsers, getAdminToken, getFacultyToken } from './helpers/test-auth.js';

test.describe('Email Configuration & Secrets Security Regression Suite', async () => {
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

  // ── 1. Password & API Key Masking ───────────────────────────────────────────
  test('1.1 GET /api/admin/email-config never exposes plaintext passwords or API keys', async () => {
    const res = await request('/api/admin/email-config', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.settings);

    // Assert plaintext secrets are NOT present in the response
    assert.equal(res.body.settings.smtp_password, undefined, 'Must never return smtp_password');
    assert.equal(res.body.settings.resend_api_key, undefined, 'Must never return resend_api_key');

    // Assert boolean flags exist for frontend UI indicators
    assert.equal(typeof res.body.settings.hasSmtpPassword, 'boolean');
    assert.equal(typeof res.body.settings.hasResendApiKey, 'boolean');
  });

  // ── 2. Update Configuration ──────────────────────────────────────────────────
  test('2.1 PUT /api/admin/email-config successfully updates configuration and writes audit log', async () => {
    const res = await request('/api/admin/email-config', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        active_provider: 'smtp',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        fromName: 'Digital Monitoring Cell Test',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.settings.from_name, 'Digital Monitoring Cell Test');
  });

  // ── 3. Test SMTP Endpoint Security ──────────────────────────────────────────
  test('3.1 POST /api/admin/email-config/test rejects unauthenticated callers with 401', async () => {
    const res = await request('/api/admin/email-config/test', {
      method: 'POST',
      body: { recipientEmail: 'test@example.com' },
    });

    assert.equal(res.status, 401);
  });

  test('3.2 POST /api/admin/email-config/test rejects faculty callers with 403', async () => {
    const res = await request('/api/admin/email-config/test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: { recipientEmail: 'test@example.com' },
    });

    assert.equal(res.status, 403);
  });
});
