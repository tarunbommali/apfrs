// backend/src/models/Attendance.js
import { v4 as uuidv4 } from 'uuid';

export class AttendanceBatch {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.batchId = data.batchId || data.id || uuidv4();
    this.status = data.status || 'pending';
    this.triggeredBy = data.triggeredBy || 'Admin';
    this.sentBy = data.sentBy || data.triggeredBy || 'Admin';
    this.totalFaculty = data.totalFaculty || 0;
    this.sentCount = data.sentCount || 0;
    this.failedCount = data.failedCount || 0;
    this.emailTemplate = data.emailTemplate || 'Attendance Report';
    this.facultyList = data.facultyList || [];
    this.results = data.results || [];
    this.month = data.month || null;
    this.year = data.year || null;
    this.errorMessage = data.errorMessage || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.completedAt = data.completedAt || null;
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
      status: this.status,
      triggeredBy: this.triggeredBy,
      sentBy: this.sentBy,
      totalFaculty: this.totalFaculty,
      sentCount: this.sentCount,
      failedCount: this.failedCount,
      emailTemplate: this.emailTemplate,
      facultyList: this.facultyList,
      results: this.results,
      month: this.month,
      year: this.year,
      progress: this.totalFaculty > 0 ? Math.round((this.sentCount / this.totalFaculty) * 100) : 0,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
    };
  }
}

export default AttendanceBatch;
