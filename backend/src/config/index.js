// backend/src/config/index.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

export const config = {
  // Server
  port: parseInt(process.env.BACKEND_PORT || process.env.PORT || '8001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5000',

  // Database (MySQL)
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apfrs_db',
    poolSize: parseInt(process.env.DB_POOL_SIZE || process.env.DB_CONNECTION_LIMIT || '10', 10),
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10),
    slowQueryMs: parseInt(process.env.DB_SLOW_QUERY_MS || '500', 10),
    enabled: process.env.USE_MYSQL !== 'false',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'apfrs_super_secret_jwt_key_change_in_production_2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: '7d',
    issuer: process.env.JWT_ISSUER || 'apfrs',
    audience: process.env.JWT_AUDIENCE || 'apfrs-api',
  },

  // SMTP
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    user: process.env.SMTP_EMAIL || process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '',
  },

  // Resend API
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
  },

  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@apfrs.in',
    password: process.env.ADMIN_PASSWORD || 'admin@123',
    name: process.env.ADMIN_NAME || 'APFRS Administrator',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
    loginMax: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '10', 10),
  },

  // Cache
  cache: {
    ttl: 300, // 5 minutes
    maxSize: 100,
  },

  // Pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // Attendance Processing & Job Queue Timeout
  attendanceProcessingTimeoutSeconds: parseInt(process.env.ATTENDANCE_PROCESSING_TIMEOUT_SECONDS || '600', 10), // 10 minutes default
  attendanceMaxAttempts: parseInt(process.env.ATTENDANCE_MAX_ATTEMPTS || '3', 10), // 3 attempts ceiling
};

export default config;

/**
 * Must be called at server startup before DB connects.
 * Throws with a descriptive list of problems so insecure defaults
 * are never silently used in production.
 */
export function validateConfig() {
  if (config.nodeEnv !== 'production') return; // dev/test: warnings only

  const errors = [];

  // JWT Validation
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET environment variable is required in production');
  } else if (
    config.jwt.secret === 'apfrs_super_secret_jwt_key_change_in_production_2024' ||
    config.jwt.secret.length < 32
  ) {
    errors.push('JWT_SECRET must be set to a cryptographically strong random secret (minimum 32 characters) in production');
  }

  // Database Validation
  if (!process.env.DB_PASSWORD) {
    errors.push('DB_PASSWORD environment variable is required in production');
  }
  if (!process.env.DB_NAME) {
    errors.push('DB_NAME environment variable is required in production');
  }
  if (!process.env.DB_USER) {
    errors.push('DB_USER environment variable is required in production');
  } else if (config.db.user === 'root') {
    errors.push('Running APFRS as MySQL root user in production is forbidden. Use a dedicated user (e.g., apfrs_app)');
  }

  // Admin Account Validation
  if (process.env.ADMIN_PASSWORD && config.admin.password === 'admin@123') {
    errors.push('ADMIN_PASSWORD must be changed from its default placeholder in production');
  }

  // Frontend URL Validation
  if (!process.env.FRONTEND_URL) {
    errors.push('FRONTEND_URL environment variable is required in production (e.g. https://apfrs.example.com)');
  } else if (config.frontendUrl.startsWith('http://localhost') && !process.env.ALLOW_LOCAL_FRONTEND_IN_PROD) {
    errors.push('FRONTEND_URL is set to localhost in production mode');
  }

  if (errors.length > 0) {
    throw new Error(
      `\n\n❌ APFRS startup blocked — insecure or invalid production configuration:\n` +
      errors.map((e) => `  • ${e}`).join('\n') +
      `\n\nEnsure all required environment variables are set in your production environment and restart.\n`
    );
  }
}
