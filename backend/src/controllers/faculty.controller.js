// backend/src/controllers/faculty.controller.js
import { userService } from '../services/user.service.js';
import { attendanceService } from '../services/attendance.service.js';
import { sendSuccess } from '../utils/response.js';

export class FacultyController {
  async getProfile(req, res, next) {
    try {
      const profile = await userService.getFacultyById(req.user.id);
      return sendSuccess(res, { profile });
    } catch (error) {
      next(error);
    }
  }

  async getAttendance(req, res, next) {
    try {
      const { month, year } = req.query;
      const monthlyRecords = await attendanceService.getMyAttendance(req.user, month, year);
      const attendance = await attendanceService.getFacultyAttendance(req.user.id);
      return sendSuccess(res, { attendance, monthlyRecords });
    } catch (error) {
      next(error);
    }
  }

  async getColleagues(req, res, next) {
    try {
      const result = await userService.getColleagues(req.user.id);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getDepartmentStats(req, res, next) {
    try {
      const result = await userService.getColleagues(req.user.id);
      return sendSuccess(res, {
        department: result.department,
        totalFaculty: result.total,
        colleagues: result.colleagues,
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await userService.changePassword(req.user.id, currentPassword, newPassword);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const facultyController = new FacultyController();
export default facultyController;
