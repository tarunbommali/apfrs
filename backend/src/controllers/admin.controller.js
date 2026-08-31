// backend/src/controllers/admin.controller.js
import db from '../config/database.js';
import { userService } from '../services/user.service.js';
import { attendanceService } from '../services/attendance.service.js';
import { inchargeService } from '../services/incharge.service.js';
import { emailService } from '../services/email.service.js';
import { calendarService } from '../services/calendar.service.js';
import { departmentService } from '../services/department.service.js';
import { calendarRepository } from '../repositories/calendar.repository.js';
import { emailSettingsRepository } from '../repositories/email-settings.repository.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

export class AdminController {
  async getFacultyList(req, res, next) {
    try {
      const filters = {
        department: req.query.department,
        job_status: req.query.job_status,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit,
      };
      const result = await userService.getFacultyList(filters);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getFacultyById(req, res, next) {
    try {
      const faculty = await userService.getFacultyById(req.params.id);
      return sendSuccess(res, { faculty });
    } catch (error) {
      next(error);
    }
  }

  async createFaculty(req, res, next) {
    try {
      const faculty = await userService.createFaculty(req.body);
      return sendCreated(res, { message: 'Faculty member added successfully.', faculty });
    } catch (error) {
      next(error);
    }
  }

  async updateFaculty(req, res, next) {
    try {
      const faculty = await userService.updateFaculty(req.params.id, req.body);
      return sendSuccess(res, { message: 'Faculty member updated successfully.', faculty });
    } catch (error) {
      next(error);
    }
  }

  async deleteFaculty(req, res, next) {
    try {
      const result = await userService.deleteFaculty(req.params.id);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async sendAttendance(req, res, next) {
    try {
      const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey || null;
      const result = await attendanceService.sendAttendance({
        attendanceData: req.body.attendanceData,
        emailTemplate: req.body.emailTemplate,
        sentBy: req.body.sentBy || req.user.email,
        triggeredBy: req.user.name || 'Admin',
        month: req.body.month,
        year: req.body.year,
        facultyIds: req.body.facultyIds,
        forceResend: req.body.forceResend,
      }, idempotencyKey);
      return sendSuccess(res, result, 202);
    } catch (error) {
      next(error);
    }
  }

  async getAttendanceBatches(req, res, next) {
    try {
      const result = await attendanceService.getBatches(req.query);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getAttendanceBatchStatus(req, res, next) {
    try {
      const batch = await attendanceService.getBatchStatus(req.params.batchId);
      if (!batch) {
        return res.status(404).json({ success: false, error: 'Batch not found.' });
      }
      return sendSuccess(res, { batch });
    } catch (error) {
      next(error);
    }
  }

  async retryBatch(req, res, next) {
    try {
      const result = await attendanceService.retryBatch(req.params.batchId, {
        triggeredBy: req.user.name || 'Admin',
        sentBy: req.user.email,
      });
      return sendSuccess(res, result, 202);
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const facultyStats = await userService.getStats();
      const attendanceStats = await attendanceService.getStats();
      return sendSuccess(res, {
        stats: {
          faculty: facultyStats,
          attendance: attendanceStats,
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async importAttendance(req, res, next) {
    try {
      const result = await attendanceService.importAttendanceData(req.body, req.user?.email || 'Admin');
      return sendCreated(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getAttendanceRecords(req, res, next) {
    try {
      const { month, year } = req.query;
      const result = await attendanceService.getMonthlyAttendanceRecords(month, year);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getAttendanceMonths(req, res, next) {
    try {
      const months = await attendanceService.getAvailableMonths();
      return sendSuccess(res, { months });
    } catch (error) {
      next(error);
    }
  }

  async getAttendanceAnalytics(req, res, next) {
    try {
      const { month, year } = req.query;
      const analytics = await attendanceService.getMonthlyAnalytics(month, year);
      return sendSuccess(res, { analytics });
    } catch (error) {
      next(error);
    }
  }

  async getCalendar(req, res, next) {
    try {
      const { month, year } = req.query;
      if (month && year) {
        const data = await calendarService.getCalendar(month, year);
        return sendSuccess(res, data);
      }
      const holidays = await calendarService.getAllHolidays();
      return sendSuccess(res, { holidays });
    } catch (error) {
      next(error);
    }
  }

  async createHoliday(req, res, next) {
    try {
      const { date, name, label, type } = req.body;
      const holiday = await calendarService.createHoliday({ date, name, label, type });
      return sendCreated(res, { holiday, message: 'Holiday added successfully.' });
    } catch (error) {
      next(error);
    }
  }

  async updateHoliday(req, res, next) {
    try {
      const { id } = req.params;
      const { date, name, label, type } = req.body;
      const holiday = await calendarService.updateHoliday(id, { date, name, label, type });
      return sendSuccess(res, { holiday, message: 'Holiday updated successfully.' });
    } catch (error) {
      next(error);
    }
  }

  async deleteHoliday(req, res, next) {
    try {
      const { id } = req.params;
      const result = await calendarService.deleteHoliday(id);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async saveCalendar(req, res, next) {
    try {
      const { holidays } = req.body;
      const result = await calendarService.syncCalendar(holidays || []);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  // ── Email Configuration & Multi-Provider Settings ──
  async getEmailConfig(req, res, next) {
    try {
      const settings = await emailSettingsRepository.getSettings();
      const logs = await emailSettingsRepository.getLogs(15);
      
      // Never expose actual password or API key to frontend
      const { smtp_password, resend_api_key, ...safeSettings } = settings;
      const masked = {
        ...safeSettings,
        hasSmtpPassword: Boolean(smtp_password && smtp_password.trim() !== ''),
        hasResendApiKey: Boolean(resend_api_key && resend_api_key.trim() !== ''),
      };

      return sendSuccess(res, { settings: masked, logs });
    } catch (error) {
      next(error);
    }
  }

  async updateEmailConfig(req, res, next) {
    try {
      const updated = await emailSettingsRepository.updateSettings(req.body, req.user?.email || 'Admin');
      return sendSuccess(res, {
        settings: updated,
        message: 'Email configuration saved and applied successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  async sendTestEmail(req, res, next) {
    try {
      const { recipientEmail, providerOverride, tempConfig } = req.body;
      const target = recipientEmail || req.user?.email || 'admin@apfrs.in';
      const result = await emailService.sendTestEmail(target, providerOverride, tempConfig);
      return sendSuccess(res, {
        message: `Test email sent successfully to ${target}.`,
        result,
      });
    } catch (error) {
      return res.status(200).json({
        success: false,
        error: error.message || 'Test dispatch failed.',
        message: error.message || 'Test dispatch failed.',
      });
    }
  }

  // ── Incharge Assignment Management ──
  async getFacultyIncharge(req, res, next) {
    try {
      const result = await inchargeService.getAssignments(req.params.id);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createFacultyIncharge(req, res, next) {
    try {
      const assignment = await inchargeService.createAssignment(req.params.id, req.body);
      return sendCreated(res, {
        assignment,
        message: `Incharge assignment (${assignment.role}) created successfully.`,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateFacultyIncharge(req, res, next) {
    try {
      const assignment = await inchargeService.updateAssignment(req.params.assignmentId, req.body);
      return sendSuccess(res, {
        assignment,
        message: 'Incharge assignment updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  async endFacultyIncharge(req, res, next) {
    try {
      const assignment = await inchargeService.endAssignment(req.params.assignmentId, req.body?.endDate);
      return sendSuccess(res, {
        assignment,
        message: `Incharge assignment (${assignment.role}) ended as of ${assignment.endDate}.`,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteFacultyIncharge(req, res, next) {
    try {
      const result = await inchargeService.deleteAssignment(req.params.assignmentId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  // ─── Departments Management ──────────────────────────────────────────────────

  async getDepartmentsList(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        search: req.query.search,
      };
      const departments = await departmentService.getDepartmentsList(filters);
      return sendSuccess(res, { departments });
    } catch (error) {
      next(error);
    }
  }

  async getDepartmentById(req, res, next) {
    try {
      const department = await departmentService.getDepartmentById(req.params.id);
      return sendSuccess(res, { department });
    } catch (error) {
      next(error);
    }
  }

  async createDepartment(req, res, next) {
    try {
      const department = await departmentService.createDepartment(req.body);
      return sendCreated(res, { message: 'Department created successfully.', department });
    } catch (error) {
      next(error);
    }
  }

  async updateDepartment(req, res, next) {
    try {
      const department = await departmentService.updateDepartment(req.params.id, req.body);
      return sendSuccess(res, { message: 'Department updated successfully.', department });
    } catch (error) {
      next(error);
    }
  }

  async deleteDepartment(req, res, next) {
    try {
      const result = await departmentService.deleteDepartment(req.params.id);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async assignDepartmentIncharge(req, res, next) {
    try {
      const department = await departmentService.assignIncharge(req.params.id, req.body);
      return sendSuccess(res, { message: 'Department leadership updated successfully.', department });
    } catch (error) {
      next(error);
    }
  }

  async updateDepartmentStatus(req, res, next) {
    try {
      const department = await departmentService.updateStatus(req.params.id, req.body.status);
      return sendSuccess(res, { message: 'Department status updated successfully.', department });
    } catch (error) {
      next(error);
    }
  }

  async getDepartmentFaculty(req, res, next) {
    try {
      const faculty = await departmentService.getDepartmentFaculty(req.params.id);
      return sendSuccess(res, { faculty });
    } catch (error) {
      next(error);
    }
  }
  async getBatchItems(req, res, next) {
    try {
      const { batchId } = req.params;
      if (!batchId) throw new AppError(400, 'Batch ID parameter is required.');

      const [batch] = await db.query(
        `SELECT batch_id FROM attendance_batches WHERE batch_id = ?`,
        [batchId]
      );
      if (!batch) {
        throw new AppError(404, 'Attendance batch not found.');
      }

      const rows = await db.query(
        `SELECT id, faculty_id, employee_id, employee_name, email, month, year,
                status, attempts, provider, message_id, error_message, sent_at,
                created_at, updated_at
         FROM attendance_records
         WHERE batch_id = ?
         ORDER BY created_at ASC`,
        [batchId]
      );
      return sendSuccess(res, { items: rows, total: rows.length, batchId });
    } catch (error) {
      next(error);
    }
  }

  async retryItem(req, res, next) {
    try {
      const { recordId } = req.params;
      if (!recordId) throw new AppError(400, 'Record ID parameter is required.');
      const result = await attendanceService.retryItem(recordId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const stats = await attendanceService.getStats();
      return sendSuccess(res, { stats });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
export default adminController;

