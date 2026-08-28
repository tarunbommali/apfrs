// backend/database/db-reset.js
import db from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../src/utils/logger.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetDatabase() {
  if (process.env.NODE_ENV === 'production') {
    logger.error('CRITICAL: db:reset is blocked in production environments!');
    process.exit(1);
  }

  try {
    await db.connect();
    logger.info('⚠️ Starting DEVELOPMENT ONLY database reset...');

    await db.pool.query('SET FOREIGN_KEY_CHECKS = 0');
    
    const [tablesRows] = await db.pool.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`
    );

    for (const r of tablesRows) {
      logger.info(`Dropping table ${r.TABLE_NAME}...`);
      await db.pool.query(`DROP TABLE IF EXISTS \`${r.TABLE_NAME}\``);
    }
    
    const [viewsRows] = await db.pool.query(
      `SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE()`
    );
    for (const r of viewsRows) {
      logger.info(`Dropping view ${r.TABLE_NAME}...`);
      await db.pool.query(`DROP VIEW IF EXISTS \`${r.TABLE_NAME}\``);
    }

    await db.pool.query('SET FOREIGN_KEY_CHECKS = 1');
    logger.info('✅ All existing tables and views dropped.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    const statements = [];
    let currentStatement = '';
    const lines = schemaSql.split('\n');

    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('--') || trimmed.startsWith('#') || !trimmed) {
        continue;
      }
      
      let cleanLine = line;
      const commentIdx = line.indexOf('--');
      if (commentIdx !== -1) {
        cleanLine = line.substring(0, commentIdx);
      }

      currentStatement += ' ' + cleanLine;

      if (currentStatement.includes(';')) {
        const parts = currentStatement.split(';');
        for (let i = 0; i < parts.length - 1; i++) {
          const stmt = parts[i].trim();
          if (stmt) {
            statements.push(stmt);
          }
        }
        currentStatement = parts[parts.length - 1];
      }
    }
    
    const finalStmt = currentStatement.trim();
    if (finalStmt) {
      statements.push(finalStmt);
    }

    logger.info(`Executing ${statements.length} SQL statements...`);
    for (const stmt of statements) {
      await db.pool.query(stmt);
    }
    logger.info('✅ Canonical schema created.');
    
    await db.close();

    logger.info('🌱 Seeding database...');
    execSync('node database/seed.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

    logger.info('🎉 Database reset and seed completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Database reset failed:', error);
    process.exit(1);
  }
}

resetDatabase();
