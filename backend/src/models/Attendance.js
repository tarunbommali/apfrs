// backend/src/models/Attendance.js
import { v4 as uuidv4 } from 'uuid';

export class AttendanceBatch {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.batchId = data.batch_id || data.batchId || data.id || uuidv4();
    this.status = data.status || 'pending';
    this.triggeredBy = data.triggered_by || data.triggeredBy || 'Admin';
    this.sentBy = data.sent_by || data.sentBy || data.triggeredBy || 'Admin';
    this.totalFaculty = Number(data.total_faculty || data.totalFaculty || 0);
    this.sentCount = Number(data.sent_count || data.sentCount || 0);
    this.failedCount = Number(data.failed_count || data.failedCount || 0);
    this.emailTemplate = data.email_template_subject || data.emailTemplate || 'Attendance Report';
    this.facultyList = data.facultyList || [];
    this.results = data.results || [];
    this.month = data.month || null;
    this.year = data.year || null;
    this.errorMessage = data.error_message || data.errorMessage || null;
    this.createdAt = data.created_at || data.createdAt || new Date().toISOString();
    this.updatedAt = data.updated_at || data.updatedAt || new Date().toISOString();
    this.completedAt = data.completed_at || data.completedAt || null;
    this.retryOfBatchId = data.retry_of_batch_id || data.retryOfBatchId || null;
  }

  markProcessing() {
    this.status = 'processing';
    this.updatedAt = new Date().toISOString();
  }

  markSent(results = []) {
    this.status = 'sent';
    this.updatedAt = new Date().toISOString();
    this.completedAt = new Date().toISOString();
    this.results = results;
    this.sentCount = results.filter((r) => r.success).length;
    this.failedCount = results.filter((r) => !r.success).length;
  }

  markFailed(error) {
    this.status = 'failed';
    this.updatedAt = new Date().toISOString();
    this.completedAt = new Date().toISOString();
    this.errorMessage = typeof error === 'string' ? error : error?.message;
  }

  toJSON() {
    return {
      id: this.id,
      batchId: this.batchId,
      batch_id: this.batchId,
      status: this.status,
      triggeredBy: this.triggeredBy,
      triggered_by: this.triggeredBy,
      sentBy: this.sentBy,
      sent_by: this.sentBy,
      totalFaculty: this.totalFaculty,
      total: this.totalFaculty,
      sentCount: this.sentCount,
      sent: this.sentCount,
      failedCount: this.failedCount,
      failed: this.failedCount,
      emailTemplate: this.emailTemplate,
      email_template_subject: this.emailTemplate,
      facultyList: this.facultyList,
      results: this.results,
      month: this.month,
      year: this.year,
      progress: this.totalFaculty > 0 ? Math.round((this.sentCount / this.totalFaculty) * 100) : 0,
      createdAt: this.createdAt,
      created_at: this.createdAt,
      updatedAt: this.updatedAt,
      updated_at: this.updatedAt,
      completedAt: this.completedAt,
      completed_at: this.completedAt,
      errorMessage: this.errorMessage,
      error_message: this.errorMessage,
      retryOfBatchId: this.retryOfBatchId,
      retry_of_batch_id: this.retryOfBatchId,
    };
  }
}

export default AttendanceBatch;
