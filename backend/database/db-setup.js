// backend/database/db-setup.js
import db from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  try {
    await db.connect();
    logger.info('Initializing database setup...');

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

    logger.info(`Found ${statements.length} SQL statements to execute.`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await db.pool.query(stmt);
      } catch (err) {
        logger.error(`Error executing statement ${i + 1}:`, { sql: stmt, error: err.message });
        throw err;
      }
    }

    logger.info('✅ Database schema successfully set up.');
    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
