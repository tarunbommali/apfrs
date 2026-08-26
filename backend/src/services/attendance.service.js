// backend/src/services/attendance.service.js
import { attendanceRepository } from '../repositories/attendance.repository.js';
import { emailService } from './email.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { logger } from '../utils/logger.js';

class AttendanceService {
  async sendAttendance(data) {
    const { attendanceData, emailTemplate, sentBy, triggeredBy } = data;

    const facultyList = [];
    for (const record of attendanceData) {
      let faculty = await userRepository.findByEmail(record.email);
      if (!faculty && record.employeeId) {
        faculty = await userRepository.findByCfmsId(record.employeeId);
      }

      facultyList.push({
        id: faculty?.id || record.employeeId,
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        email: record.email,
        name: faculty?.name || record.employeeName,
      });
    }

    const batch = await attendanceRepository.createBatch({
      triggeredBy,
      sentBy: sentBy || triggeredBy,
      totalFaculty: facultyList.length,
      emailTemplate: emailTemplate?.subject || 'Attendance Report',
      facultyList,
      month: attendanceData[0]?.month,
      year: attendanceData[0]?.year,
    });

    // Run async sending in background without blocking response
    this.dispatchBatch(batch.batchId, attendanceData, emailTemplate, facultyList);

    logger.info('Attendance dispatch initiated', {
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
        const faculty = facultyList.find((f) => f.email === record.email);
        const name = faculty?.name || record.employeeName;

        let html = emailTemplate?.html || `<p>Dear ${name},</p><p>Attached is your attendance report for ${record.month || ''} ${record.year || ''}.</p>`;
        html = html.replace(/{{name}}/g, name);

        emails.push({
          to: record.email,
          subject: emailTemplate?.subject || `Attendance Report - ${record.month || ''} ${record.year || ''}`,
          html,
          employeeId: record.employeeId,
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
}

export const attendanceService = new AttendanceService();
export default attendanceService;
