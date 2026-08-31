// backend/test/config-validation.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { config, validateConfig } from '../src/config/index.js';

test.describe('Configuration & Fail-Fast Validation Suite', () => {
  const originalEnv = { ...process.env };

  test.beforeEach(() => {
    process.env = { ...originalEnv };
  });

  test.afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('1. Non-production environment does not throw even if secrets are unset', () => {
    config.nodeEnv = 'development';
    assert.doesNotThrow(() => {
      validateConfig();
    });
  });

  test('2. Production throws when JWT_SECRET is default or too short', () => {
    config.nodeEnv = 'production';
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short_secret';
    process.env.DB_PASSWORD = 'strong_password';
    process.env.DB_NAME = 'apfrs_db';
    process.env.DB_USER = 'apfrs_app';
    process.env.FRONTEND_URL = 'https://apfrs.example.com';

    assert.throws(() => {
      validateConfig();
    }, /JWT_SECRET must be set to a cryptographically strong random secret/);
  });

  test('3. Production throws when DB_USER is root', () => {
    config.nodeEnv = 'production';
    config.db.user = 'root';
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.DB_PASSWORD = 'strong_password';
    process.env.DB_NAME = 'apfrs_db';
    process.env.DB_USER = 'root';
    process.env.FRONTEND_URL = 'https://apfrs.example.com';

    assert.throws(() => {
      validateConfig();
    }, /Running APFRS as MySQL root user in production is forbidden/);
  });

  test('4. Production succeeds with valid, hardened configuration', () => {
    config.nodeEnv = 'production';
    config.db.user = 'apfrs_app';
    config.jwt.secret = '0123456789abcdef0123456789abcdef0123456789abcdef';
    config.frontendUrl = 'https://apfrs.example.com';
    config.admin.password = 'StrongBootstrapAdminPassword2026!';
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.DB_PASSWORD = 'strong_password_123!';
    process.env.DB_NAME = 'apfrs_db';
    process.env.DB_USER = 'apfrs_app';
    process.env.FRONTEND_URL = 'https://apfrs.example.com';
    process.env.ADMIN_PASSWORD = 'StrongBootstrapAdminPassword2026!';

    assert.doesNotThrow(() => {
      validateConfig();
    });
  });
});
