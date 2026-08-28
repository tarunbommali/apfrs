// backend/src/services/attendance.service.js
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
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
    let { attendanceData, emailTemplate, sentBy, triggeredBy, month, year, facultyIds, forceResend } = data;

    // Prevent duplicate dispatches (Section 6)
    if (month && year && facultyIds && facultyIds.length > 0) {
      const recentBatches = await db.query(
        `SELECT batch_id FROM attendance_batches 
         WHERE month = ? AND year = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 SECOND)`,
        [String(month), String(year)]
      );
      
      for (const b of recentBatches) {
        const records = await db.query(
          `SELECT faculty_id FROM attendance_records WHERE batch_id = ?`,
          [b.batch_id]
        );
        const existingFacultyIds = records.map(r => r.faculty_id);
        const hasOverlap = facultyIds.some(id => existingFacultyIds.includes(id));
        if (hasOverlap) {
          throw new AppError(409, 'A dispatch batch for these faculty members is already being processed. Please wait.');
        }
      }
    }

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

    // Filter out already sent ones to prevent duplicate dispatch in the same month (unless forceResend is requested)
    if (!forceResend) {
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
    const settings = await emailService.getEffectiveSettings();
    try {
      // 1. Build lookup maps for faculty matching
      const facultyByEmail = new Map();
      const facultyByEmpId = new Map();
      for (const f of facultyList) {
        if (f.email) facultyByEmail.set(f.email.toLowerCase().trim(), f);
        if (f.employeeId) facultyByEmpId.set(String(f.employeeId).trim(), f);
        if (f.cfmsId) facultyByEmpId.set(String(f.cfmsId).trim(), f);
        if (f.id) facultyByEmpId.set(String(f.id).trim(), f);
      }

      // 2. Fetch already sent records for this month/year for idempotency
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

      await attendanceRepository.recalculateBatchStatus(batchId);

      for (let i = 0; i < attendanceData.length; i++) {
        const record = attendanceData[i];
        const recEmail = record.email?.toLowerCase().trim() || '';
        const recEmpId = String(record.cfmsId || record.employeeId || '').trim();

        // Check if already successfully sent for this month in any batch
        if ((recEmail && alreadySentEmails.has(recEmail)) || (recEmpId && alreadySentEmails.has(recEmpId))) {
          logger.info('Skipping already-sent email in batch retry', { batchId, email: recEmail, empId: recEmpId });
          await db.query(
            `UPDATE attendance_records SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE batch_id = ? AND (email = ? OR employee_id = ?)`,
            [batchId, recEmail, recEmpId]
          );
          await attendanceRepository.recalculateBatchStatus(batchId);
          continue;
        }

        // O(1) resolution
        const faculty = (recEmail && facultyByEmail.get(recEmail)) || (recEmpId && facultyByEmpId.get(recEmpId));
        const name = faculty?.name || record.name || record.employeeName || 'Faculty Member';
        const empId = faculty?.employeeId || faculty?.cfmsId || recEmpId || '';

        const monthNum = record.month ? parseInt(record.month, 10) : new Date().getMonth() + 1;
        const yearNum = record.year ? parseInt(record.year, 10) : new Date().getFullYear();
        const MONTH_NAMES = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthName = MONTH_NAMES[monthNum - 1] || 'Monthly';
        const periodLabel = `${monthName} ${yearNum}`;

        // Set status to 'sending' before we start
        await db.query(
          `UPDATE attendance_records SET status = 'sending', updated_at = NOW() WHERE batch_id = ? AND (email = ? OR employee_id = ?)`,
          [batchId, recEmail || null, recEmpId || null]
        );
        await attendanceRepository.recalculateBatchStatus(batchId);

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

        const emailOptions = {
          to: record.email || (reportData && reportData.employee?.email),
          subject: `Attendance Report — ${monthName} ${yearNum}`,
          html,
          text: plainText,
          employeeId: empId,
          employeeName: name,
          attachments,
          skipSignature: true,
          month: monthNum,
          year: yearNum,
        };

        try {
          const emailRes = await emailService.sendEmail(emailOptions, settings);
          await db.query(
            `UPDATE attendance_records 
             SET status = 'sent', message_id = ?, error_message = NULL, sent_at = NOW(), updated_at = NOW() 
             WHERE batch_id = ? AND (email = ? OR employee_id = ?)`,
            [emailRes.messageId, batchId, recEmail || null, recEmpId || null]
          );
        } catch (emailErr) {
          await db.query(
            `UPDATE attendance_records 
             SET status = 'failed', error_message = ?, sent_at = NULL, updated_at = NOW() 
             WHERE batch_id = ? AND (email = ? OR employee_id = ?)`,
            [emailErr.message, batchId, recEmail || null, recEmpId || null]
          );
        }

        await attendanceRepository.recalculateBatchStatus(batchId);

        // Batch delay between emails
        if (i < attendanceData.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, settings.batch_delay || 200));
        }
      }

      logger.info('Batch processing completed', { batchId });
    } catch (error) {
      logger.error('Batch processing exception', { batchId, error: error.message });
      // If something crashed, ensure we mark remaining queued/sending records as failed
      await db.query(
        `UPDATE attendance_records SET status = 'failed', error_message = ? WHERE batch_id = ? AND status IN ('queued', 'sending')`,
        [error.message, batchId]
      );
      await attendanceRepository.recalculateBatchStatus(batchId);
    }
  }

  async retryBatch(originalBatchId, metadata) {
    const originalBatch = await attendanceRepository.findBatchById(originalBatchId);
    if (!originalBatch) {
      throw new AppError(404, 'Original batch not found.');
    }

    const failedRecords = await db.query(
      `SELECT * FROM attendance_records WHERE batch_id = ? AND status = 'failed'`,
      [originalBatchId]
    );

    if (failedRecords.length === 0) {
      throw new AppError(400, 'No failed records found to retry.');
    }

    const retryBatchId = uuidv4();

    await db.transaction(async (conn) => {
      // Create new batch
      await conn.query(
        `INSERT INTO attendance_batches (
          id, batch_id, retry_of_batch_id, status, triggered_by, sent_by, total_faculty,
          email_template_subject, month, year, created_at, updated_at
         ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          retryBatchId,
          retryBatchId,
          originalBatchId,
          metadata.triggeredBy,
          metadata.sentBy,
          failedRecords.length,
          originalBatch.emailTemplate,
          originalBatch.month,
          originalBatch.year,
        ]
      );

      // Create records
      const placeholders = failedRecords
        .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())')
        .join(', ');

      const values = failedRecords.flatMap((r) => [
        uuidv4(),
        retryBatchId,
        r.faculty_id,
        r.employee_id,
        r.employee_name,
        r.email,
        r.month,
        r.year,
        'queued',
      ]);

      await conn.query(
        `INSERT INTO attendance_records (
           id, batch_id, faculty_id, employee_id, employee_name, email,
           month, year, status, created_at, updated_at
         ) VALUES ${placeholders}`,
        values
      );
    });

    const facultyIds = failedRecords.map((r) => r.faculty_id);
    const recordsObj = await monthlyAttendanceRepository.getMonthlyAttendance(originalBatch.month, originalBatch.year);
    const targetRecords = recordsObj.records
      .filter((r) => facultyIds.includes(r.facultyId) || facultyIds.includes(r.cfmsId) || facultyIds.includes(r.id));

    const attendanceData = targetRecords.map((r) => ({
      employeeId: r.cfmsId,
      employeeName: r.name,
      email: r.email,
      month: originalBatch.month,
      year: originalBatch.year,
      presentDays: r.presentDays,
      workingDays: r.totalWorkingDays,
      absentDays: r.absentDays,
      attendancePercentage: r.attendancePercentage,
      holidays: r.holidayDays,
    }));

    const facultyList = failedRecords.map((r) => ({
      id: r.faculty_id,
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      email: r.email,
      name: r.employee_name,
    }));

    await jobQueueService.enqueue('dispatch_attendance_batch', {
      batchId: retryBatchId,
      attendanceData,
      emailTemplate: { subject: originalBatch.emailTemplate },
      facultyList,
    });

    logger.info('Attendance retry dispatch enqueued', {
      originalBatchId,
      retryBatchId,
      totalFaculty: failedRecords.length,
    });

    return {
      success: true,
      message: `Attendance retry dispatch initiated for ${failedRecords.length} failed faculty members.`,
      batchId: retryBatchId,
    };
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
    let targetMonth = month;
    let targetYear = year;
    
    let data;
    if (targetMonth && targetYear) {
      data = await monthlyAttendanceRepository.getMonthlyAttendance(targetMonth, targetYear);
    } else {
      data = await monthlyAttendanceRepository.getLatestMonthlyAttendance();
      if (data) {
        targetMonth = data.month;
        targetYear = data.year;
      }
    }

    if (!data) {
      return { month: targetMonth, year: targetYear, records: [], totalFaculty: 0 };
    }

    // Fetch the dispatch records for this month and year to map statuses (sent, failed, pending, etc.)
    if (targetMonth && targetYear) {
      try {
        const dispatchRows = await db.query(
          `SELECT faculty_id, status FROM attendance_records WHERE month = ? AND year = ?`,
          [String(targetMonth), String(targetYear)]
        );

        // Map faculty_id to its latest status
        const statusMap = new Map();
        for (const row of dispatchRows) {
          // Priority: sent > sending > queued > failed
          const existing = statusMap.get(row.faculty_id);
          if (!existing) {
            statusMap.set(row.faculty_id, row.status);
          } else {
            const priority = { sent: 4, sending: 3, queued: 2, failed: 1 };
            if ((priority[row.status] || 0) > (priority[existing] || 0)) {
              statusMap.set(row.faculty_id, row.status);
            }
          }
        }

        // Attach dispatchStatus to each record
        for (const record of data.records) {
          const status = statusMap.get(record.facultyId || record.id);
          record.dispatchStatus = status || null;
        }
      } catch (err) {
        logger.error('Failed to attach dispatch statuses to monthly attendance records:', err);
      }
    }

    return data;
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
