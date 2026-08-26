// backend/src/middleware/requestLogger.js
import { logger } from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    // Filter noisy static asset or health pings
    if (req.url === '/api/health' && statusCode === 200) {
      return;
    }

    if (statusCode >= 400) {
      logger.warn(`${req.method} ${req.originalUrl || req.url} ${statusCode} - ${duration}ms`, {
        requestId: req.requestId,
        ip: req.ip,
      });
    } else {
      logger.info(`${req.method} ${req.originalUrl || req.url} ${statusCode} - ${duration}ms`, {
        requestId: req.requestId,
        userId: req.user?.id,
      });
    }
  });

  next();
};

export default requestLogger;
