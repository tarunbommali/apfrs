// backend/database/seed.js
import db from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';
import { userRepository } from '../src/repositories/user.repository.js';

async function seed() {
  try {
    await db.connect();
    if (!db.isConnected) {
      logger.warn('MySQL database connection is not active. Skipping DB seed.');
      process.exit(0);
    }

    logger.info('🌱 Seeding database...');
    // Add custom seed logic here if needed
    logger.info('✅ Database seeded successfully.');
    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
}

seed();
