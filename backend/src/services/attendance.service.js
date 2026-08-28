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
    // Filter out already sent ones to prevent duplicate dispatch in the same month
    let alreadySent = new Set();
    const targetMonth = month || (attendanceData && attendanceData[0]?.month);
    const targetYear = year || (attendanceData && attendanceData[0]?.year);
    if (targetMonth && targetYear) {
      try {
        const sentRows = await db.query(
          `SELECT DISTINCT employee_id, email FROM attendance_records WHERE month = ? AND year = ? AND status = 'sent'`,
          [String(targetMonth), String(targetYear)]
        );
        for (const r of sentRows) {
          if (r.employee_id) alreadySent.add(String(r.employee_id).trim());
          if (r.email) alreadySent.add(r.email.toLowerCase().trim());
        }
      } catch (err) {
        logger.warn('Could not read already sent records:', { error: err.message });
      }
    }

    if (attendanceData && attendanceData.length > 0) {
      attendanceData = attendanceData.filter((r) => {
        const emailKey = r.email?.toLowerCase().trim();
        const cfmsKey = String(r.employeeId || r.cfmsId || '').trim();
        return !alreadySent.has(emailKey) && !alreadySent.has(cfmsKey);
      });
    }

    if (!attendanceData || attendanceData.length === 0) {
      throw new AppError(400, 'All selected faculty members have already received their statements for this month.');
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

      // 2. Check all successfully sent emails in the database for this month and year (cross-batch idempotency)
      let alreadySentEmails = new Set();
      const monthNum = attendanceData[0]?.month ? parseInt(attendanceData[0].month, 10) : new Date().getMonth() + 1;
      const yearNum = attendanceData[0]?.year ? parseInt(attendanceData[0].year, 10) : new Date().getFullYear();
      try {
        const sentRows = await db.query(
          `SELECT DISTINCT email, employee_id FROM attendance_records WHERE month = ? AND year = ? AND status = 'sent'`,
          [String(monthNum), String(yearNum)]
        );
        for (const r of sentRows) {
          if (r.email) alreadySentEmails.add(r.email.toLowerCase().trim());
          if (r.employee_id) alreadySentEmails.add(String(r.employee_id).trim());
        }
      } catch (err) {
        logger.warn('Could not query sent records for idempotency check:', { error: err.message });
      }

      const emails = [];

      for (const record of attendanceData) {
        const recEmail = record.email?.toLowerCase().trim() || '';
        const recEmpId = String(record.cfmsId || record.employeeId || '').trim();

        // Skip if already successfully sent for this month in any batch
        if ((recEmail && alreadySentEmails.has(recEmail)) || (recEmpId && alreadySentEmails.has(recEmpId))) {
          logger.info('Skipping already-sent email in batch retry', { batchId, email: recEmail, empId: recEmpId });
          await db.query(
            `UPDATE attendance_records SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE batch_id = ? AND (email = ? OR employee_id = ?)`,
            [batchId, recEmail, recEmpId]
          );
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

        let reportData = null;
        let pdfBuffer = null;
        try {
          reportData = await reportService.getReportData(empId, monthNum, yearNum);
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

        // Dispute deadline: 7 days from now formatted as DD-MM-YYYY in local time
        const disputeDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

        const html = reportData ? generateFacultyAttendanceEmailHTML({
          report: reportData,
          monthName,
          disputeDeadline,
        }) : `
          <p>Dear ${name},</p>
          <p>Please find attached your Attendance Performance Report for ${periodLabel}.</p>
          <p>Regards,<br>APFRS Reporting Cell</p>
        `;

        const plainText = reportData ? generateFacultyAttendanceEmailPlainText({
          report: reportData,
          monthName,
          disputeDeadline,
        }) : `Dear ${name},\n\nPlease find attached your Attendance Performance Report for ${periodLabel}.\n\nRegards,\nAPFRS Reporting Cell`;

        emails.push({
          to: record.email || (reportData && reportData.employee?.email),
          subject: `Attendance Report — ${monthName} ${yearNum}`,
          html,
          text: plainText,
          employeeId: empId,
          employeeName: name,
          attachments,
          skipSignature: true,
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
