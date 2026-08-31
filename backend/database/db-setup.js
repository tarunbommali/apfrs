// backend/database/db-setup.js
import db from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseSqlStatements(sqlContent) {
  const statements = [];
  let currentStatement = '';
  const lines = sqlContent.split('\n');

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

  return statements;
}

async function setupDatabase() {
  try {
    await db.connect();
    logger.info('🚀 Initializing database setup & migrations...');

    // 1. Execute Canonical Schema (idempotent CREATE TABLE IF NOT EXISTS)
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const statements = parseSqlStatements(schemaSql);
      logger.info(`Executing base schema (${statements.length} statements)...`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          await db.pool.query(stmt);
        } catch (err) {
          logger.error(`Error executing schema statement ${i + 1}:`, { sql: stmt, error: err.message });
          throw err;
        }
      }
      logger.info('✅ Base schema verified.');
    }

    // 2. Ensure schema_migrations table exists
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Discover and execute incremental migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      const [appliedRows] = await db.pool.query('SELECT name FROM schema_migrations');
      const appliedSet = new Set(appliedRows.map((r) => r.name));

      for (const file of migrationFiles) {
        if (appliedSet.has(file)) {
          logger.info(`⏩ Migration '${file}' already applied. Skipping.`);
          continue;
        }

        logger.info(`Applying migration: ${file}...`);
        const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        const statements = parseSqlStatements(migrationSql);

        for (const stmt of statements) {
          try {
            await db.pool.query(stmt);
          } catch (err) {
            // Ignore duplicate key/index errors if index already existed before migration tracking
            if (err.code === 'ER_DUP_KEYNAME') {
              logger.warn(`Notice: Index in migration '${file}' already exists. Continuing.`);
            } else {
              logger.error(`Failed to apply migration statement in '${file}':`, { sql: stmt, error: err.message });
              throw err;
            }
          }
        }

        await db.pool.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
        logger.info(`✅ Migration '${file}' applied successfully.`);
      }
    }

    logger.info('🎉 Database is up to date.');
    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Database setup / migration failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();
