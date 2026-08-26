// backend/src/controllers/admin.controller.js
import { userService } from '../services/user.service.js';
import { attendanceService } from '../services/attendance.service.js';
import { sendSuccess, sendCreated } from '../utils/response.js';

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
      const result = await attendanceService.sendAttendance({
        attendanceData: req.body.attendanceData,
        emailTemplate: req.body.emailTemplate,
        sentBy: req.body.sentBy || req.user.email,
        triggeredBy: req.user.name || 'Admin',
      });
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
}

export const adminController = new AdminController();
export default adminController;
