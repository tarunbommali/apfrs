// backend/src/services/attendance.service.js
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from '../config/database.js';
import { config } from '../config/index.js';
import { attendanceRepository } from '../repositories/attendance.repository.js';
import { idempotencyRepository } from '../repositories/idempotency.repository.js';
import { monthlyAttendanceRepository } from '../repositories/monthly-attendance.repository.js';
import { emailService } from './email.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { jobQueueService } from './job-queue.service.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import { generateFacultyAttendanceEmailHTML, generateFacultyAttendanceEmailPlainText } from '../utils/email-template.js';
import { reportService } from './report.service.js';

class AttendanceService {
  async sendAttendance(data, idempotencyKey = null) {
    let { attendanceData, emailTemplate, sentBy, triggeredBy, month, year, facultyIds, forceResend } = data;

    // 1. Durable Idempotency Key Evaluation
    let requestHash = null;
    if (idempotencyKey) {
      const canonicalPayload = {
        month: month || (attendanceData && attendanceData[0]?.month) || null,
        year: year || (attendanceData && attendanceData[0]?.year) || null,
        facultyIds: (facultyIds || []).slice().sort(),
        forceResend: Boolean(forceResend),
      };
      requestHash = crypto.createHash('sha256').update(JSON.stringify(canonicalPayload)).digest('hex');

      const existing = await idempotencyRepository.get(idempotencyKey);
      if (existing) {
        if (existing.requestHash === requestHash) {
          logger.info('Returning cached response for idempotency key', { idempotencyKey, batchId: existing.batchId });
          return existing.responseBody;
        } else {
          throw new AppError(409, 'Idempotency key reused with a different request payload.');
        }
      }
    }

    // 2. Resolve database records if dispatched using faculty IDs
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

    // 3. Filter out already sent ones to prevent duplicate dispatch in the same month (unless forceResend is requested)
    if (!forceResend) {
      let alreadySent = new Set();
      const targetMonth = month || (attendanceData && attendanceData[0]?.month);
      const targetYear = year || (attendanceData && attendanceData[0]?.year);
      if (targetMonth && targetYear) {
        try {
          const sentRows = await db.query(
            `SELECT DISTINCT employee_id, email, faculty_id FROM attendance_records WHERE month = ? AND year = ? AND status = 'sent'`,
            [String(targetMonth), String(targetYear)]
          );
          for (const r of sentRows) {
            if (r.faculty_id) alreadySent.add(String(r.faculty_id).trim());
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
          const facKey = String(r.facultyId || r.id || '').trim();
          return !alreadySent.has(emailKey) && !alreadySent.has(cfmsKey) && (!facKey || !alreadySent.has(facKey));
        });
      }

      if (!attendanceData || attendanceData.length === 0) {
        throw new AppError(400, 'All selected faculty members have already received their statements for this month.');
      }
    }

    // 4. Resolve faculty identities
    const emails = attendanceData.map((r) => r.email).filter(Boolean);
    const cfmsIds = attendanceData.map((r) => r.employeeId).filter(Boolean);
    const facultyMap = await userRepository.findByEmailsOrCfmsIds(emails, cfmsIds);

    const facultyList = attendanceData.map((record) => {
      const faculty =
        facultyMap.get(record.email?.toLowerCase()) ||
        facultyMap.get(record.employeeId);
      return {
        id: faculty?.id || record.employeeId,
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        email: record.email,
        name: faculty?.name || record.employeeName,
      };
    });

    const batchId = uuidv4();
    const maxAttempts = config.attendanceMaxAttempts || 3;
    const responsePayload = {
      success: true,
      message: `Attendance dispatch initiated for ${facultyList.length} faculty members.`,
      batchId,
      timestamp: new Date().toISOString(),
      statusUrl: `/api/admin/attendance/send/${batchId}`,
    };

    // 5. ATOMIC TRANSACTION: Create Batch + Records + Durable Job + Idempotency Record in ONE transaction
    await db.transaction(async (conn) => {
      await attendanceRepository.createBatch({
        id: batchId,
        batchId,
        status: 'pending',
        triggeredBy,
        sentBy: sentBy || triggeredBy,
        totalFaculty: facultyList.length,
        emailTemplate: emailTemplate?.subject || 'Attendance Report',
        facultyList,
        month: attendanceData[0]?.month,
        year: attendanceData[0]?.year,
      }, conn);

      await jobQueueService.enqueue('dispatch_attendance_batch', {
        batchId,
        attendanceData,
        emailTemplate,
        facultyList,
      }, maxAttempts, conn);

      if (idempotencyKey && requestHash) {
        await idempotencyRepository.save({
          idempotencyKey,
          requestPath: '/api/admin/attendance/send',
          requestHash,
          responseCode: 200,
          responseBody: responsePayload,
          batchId,
        }, conn);
      }
    });

    logger.info('Attendance dispatch enqueued transactionally', {
      batchId,
      totalFaculty: facultyList.length,
      idempotencyKey,
    });

    return responsePayload;
  }

