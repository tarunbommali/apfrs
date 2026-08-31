// backend/database/add-higher-education.js
import db from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';

async function addHigherEducationColumn() {
  try {
    await db.connect();
    logger.info('Adding higher_education column to users table...');

    const columns = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'higher_education'
    `);

    if (columns.length === 0) {
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN higher_education VARCHAR(100) NULL AFTER job_status
      `);
      logger.info('✅ Successfully added higher_education column to users table');
    } else {
      logger.info('ℹ️ higher_education column already exists on users table');
    }
  } catch (err) {
    logger.error('Failed to add higher_education column:', err);
  } finally {
    await db.close();
  }
}

addHigherEducationColumn();
