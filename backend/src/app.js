// backend/src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

import { config } from './config/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import routes from './routes/index.js';
import db from './config/database.js';

const app = express();

// ── Middleware ─────────────────────────────────────────────

// Security Headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // API server does not serve HTML pages directly
}));

// CORS
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request ID
app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || uuidv4();
    res.setHeader('X-Request-ID', req.requestId);
    next();
});

// Rate limiting (disabled during automated testing)
if (process.env.NODE_ENV !== 'test') {
    app.use(generalLimiter);
}

// Logging (disabled during automated testing for clean test output)
if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
}

// ── Routes ──────────────────────────────────────────────────
app.use('/api', routes);

// ── Health & Readiness Endpoints ───────────────────────────
// Liveness probe: verifies the Node.js process is responsive
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'APFRS API Service',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        environment: config.nodeEnv,
    });
});

// Readiness probe: verifies critical backend dependencies (MySQL database connectivity)
app.get('/api/readiness', async (req, res) => {
    try {
        const isDbConnected = await db.testConnection();
        const dbStatus = db.getConnectionStatus();

        if (!isDbConnected) {
            return res.status(503).json({
                status: 'unready',
                service: 'APFRS API Service',
                timestamp: new Date().toISOString(),
                database: {
                    connected: false,
                    error: 'Database ping test query failed',
                    details: dbStatus,
                },
            });
        }

        res.json({
            status: 'ready',
            service: 'APFRS API Service',
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                connected: true,
                details: dbStatus,
            },
        });
    } catch (error) {
        res.status(503).json({
            status: 'unready',
            service: 'APFRS API Service',
            timestamp: new Date().toISOString(),
            database: {
                connected: false,
                error: error.message,
            },
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

export { app };
export default app;