  async dispatchBatch(batchId, attendanceData, emailTemplate, facultyList, targetRecordId = null) {
    const settings = await emailService.getEffectiveSettings();
    const maxAttempts = config.attendanceMaxAttempts || 3;
    try {
      // 1. Build lookup maps for faculty matching
      const facultyByEmail = new Map();
      const facultyByEmpId = new Map();
      for (const f of (facultyList || [])) {
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
          `SELECT DISTINCT email, employee_id, faculty_id FROM attendance_records WHERE month = ? AND year = ? AND status = 'sent'`,
          [String(monthNum), String(yearNum)]
        );
        for (const r of sentRows) {
          if (r.email) alreadySentEmails.add(r.email.toLowerCase().trim());
          if (r.employee_id) alreadySentEmails.add(String(r.employee_id).trim());
          if (r.faculty_id) alreadySentEmails.add(String(r.faculty_id).trim());
        }
      } catch (err) {
        logger.warn('Could not query sent records for idempotency check:', { error: err.message });
      }

      await attendanceRepository.recalculateBatchStatus(batchId);

      for (let i = 0; i < attendanceData.length; i++) {
        const record = attendanceData[i];
        const recEmail = record.email?.toLowerCase().trim() || '';
        const recEmpId = String(record.cfmsId || record.employeeId || '').trim();

        // 3. Find specific attendance_record in DB
        let dbRecordRows = [];
        if (targetRecordId) {
          dbRecordRows = await db.query(
            `SELECT * FROM attendance_records WHERE id = ? AND batch_id = ? LIMIT 1`,
            [targetRecordId, batchId]
          );
        } else {
          dbRecordRows = await db.query(
            `SELECT * FROM attendance_records WHERE batch_id = ? AND (email = ? OR employee_id = ?) LIMIT 1`,
            [batchId, recEmail || null, recEmpId || null]
          );
        }

        if (dbRecordRows.length === 0) continue;
        const currentRecord = dbRecordRows[0];

        // 4. Skip if already marked 'sent'
        if (currentRecord.status === 'sent' || (recEmail && alreadySentEmails.has(recEmail)) || (recEmpId && alreadySentEmails.has(recEmpId))) {
          if (currentRecord.status !== 'sent') {
            logger.info('Skipping already-sent email in batch retry', { batchId, recordId: currentRecord.id, email: recEmail });
            await attendanceRepository.markRecordSent(currentRecord.id, 'idempotent-skip', 'ALREADY_SENT');
            await attendanceRepository.recalculateBatchStatus(batchId);
          }
          continue;
        }

        // 5. ATOMIC STATE TRANSITION: Only transition if status is 'queued' and attempts < maxAttempts
        const claimed = await attendanceRepository.claimAttendanceRecord(currentRecord.id, maxAttempts);
        if (!claimed) {
          logger.info('Record was not claimed (concurrent worker, already sent, or max attempts reached)', {
            recordId: currentRecord.id,
            batchId,
          });
          continue;
        }

        // O(1) resolution
        const faculty = (recEmail && facultyByEmail.get(recEmail)) || (recEmpId && facultyByEmpId.get(recEmpId));
        const name = faculty?.name || record.name || record.employeeName || 'Faculty Member';
        const empId = faculty?.employeeId || faculty?.cfmsId || recEmpId || '';

        const recMonthNum = record.month ? parseInt(record.month, 10) : monthNum;
        const recYearNum = record.year ? parseInt(record.year, 10) : yearNum;
        const MONTH_NAMES = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthName = MONTH_NAMES[recMonthNum - 1] || 'Monthly';
        const periodLabel = `${monthName} ${recYearNum}`;

        let reportData = null;
        let pdfBuffer = null;
        try {
          reportData = await reportService.getReportData(empId, recMonthNum, recYearNum);
          pdfBuffer = await reportService.generatePdf(reportData);
        } catch (reportErr) {
          logger.error('Failed to generate PDF for batch faculty:', { empId, error: reportErr.message });
        }

        const attachments = pdfBuffer ? [
          {
            filename: `attendance-${empId}-${recYearNum}-${recMonthNum}.pdf`,
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
          <p>Regards,<br>Digital Monitoring Cell</p>
        `;

        const plainText = reportData ? generateFacultyAttendanceEmailPlainText({
          report: reportData,
          monthName,
          disputeDeadline,
        }) : `Dear ${name},\n\nPlease find attached your Attendance Performance Report for ${periodLabel}.\n\nRegards,\nDigital Monitoring Cell`;

        const emailOptions = {
          to: record.email || (reportData && reportData.employee?.email),
          subject: (emailTemplate?.subject || 'Attendance Report') + ` — ${monthName} ${recYearNum}`,
          html,
          text: plainText,
          employeeId: empId,
          employeeName: name,
          attachments,
          skipSignature: true,
          month: recMonthNum,
          year: recYearNum,
        };

        const itemStartTime = Date.now();
        try {
          const emailRes = await emailService.sendEmail(emailOptions, settings);
          await attendanceRepository.markRecordSent(
            currentRecord.id,
            emailRes.providerUsed || emailRes.provider || 'smtp',
            emailRes.messageId || null
          );
          logger.info('Attendance record sent successfully', {
            batchId,
            recordId: currentRecord.id,
            employeeId: empId,
            attempt: currentRecord.attempts + 1,
            provider: emailRes.providerUsed || emailRes.provider || 'smtp',
            status: 'sent',
            durationMs: Date.now() - itemStartTime,
          });
        } catch (emailErr) {
          const errorMessage = emailErr.message || 'Email delivery failed';
          await attendanceRepository.markRecordFailed(currentRecord.id, errorMessage);
          logger.error('Attendance record dispatch failed', {
            batchId,
            recordId: currentRecord.id,
            employeeId: empId,
            attempt: currentRecord.attempts + 1,
            status: 'failed',
            durationMs: Date.now() - itemStartTime,
            errorCode: emailErr.statusCode || 500,
            errorMessage,
          });
        }

        // Batch delay between emails
        if (i < attendanceData.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, settings.batch_delay || 200));
        }
      }

      await attendanceRepository.recalculateBatchStatus(batchId);
      logger.info('Batch processing completed', { batchId });
    } catch (error) {
      logger.error('Batch processing exception', { batchId, error: error.message });
      // Clean up only stuck processing records for this batch
      await db.query(
        `UPDATE attendance_records SET status = 'failed', error_message = ? WHERE batch_id = ? AND status = 'processing'`,
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
    const targetRecords = recordsObj?.records?.filter((r) =>
      facultyIds.includes(r.facultyId) || facultyIds.includes(r.cfmsId) || facultyIds.includes(r.id)
    ) || [];

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

  /**
   * Retry a single attendance_records item.
   * Atomically resets status from 'failed' to 'queued' and enqueues single item.
   */
  async retryItem(recordId) {
    if (!recordId) throw new AppError(400, 'Record ID is required.');

    const [item] = await db.query(
      `SELECT * FROM attendance_records WHERE id = ?`,
      [recordId]
    );
    if (!item) throw new AppError(404, 'Dispatch record not found.');
    if (item.status === 'sent') throw new AppError(400, 'This report has already been sent.');
    if (item.status === 'processing') throw new AppError(409, 'Record is currently being processed by a worker.');
    const maxAttempts = config.attendanceMaxAttempts || 3;
    if (item.attempts >= maxAttempts) {
      throw new AppError(400, `Maximum retry limit (${maxAttempts} attempts) reached for this record.`);
    }
    if (item.status === 'queued') {
      return { success: true, message: 'Record is already queued for dispatch.' };
    }

    // Atomic reset to queued
    const resetResult = await db.query(
      `UPDATE attendance_records
       SET status = 'queued', error_message = NULL, updated_at = NOW()
       WHERE id = ? AND status = 'failed' AND attempts < ?`,
      [recordId, maxAttempts]
    );

    if (resetResult.affectedRows === 0) {
      throw new AppError(409, 'Record status changed concurrently. Please refresh.');
    }

    // Pull batch info
    const [batch] = await db.query(
      `SELECT ab.*, ar.faculty_id, ar.employee_id, ar.employee_name, ar.email, ar.month, ar.year
       FROM attendance_batches ab
       JOIN attendance_records ar ON ar.batch_id = ab.batch_id
       WHERE ar.id = ?`,
      [recordId]
    );

    if (!batch) throw new AppError(404, 'Parent batch not found.');

    await attendanceRepository.recalculateBatchStatus(batch.batch_id);

    const monthNum = parseInt(batch.month, 10);
    const yearNum = parseInt(batch.year, 10);
    const recordsObj = await monthlyAttendanceRepository.getMonthlyAttendance(monthNum, yearNum);
    const targetRecord = recordsObj?.records?.find(
      r => r.facultyId === batch.faculty_id || r.cfmsId === batch.employee_id || r.id === batch.faculty_id
    );

    const attendanceData = [{
      employeeId: targetRecord?.cfmsId || batch.employee_id,
      employeeName: targetRecord?.name || batch.employee_name,
      email: targetRecord?.email || batch.email,
      month: monthNum,
      year: yearNum,
      presentDays: targetRecord?.presentDays || 0,
      workingDays: targetRecord?.totalWorkingDays || 24,
      absentDays: targetRecord?.absentDays || 0,
      attendancePercentage: targetRecord?.attendancePercentage || 0,
      holidays: targetRecord?.holidayDays || 0,
    }];

    const facultyList = [{
      id: batch.faculty_id,
      employeeId: batch.employee_id,
      employeeName: batch.employee_name,
      email: batch.email,
      name: batch.employee_name,
    }];

    await jobQueueService.enqueue('dispatch_attendance_batch', {
      batchId: batch.batch_id,
      attendanceData,
      emailTemplate: { subject: batch.email_template_subject },
      facultyList,
      targetRecordId: recordId,
    });

    logger.info('Single item retry enqueued', { recordId, batchId: batch.batch_id, attempt: item.attempts });
    return { success: true, message: 'Retry queued for this faculty member.' };
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
          // Priority: sent > processing > queued > failed
          const existing = statusMap.get(row.faculty_id);
          if (!existing) {
            statusMap.set(row.faculty_id, row.status);
          } else {
            const priority = { sent: 4, processing: 3, queued: 2, failed: 1 };
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
      const { batchId, attendanceData, emailTemplate, facultyList, targetRecordId } = payload;
      await attendanceService.dispatchBatch(batchId, attendanceData, emailTemplate, facultyList, targetRecordId);
    });
  }
}

export { AttendanceService };
export const attendanceService = new AttendanceService();
export default attendanceService;
