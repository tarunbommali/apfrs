// backend/src/routes/admin.routes.js
import express, { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validation.js';
import {
  facultyCreateSchema,
  facultyUpdateSchema,
  inchargeCreateSchema,
  inchargeUpdateSchema,
  attendanceSendSchema,
} from '../validators/admin.validator.js';

const router = Router();

// All admin routes require token and admin role
router.use(verifyToken, requireRole('admin'));

// Faculty management
router.get('/faculty', (req, res, next) => adminController.getFacultyList(req, res, next));
router.get('/faculty/:id', (req, res, next) => adminController.getFacultyById(req, res, next));
router.post('/faculty', validate(facultyCreateSchema), (req, res, next) => adminController.createFaculty(req, res, next));
router.put('/faculty/:id', validate(facultyUpdateSchema), (req, res, next) => adminController.updateFaculty(req, res, next));
router.delete('/faculty/:id', (req, res, next) => adminController.deleteFaculty(req, res, next));

// Departments management
router.get('/departments', (req, res, next) => adminController.getDepartmentsList(req, res, next));
router.get('/departments/:id', (req, res, next) => adminController.getDepartmentById(req, res, next));
router.post('/departments', (req, res, next) => adminController.createDepartment(req, res, next));
router.put('/departments/:id', (req, res, next) => adminController.updateDepartment(req, res, next));
router.delete('/departments/:id', (req, res, next) => adminController.deleteDepartment(req, res, next));
router.put('/departments/:id/incharge', (req, res, next) => adminController.assignDepartmentIncharge(req, res, next));
router.put('/departments/:id/status', (req, res, next) => adminController.updateDepartmentStatus(req, res, next));
router.get('/departments/:id/faculty', (req, res, next) => adminController.getDepartmentFaculty(req, res, next));

// Faculty Incharge Assignment management
router.get('/faculty/:id/incharge', (req, res, next) => adminController.getFacultyIncharge(req, res, next));
router.post('/faculty/:id/incharge', validate(inchargeCreateSchema), (req, res, next) => adminController.createFacultyIncharge(req, res, next));
router.put('/faculty/:id/incharge/:assignmentId', validate(inchargeUpdateSchema), (req, res, next) => adminController.updateFacultyIncharge(req, res, next));
router.post('/faculty/:id/incharge/:assignmentId/end', (req, res, next) => adminController.endFacultyIncharge(req, res, next));
router.delete('/faculty/:id/incharge/:assignmentId', (req, res, next) => adminController.deleteFacultyIncharge(req, res, next));

// Attendance management
router.get('/attendance/batches', (req, res, next) => adminController.getAttendanceBatches(req, res, next));
router.get('/attendance/send/:batchId', (req, res, next) => adminController.getAttendanceBatchStatus(req, res, next));
router.post(
  '/attendance/send',
  express.json({ limit: '50mb' }),
  validate(attendanceSendSchema),
  (req, res, next) => adminController.sendAttendance(req, res, next)
);

// Monthly Attendance & Excel Import (Database-backed)
router.post(
  '/attendance/import',
  express.json({ limit: '50mb' }),
  (req, res, next) => adminController.importAttendance(req, res, next)
);
router.get('/attendance/records', (req, res, next) => adminController.getAttendanceRecords(req, res, next));
router.get('/attendance/months', (req, res, next) => adminController.getAttendanceMonths(req, res, next));
router.get('/attendance/analytics', (req, res, next) => adminController.getAttendanceAnalytics(req, res, next));

// Academic Calendar Management
router.get('/calendar', (req, res, next) => adminController.getCalendar(req, res, next));
router.post('/calendar', (req, res, next) => adminController.saveCalendar(req, res, next));
router.post('/calendar/holidays', (req, res, next) => adminController.createHoliday(req, res, next));
router.put('/calendar/holidays/:id', (req, res, next) => adminController.updateHoliday(req, res, next));
router.delete('/calendar/holidays/:id', (req, res, next) => adminController.deleteHoliday(req, res, next));

// Email Configuration & Multi-Provider Settings
router.get('/email-config', (req, res, next) => adminController.getEmailConfig(req, res, next));
router.put('/email-config', (req, res, next) => adminController.updateEmailConfig(req, res, next));
router.post('/email-config/test', (req, res, next) => adminController.sendTestEmail(req, res, next));
router.get('/email-config/logs', (req, res, next) => adminController.getEmailConfigLogs(req, res, next));

// Stats
router.get('/stats', (req, res, next) => adminController.getStats(req, res, next));

export default router;
