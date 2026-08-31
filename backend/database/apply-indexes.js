// backend/database/apply-indexes.js
import db from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';

async function applyIndexes() {
  try {
    await db.connect();
    logger.info('Applying database index optimizations...');

    const indexes = [
      {
        table: 'attendance_records',
        name: 'idx_ar_month_year_status',
        columns: '(month, year, status)',
      },
      {
        table: 'attendance_records',
        name: 'idx_ar_batch_status',
        columns: '(batch_id, status)',
      },
      {
        table: 'attendance_batches',
        name: 'idx_ab_month_year',
        columns: '(month, year)',
      },
      {
        table: 'attendance_batches',
        name: 'idx_ab_status_created',
        columns: '(status, created_at)',
      },
      {
        table: 'faculty_monthly_attendance',
        name: 'idx_fma_fac_month_year',
        columns: '(faculty_id, month, year)',
      },
    ];

    for (const idx of indexes) {
      try {
        const rows = await db.query(
          `SHOW INDEX FROM ${idx.table} WHERE Key_name = ?`,
          [idx.name]
        );
        if (rows.length === 0) {
          await db.query(`ALTER TABLE ${idx.table} ADD INDEX ${idx.name} ${idx.columns}`);
          logger.info(`✅ Created index ${idx.name} on ${idx.table}`);
        } else {
          logger.info(`ℹ️ Index ${idx.name} already exists on ${idx.table}`);
        }
      } catch (err) {
        logger.warn(`Index creation warning for ${idx.name}:`, { error: err.message });
      }
    }

    logger.info('🎉 Index optimization complete.');
  } catch (err) {
    logger.error('Failed to apply indexes:', err);
  } finally {
    await db.close();
  }
}

applyIndexes();
