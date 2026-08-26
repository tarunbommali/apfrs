// backend/src/middleware/auth.js
import { authService } from '../services/auth.service.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    return sendError(res, 401, 'Access denied. No token provided.');
  }

  // Check if token was blacklisted on logout
  const isRevoked = await authService.isTokenBlacklisted(token);
  if (isRevoked) {
    return sendError(res, 401, 'Token has been revoked. Please log in again.');
  }

  try {
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    logger.warn('Token verification failed', { error: error.message, ip: req.ip });
    return sendError(res, error.statusCode || 401, error.message || 'Token verification failed.');
  }
};

export default {
  verifyToken,
};
