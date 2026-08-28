// backend/src/services/attendance.service.js
import { attendanceRepository } from '../repositories/attendance.repository.js';
import { monthlyAttendanceRepository } from '../repositories/monthly-attendance.repository.js';
import { emailService } from './email.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { jobQueueService } from './job-queue.service.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import { generateFacultyAttendanceEmailHTML, generateFacultyAttendanceEmailPlainText } from '../utils/email-template.js';
import { reportService } from './report.service.js';

class AttendanceService {
  async sendAttendance(data) {
    let { attendanceData, emailTemplate, sentBy, triggeredBy, month, year, facultyIds } = data;

    // Resolve database records if dispatched from cockpit using faculty IDs
    if ((!attendanceData || attendanceData.length === 0) && month && year && facultyIds && facultyIds.length > 0) {
      const recordsObj = await monthlyAttendanceRepository.getMonthlyAttendance(month, year);
      if (!recordsObj) {
        throw new AppError(404, `No attendance statement found for ${month}/${year}`);
      }
      attendanceData = recordsObj.records
        .filter(r => facultyIds.includes(r.facultyId) || facultyIds.includes(r.cfmsId) || facultyIds.includes(r.id))
        .map(r => ({
          employeeId: r.cfmsId,
          employeeName: r.name,
          email: r.email,
          month: month,
          year: year,
          presentDays: r.presentDays,
          workingDays: r.totalWorkingDays,
          absentDays: r.absentDays,
          attendancePercentage: r.attendancePercentage,
          holidays: r.holidayDays,
        }));
    }

    if (!attendanceData || attendanceData.length === 0) {
      throw new AppError(400, 'No attendance records provided for dispatch.');
    }

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

      // 1. Build O(1) lookup maps for faculty matching
      const facultyByEmail = new Map();
      const facultyByEmpId = new Map();
      for (const f of facultyList) {
        if (f.email) facultyByEmail.set(f.email.toLowerCase().trim(), f);
        if (f.employeeId) facultyByEmpId.set(String(f.employeeId).trim(), f);
        if (f.cfmsId) facultyByEmpId.set(String(f.cfmsId).trim(), f);
        if (f.id) facultyByEmpId.set(String(f.id).trim(), f);
      }

      // 2. Check existing record statuses for idempotency (avoid re-sending already sent emails on retry)
      let alreadySentEmails = new Set();
      try {
        const existingRecords = await attendanceRepository.getBatchRecords(batchId);
        if (Array.isArray(existingRecords)) {
          existingRecords
            .filter((r) => r.status === 'sent')
            .forEach((r) => {
              if (r.email) alreadySentEmails.add(r.email.toLowerCase().trim());
            });
        }
      } catch (err) {
        logger.warn('Could not query existing batch records for idempotency check:', { error: err.message });
      }

      const emails = [];

      for (const record of attendanceData) {
        const recEmail = record.email?.toLowerCase().trim() || '';
        const recEmpId = String(record.cfmsId || record.employeeId || '').trim();

        // Skip if already successfully sent
        if (recEmail && alreadySentEmails.has(recEmail)) {
          logger.info('Skipping already-sent email in batch retry', { batchId, email: recEmail });
          continue;
        }

        // O(1) resolution
        const faculty = (recEmail && facultyByEmail.get(recEmail)) || (recEmpId && facultyByEmpId.get(recEmpId));
        const name = faculty?.name || record.name || record.employeeName || 'Faculty Member';
        const empId = faculty?.employeeId || faculty?.cfmsId || recEmpId || '';
        const dept = faculty?.department || record.department || 'Academic Department';
        const desig = faculty?.designation || record.designation || 'Faculty';

        const monthNum = record.month ? parseInt(record.month, 10) : new Date().getMonth() + 1;
        const yearNum = record.year ? parseInt(record.year, 10) : new Date().getFullYear();
        const MONTH_NAMES = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthName = MONTH_NAMES[monthNum - 1] || 'Monthly';
        const periodLabel = `${monthName} ${yearNum}`;

        let pdfBuffer;
        try {
          const reportData = await reportService.getReportData(empId, monthNum, yearNum);
          pdfBuffer = await reportService.generatePdf(reportData);
        } catch (reportErr) {
          logger.error('Failed to generate PDF for batch faculty:', { empId, error: reportErr.message });
        }

        const attachments = pdfBuffer ? [
          {
            filename: `attendance-${empId}-${yearNum}-${monthNum}.pdf`,
            content: pdfBuffer,
          }
        ] : [];

        const html = `
          <p>Dear ${name},</p>
          <p>Please find attached your Attendance Performance Report for ${periodLabel}.</p>
          <p>Regards,<br>APFRS Reporting Cell</p>
        `;

        const plainText = `Dear ${name},\n\nPlease find attached your Attendance Performance Report for ${periodLabel}.\n\nRegards,\nAPFRS Reporting Cell`;

        emails.push({
          to: record.email,
          subject: emailTemplate?.subject || `Monthly Attendance Statement — ${periodLabel}`,
          html,
          text: plainText,
          employeeId: empId,
          employeeName: name,
          attachments,
        });
      }

      if (emails.length > 0) {
        const bulkResult = await emailService.sendBulkEmails(emails);
        await attendanceRepository.updateBatchStatus(batchId, bulkResult.success ? 'sent' : 'failed', bulkResult.results);

        logger.info('Batch processing completed', {
          batchId,
          sent: bulkResult.sent,
          failed: bulkResult.failed,
        });
      } else {
        logger.info('All records in batch already sent', { batchId });
        await attendanceRepository.updateBatchStatus(batchId, 'sent', []);
      }
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

    const savedResult = await monthlyAttendanceRepository.saveMonthlySheetAndRecords(
      month,
      year,
      fileName || `attendance-${year}-${month}.xlsx`,
      records,
      uploadedBy
    );

    const importedCount = savedResult.records?.length || 0;
    const skippedCount = savedResult.warnings?.length || 0;

    return {
      success: true,
      message: `Successfully seeded ${importedCount} faculty attendance records. Skipped ${skippedCount} unregistered records.`,
      data: savedResult,
      warnings: savedResult.warnings || [],
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
   * Retrieves personal attendance history for all months.
   */
  async getAllMyAttendance(user) {
    if (!user || (!user.email && !user.cfms_id)) {
      throw new AppError(401, 'User context not found');
    }
    return monthlyAttendanceRepository.getAllFacultyAttendance(user.email || user.cfms_id);
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
