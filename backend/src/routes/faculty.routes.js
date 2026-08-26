// backend/src/routes/faculty.routes.js
import { Router } from 'express';
import { facultyController } from '../controllers/faculty.controller.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// All faculty routes require token and faculty or admin role
router.use(verifyToken, requireRole('faculty', 'admin'));

router.get('/profile', (req, res, next) => facultyController.getProfile(req, res, next));
router.get('/attendance', (req, res, next) => facultyController.getAttendance(req, res, next));
router.get('/colleagues', (req, res, next) => facultyController.getColleagues(req, res, next));
router.get('/department', (req, res, next) => facultyController.getDepartmentStats(req, res, next));

export default router;
