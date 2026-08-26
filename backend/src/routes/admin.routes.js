// backend/src/routes/admin.routes.js
import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validation.js';
import { facultyCreateSchema, facultyUpdateSchema, attendanceSendSchema } from '../validators/admin.validator.js';

const router = Router();

// All admin routes require token and admin role
router.use(verifyToken, requireRole('admin'));

// Faculty management
router.get('/faculty', (req, res, next) => adminController.getFacultyList(req, res, next));
router.get('/faculty/:id', (req, res, next) => adminController.getFacultyById(req, res, next));
router.post('/faculty', validate(facultyCreateSchema), (req, res, next) => adminController.createFaculty(req, res, next));
router.put('/faculty/:id', validate(facultyUpdateSchema), (req, res, next) => adminController.updateFaculty(req, res, next));
router.delete('/faculty/:id', (req, res, next) => adminController.deleteFaculty(req, res, next));

// Attendance management
router.get('/attendance/batches', (req, res, next) => adminController.getAttendanceBatches(req, res, next));
router.get('/attendance/send/:batchId', (req, res, next) => adminController.getAttendanceBatchStatus(req, res, next));
router.post('/attendance/send', validate(attendanceSendSchema), (req, res, next) => adminController.sendAttendance(req, res, next));

// Stats
router.get('/stats', (req, res, next) => adminController.getStats(req, res, next));

export default router;
