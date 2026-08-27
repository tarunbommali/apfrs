// backend/src/services/attendance.service.js
import { attendanceRepository } from '../repositories/attendance.repository.js';
import { monthlyAttendanceRepository } from '../repositories/monthly-attendance.repository.js';
import { emailService } from './email.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { jobQueueService } from './job-queue.service.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import { generateFacultyAttendanceEmailHTML, generateFacultyAttendanceEmailPlainText } from '../utils/email-template.js';

class AttendanceService {
  async sendAttendance(data) {
    const { attendanceData, emailTemplate, sentBy, triggeredBy } = data;

    // Phase 5: one bulk IN-clause query instead of N sequential findByEmail/findByCfmsId calls
    const emails  = attendanceData.map((r) => r.email).filter(Boolean);
    const cfmsIds = attendanceData.map((r) => r.employeeId).filter(Boolean);
    const facultyMap = await userRepository.findByEmailsOrCfmsIds(emails, cfmsIds);

    const facultyList = attendanceData.map((record) => {
      const faculty =
        facultyMap.get(record.email?.toLowerCase()) ||
        facultyMap.get(record.employeeId);
      return {
        id:           faculty?.id || record.employeeId,
        employeeId:   record.employeeId,
        employeeName: record.employeeName,
        email:        record.email,
        name:         faculty?.name || record.employeeName,
      };
    });

    const batch = await attendanceRepository.createBatch({
      triggeredBy,
      sentBy: sentBy || triggeredBy,
      totalFaculty: facultyList.length,
      emailTemplate: emailTemplate?.subject || 'Attendance Report',
      facultyList,
      month: attendanceData[0]?.month,
      year: attendanceData[0]?.year,
    });

    // Phase 6: enqueue durable job instead of fire-and-forget
    // The job is persisted in MySQL before the response is sent, so a server
    // crash or restart no longer silently loses the dispatch.
    await jobQueueService.enqueue('dispatch_attendance_batch', {
      batchId: batch.batchId,
      attendanceData,
      emailTemplate,
      facultyList,
    });

    logger.info('Attendance dispatch enqueued', {
      batchId: batch.batchId,
      totalFaculty: facultyList.length,
    });

    return {
      success: true,
      message: `Attendance dispatch initiated for ${facultyList.length} faculty members.`,
      batchId: batch.batchId,
      timestamp: batch.createdAt,
      statusUrl: `/api/admin/attendance/send/${batch.batchId}`,
    };
  }

  async dispatchBatch(batchId, attendanceData, emailTemplate, facultyList) {
    try {
      await attendanceRepository.updateBatchStatus(batchId, 'processing');
      const emails = [];

      for (const record of attendanceData) {
        const faculty = facultyList.find((f) => f.email === record.email || f.employeeId === record.employeeId || f.cfmsId === record.cfmsId);
        const name = faculty?.name || record.name || record.employeeName || 'Faculty Member';
        const empId = faculty?.employeeId || record.cfmsId || record.employeeId || '';
        const dept = faculty?.department || record.department || 'Academic Department';
        const desig = faculty?.designation || record.designation || 'Faculty';

        const monthName = record.monthName || record.month || 'January';
        const year = record.year || 2025;
        const periodLabel = `${monthName} ${year}`;

        const summary = {
          presentDays: record.presentDays ?? record.pDays ?? record.present_days ?? 0,
          workingDays: record.workingDays ?? record.wDays ?? record.total_working_days ?? 27,
          absentDays: record.absentDays ?? record.aDays ?? record.absent_days ?? 0,
          attendancePercentage: record.attendancePercentage ?? record.percentage ?? undefined,
          holidays: record.holidays ?? 4,
        };

        const html = generateFacultyAttendanceEmailHTML({
          faculty: {
            name,
            cfmsId: empId,
            employeeId: empId,
            department: dept,
            designation: desig,
            email: record.email,
          },
          summary,
          periodLabel,
        });

        const plainText = generateFacultyAttendanceEmailPlainText({
          faculty: {
            name,
            cfmsId: empId,
            employeeId: empId,
            department: dept,
            designation: desig,
            email: record.email,
          },
          summary,
          periodLabel,
        });

        emails.push({
          to: record.email,
          subject: emailTemplate?.subject || `Monthly Attendance Statement — ${periodLabel}`,
          html,
          text: plainText,
          employeeId: empId,
          employeeName: name,
        });
      }

      const bulkResult = await emailService.sendBulkEmails(emails);
      await attendanceRepository.updateBatchStatus(batchId, bulkResult.success ? 'sent' : 'failed', bulkResult.results);

      logger.info('Batch processing completed', {
        batchId,
        sent: bulkResult.sent,
        failed: bulkResult.failed,
      });
    } catch (error) {
      logger.error('Batch processing exception', { batchId, error: error.message });
      await attendanceRepository.updateBatchStatus(batchId, 'failed');
    }
  }

