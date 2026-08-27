// backend/src/routes/auth.routes.js
import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validation.js';
import { loginSchema, changePasswordSchema, activateAccountSchema } from '../validators/auth.validator.js';

const router = Router();

// Public routes
router.post('/login',    loginLimiter, validate(loginSchema),            (req, res, next) => authController.login(req, res, next));

// Phase 8: one-time account activation (no auth required — the raw token IS the credential)
router.post('/activate', loginLimiter, validate(activateAccountSchema),  (req, res, next) => authController.activate(req, res, next));

// Protected routes
router.post('/logout',          verifyToken,                                               (req, res, next) => authController.logout(req, res, next));
router.get('/me',               verifyToken,                                               (req, res, next) => authController.me(req, res, next));
router.post('/change-password', verifyToken, validate(changePasswordSchema),               (req, res, next) => authController.changePassword(req, res, next));

// Phase 10: /refresh removed — the frontend never integrated token refresh,
// so the endpoint was dead code that falsely implied a secure rotation flow.

export default router;
