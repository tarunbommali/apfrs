// backend/src/server.js
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

import { config, validateConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import routes from './routes/index.js';
import db from './config/database.js';
import { jobQueueService } from './services/job-queue.service.js';
import { AttendanceService } from './services/attendance.service.js';
import { authService } from './services/auth.service.js';

import { app } from './app.js';
const server = createServer(app);

// ── Server Lifecycle ──────────────────────────────────────

async function startServer() {
    try {
        // Validate configuration first — throws immediately if secrets are missing/insecure in production
        validateConfig();
        await db.connect();
        logger.info('✅ Database connected successfully');

        // Test database
        const testResult = await db.testConnection();
        if (!testResult) {
            throw new Error('Database test query failed');
        }
        logger.info('✅ Database test passed');

        // Ensure default administrator account is available
        await authService.ensureDefaultAdmin();

        // 1. Recover any attendance_records stuck in 'processing' from a crash
        // before starting the queue worker so recovered items are picked up on first tick.
        try {
          const timeoutSec = config.attendanceProcessingTimeoutSeconds || 600;
          // Items with attempts < 3 are reset to queued for retry
          const staleResult = await db.query(
            `UPDATE attendance_records
             SET status = 'queued', error_message = 'Reset after server restart / crash recovery', updated_at = NOW()
             WHERE status = 'processing'
               AND attempts < 3
               AND updated_at < DATE_SUB(NOW(), INTERVAL ? SECOND)`,
            [timeoutSec]
          );
          // Items with attempts >= 3 are marked failed
          const maxFailResult = await db.query(
            `UPDATE attendance_records
             SET status = 'failed', error_message = 'Max attempts reached after crash recovery', updated_at = NOW()
             WHERE status = 'processing'
               AND attempts >= 3
               AND updated_at < DATE_SUB(NOW(), INTERVAL ? SECOND)`,
            [timeoutSec]
          );
          if (staleResult.affectedRows > 0 || maxFailResult.affectedRows > 0) {
            logger.warn(`♻️ Recovered stale dispatch items: ${staleResult.affectedRows} reset to queued, ${maxFailResult.affectedRows} marked failed.`);
          }
        } catch (err) {
          logger.warn('Stale attendance_records recovery warning:', { error: err.message });
        }

        // 2. Register job handlers and start the durable queue worker.
        AttendanceService.registerHandlers();
        jobQueueService.start();
        logger.info('✅ Job queue worker started');

        // Start server
        server.listen(config.port, '0.0.0.0', () => {
            logger.info(`🚀 APFRS API Service running on port ${config.port}`);
            logger.info(`🌐 Environment: ${config.nodeEnv}`);
            const dbStatus = db.getConnectionStatus();
            logger.info(`🗄️ Database: ${dbStatus.database}@${dbStatus.host}:${dbStatus.port}`);
            logger.info(`🔗 Frontend URL: ${config.frontendUrl}`);
        });

        // Graceful shutdown sequence
        let isShuttingDown = false;
        const shutdown = async (signal) => {
            if (isShuttingDown) return;
            isShuttingDown = true;
            logger.info(`Received ${signal}, beginning graceful shutdown sequence...`);

            // Force shutdown timer fallback (20 seconds)
            const forceTimer = setTimeout(() => {
                logger.error('Graceful shutdown timed out after 20s. Forcing exit.');
                process.exit(1);
            }, 20000);
            forceTimer.unref();

            try {
                // 1. Stop accepting new incoming HTTP connections
                await new Promise((resolve) => {
                    server.close((err) => {
                        if (err) {
                            logger.error('Error closing HTTP server:', err);
                        } else {
                            logger.info('✅ HTTP server closed (no longer accepting new requests)');
                        }
                        resolve();
                    });
                });

                // 2. Drain active background worker jobs
                logger.info('⏳ Draining background job queue worker...');
                await jobQueueService.drain(15000);
                logger.info('✅ Background job queue worker drained');

                // 3. Close MySQL database pool
                await db.close();
                logger.info('✅ Database connection pool closed');

                logger.info('👋 Graceful shutdown complete. Exiting cleanly.');
                process.exit(0);
            } catch (err) {
                logger.error('Error during shutdown sequence:', err);
                process.exit(1);
            }
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            logger.error('Uncaught exception:', err);
            process.exit(1);
        });

        process.on('unhandledRejection', (err) => {
            logger.error('Unhandled rejection:', err);
            process.exit(1);
        });

    } catch (err) {
        logger.error('❌ Failed to start server:', err.message);
        logger.error('Please check your database configuration and ensure MySQL is running:');
        logger.error('  - Windows: net start MySQL80');
        logger.error('  - Linux: sudo systemctl status mysql');
        logger.error('  - Ensure DB_PASSWORD in backend/.env is correct');
        process.exit(1);
    }
}

// Start the server
startServer();

export default app;