  async getBatches(filters) {
    const batches = await attendanceRepository.getBatches(filters);
    const stats = await attendanceRepository.getStats();
    return {
      batches,
      stats,
    };
  }

  async getBatchStatus(batchId) {
    return attendanceRepository.findBatchById(batchId);
  }

  async getFacultyAttendance(facultyId) {
    return attendanceRepository.getFacultyAttendance(facultyId);
  }

  async getStats() {
    return attendanceRepository.getStats();
  }

  /**
   * Imports parsed Excel attendance data directly into the MySQL database,
   * auto-syncs faculty records into users table, and returns the persisted data.
   */
  async importAttendanceData(data, uploadedBy = 'Admin') {
    const { records, month, year, fileName } = data;

    if (!records || !Array.isArray(records) || records.length === 0) {
      throw new AppError(400, 'No attendance records provided in upload.');
    }
    if (!month || !year) {
      throw new AppError(400, 'Reporting month and year are required.');
    }

    const savedData = await monthlyAttendanceRepository.saveMonthlySheetAndRecords(
      month,
      year,
      fileName || `attendance-${year}-${month}.xlsx`,
      records,
      uploadedBy
    );

    return {
      success: true,
      message: `Successfully seeded ${records.length} faculty attendance records into database for ${month}/${year}.`,
      data: savedData,
    };
  }

  /**
   * Retrieves active or specified monthly attendance records from MySQL.
   */
  async getMonthlyAttendanceRecords(month = null, year = null) {
    if (month && year) {
      const data = await monthlyAttendanceRepository.getMonthlyAttendance(month, year);
      return data || { month, year, records: [], totalFaculty: 0 };
    }
    const latest = await monthlyAttendanceRepository.getLatestMonthlyAttendance();
    return latest || { month: new Date().getMonth() + 1, year: new Date().getFullYear(), records: [], totalFaculty: 0 };
  }

  /**
   * Returns list of all uploaded attendance months.
   */
  async getAvailableMonths() {
    return monthlyAttendanceRepository.getAvailableMonths();
  }

  /**
   * Returns database-aggregated analytics (department summaries, overall metrics).
   */
  async getMonthlyAnalytics(month = null, year = null) {
    return monthlyAttendanceRepository.getMonthlyAnalytics(month, year);
  }

  /**
   * Retrieves personal attendance for a faculty member.
   */
  async getMyAttendance(user, month = null, year = null) {
    if (!user || (!user.email && !user.cfms_id)) {
      throw new AppError(401, 'User context not found');
    }
    return monthlyAttendanceRepository.getFacultyAttendance(user.email || user.cfms_id, month, year);
  }

  /**
   * Register this service's job handlers with the queue.
   * Must be called once in server.js after jobQueueService.start().
   */
  static registerHandlers() {
    jobQueueService.register('dispatch_attendance_batch', async (payload) => {
      const { batchId, attendanceData, emailTemplate, facultyList } = payload;
      await attendanceService.dispatchBatch(batchId, attendanceData, emailTemplate, facultyList);
    });
  }
}

export { AttendanceService };
export const attendanceService = new AttendanceService();
export default attendanceService;
