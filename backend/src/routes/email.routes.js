// backend/src/routes/email.routes.js
import { Router } from 'express';
import { emailController } from '../controllers/email.controller.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { emailLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validation.js';
import { emailSchema, bulkEmailSchema, testSMTPSchema } from '../validators/email.validator.js';

const router = Router();

// Test SMTP can be called by admin
router.post('/test-smtp', validate(testSMTPSchema), (req, res, next) => emailController.testSMTP(req, res, next));
router.get('/status/:id', (req, res, next) => emailController.getEmailStatus(req, res, next));

// Sending requires authentication
router.post('/send', verifyToken, requireRole('admin'), emailLimiter, validate(emailSchema), (req, res, next) =>
  emailController.sendEmail(req, res, next)
);
router.post('/bulk', verifyToken, requireRole('admin'), emailLimiter, validate(bulkEmailSchema), (req, res, next) =>
  emailController.sendBulkEmails(req, res, next)
);

export default router;
