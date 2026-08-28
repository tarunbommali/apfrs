// backend/src/routes/faculty.routes.js
import { Router } from 'express';
import { facultyController } from '../controllers/faculty.controller.js';
import { reportService } from '../services/report.service.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// All faculty routes require token and faculty or admin role
router.use(verifyToken, requireRole('faculty', 'admin'));

router.get('/profile', (req, res, next) => facultyController.getProfile(req, res, next));
router.post('/change-password', (req, res, next) => facultyController.changePassword(req, res, next));
router.get('/attendance', (req, res, next) => facultyController.getAttendance(req, res, next));
router.get('/colleagues', (req, res, next) => facultyController.getColleagues(req, res, next));
router.get('/department', (req, res, next) => facultyController.getDepartmentStats(req, res, next));

// Secure individual PDF download
router.get('/attendance/report/pdf', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const cfmsId = req.user?.cfms_id;
    if (!cfmsId) {
      return res.status(400).json({ success: false, error: 'User does not possess a registered CFMS ID.' });
    }
    const reportData = await reportService.getReportData(cfmsId, parseInt(month), parseInt(year));
    const pdf = await reportService.generatePdf(reportData);
    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${cfmsId}-${year}-${month}.pdf`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

export default router;
