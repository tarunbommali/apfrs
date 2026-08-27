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
  port: parseInt(process.env.BACKEND_PORT || '8001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5000',

  // Database (MySQL)
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apfrs_db',
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    enabled: process.env.USE_MYSQL === 'true',
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
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_EMAIL || process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '',
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
    max: 200,
    loginMax: 10,
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

  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET environment variable is required in production');
  } else if (config.jwt.secret === 'apfrs_super_secret_jwt_key_change_in_production_2024') {
    errors.push('JWT_SECRET must be changed from its hard-coded default in production');
  }

  if (!process.env.ADMIN_PASSWORD) {
    errors.push('ADMIN_PASSWORD environment variable is required in production');
  } else if (config.admin.password === 'admin@123') {
    errors.push('ADMIN_PASSWORD must be changed from its default value in production');
  }

  if (!process.env.DB_PASSWORD) {
    errors.push('DB_PASSWORD environment variable is required in production');
  }

  if (!process.env.SMTP_EMAIL && !process.env.SMTP_USER) {
    errors.push('SMTP_EMAIL or SMTP_USER environment variable is required in production');
  }

  if (!process.env.SMTP_PASSWORD && !process.env.SMTP_PASS) {
    errors.push('SMTP_PASSWORD environment variable is required in production');
  }

  if (errors.length > 0) {
    throw new Error(
      `\n\n❌ APFRS startup blocked — insecure configuration detected:\n` +
      errors.map((e) => `  • ${e}`).join('\n') +
      `\n\nSet the required environment variables in backend/.env and restart.\n`
    );
  }
}
