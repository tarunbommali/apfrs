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

const app = express();
const server = createServer(app);

// ── Middleware ─────────────────────────────────────────────

// CORS
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Body parsing — Phase 9: global limit reduced to 1 MB.
// The /api/admin/attendance/send route applies its own 50 MB override for large payloads.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request ID
app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || uuidv4();
    res.setHeader('X-Request-ID', req.requestId);
    next();
});

// Rate limiting
app.use(generalLimiter);

// Logging
app.use(requestLogger);

// ── Routes ──────────────────────────────────────────────────
app.use('/api', routes);

// ── Health Check ──────────────────────────────────────────
app.get('/api/health', async (req, res) => {
    try {
        const dbStatus = db.getConnectionStatus();
        res.json({
            status: 'ok',
            service: 'APFRS API Service',
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: dbStatus,
            environment: config.nodeEnv,
        });
    } catch (error) {
        res.status(503).json({
            status: 'degraded',
            service: 'APFRS API Service',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message,
        });
    }
});

// ── Error Handling ─────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path,
        requestId: req.requestId,
    });
});

app.use(errorHandler);

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

        // Register job handlers and start the durable queue worker.
        // Handlers must be registered before start() so any jobs that
        // survived a crash are processed immediately on restart.
        AttendanceService.registerHandlers();
        jobQueueService.start();
        logger.info('✅ Job queue worker started');

        // Recover any attendance_records stuck in 'processing' from a crash.
        // If a server crash happened mid-send, items are left in 'processing'.
        // We reset them to 'queued' so they are retried on the next job tick.
        try {
          const staleResult = await db.query(
            `UPDATE attendance_records
             SET status = 'queued', error_message = 'Reset after server restart', updated_at = NOW()
             WHERE status = 'processing'
               AND updated_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`
          );
          if (staleResult.affectedRows > 0) {
            logger.warn(`♻️  Reset ${staleResult.affectedRows} stale dispatch item(s) to queued after restart`);
          }
        } catch (err) {
          logger.warn('Stale attendance_records recovery warning:', { error: err.message });
        }

        // Start server
        server.listen(config.port, '0.0.0.0', () => {
            logger.info(`🚀 APFRS API Service running on port ${config.port}`);
            logger.info(`🌐 Environment: ${config.nodeEnv}`);
            const dbStatus = db.getConnectionStatus();
            logger.info(`🗄️ Database: ${dbStatus.database}@${dbStatus.host}:${dbStatus.port}`);
            logger.info(`🔗 Frontend URL: ${config.frontendUrl}`);
        });

        // Graceful shutdown
        const shutdown = async (signal) => {
            logger.info(`Received ${signal}, shutting down gracefully...`);

            // Stop the job queue worker first
            jobQueueService.stop();
            logger.info('Job queue worker stopped');
            
            // Close database connection
            await db.close();
            logger.info('Database connection closed');

            // Close server
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });

            // Force shutdown after timeout
            setTimeout(() => {
                logger.warn('Force shutdown after timeout');
                process.exit(1);
            }, 10000);
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
