// backend/src/middleware/errorHandler.js
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { config } from '../config/index.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled route error', {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    url: req.url,
    method: req.method,
  });

  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.message, err.details);
  }

  if (err.name === 'ZodError') {
    return sendError(res, 400, 'Validation failed', err.errors);
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendError(res, 401, err.message);
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = config.nodeEnv === 'production' && statusCode === 500
    ? 'Internal server error.'
    : err.message || 'Internal server error.';

  return sendError(res, statusCode, message);
};

export default errorHandler;
