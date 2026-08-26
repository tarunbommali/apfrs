// backend/src/routes/index.js
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import facultyRoutes from './faculty.routes.js';
import emailRoutes from './email.routes.js';
import healthRoutes from './health.routes.js';
import { emailController } from '../controllers/email.controller.js';
import { emailLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validation.js';
import { emailSchema, bulkEmailSchema, testSMTPSchema } from '../validators/email.validator.js';

const router = Router();

// Modular namespace routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/faculty', facultyRoutes);
router.use('/email', emailRoutes);
router.use('/', healthRoutes);

// Legacy route aliases for backwards-compatibility with frontend
router.post('/send-email', emailLimiter, validate(emailSchema), (req, res, next) =>
  emailController.sendEmail(req, res, next)
);
router.post('/send-bulk-email', emailLimiter, validate(bulkEmailSchema), (req, res, next) =>
  emailController.sendBulkEmails(req, res, next)
);
router.get('/email-status/:id', (req, res, next) => emailController.getEmailStatus(req, res, next));
router.post('/test-smtp', validate(testSMTPSchema), (req, res, next) => emailController.testSMTP(req, res, next));

export default router;
