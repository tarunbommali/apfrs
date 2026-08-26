// backend/src/routes/auth.routes.js
import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validation.js';
import { loginSchema, changePasswordSchema, refreshTokenSchema } from '../validators/auth.validator.js';

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post('/refresh', validate(refreshTokenSchema), (req, res, next) => authController.refresh(req, res, next));

// Protected routes
router.post('/logout', verifyToken, (req, res, next) => authController.logout(req, res, next));
router.get('/me', verifyToken, (req, res, next) => authController.me(req, res, next));
router.post('/change-password', verifyToken, validate(changePasswordSchema), (req, res, next) => authController.changePassword(req, res, next));

export default router;
