// backend/src/repositories/attendance.repository.js
import { BaseRepository } from './base.repository.js';
import db from '../config/database.js';
import { AttendanceBatch } from '../models/Attendance.js';
import { v4 as uuidv4 } from 'uuid';

class AttendanceRepository extends BaseRepository {
  constructor() {
    super('attendance_batches');
    this.memoryBatches = new Map();
  }

  async createBatch(data) {
    const batch = new AttendanceBatch(data);

    if (db.isConnected) {
      const sql = `
        INSERT INTO attendance_batches (
          id, batch_id, status, triggered_by, sent_by, total_faculty,
          email_template_subject, month, year, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      await db.query(sql, [
        batch.id,
        batch.batchId,
        batch.status,
        batch.triggeredBy,
        batch.sentBy,
        batch.totalFaculty,
        batch.emailTemplate,
        batch.month,
        batch.year,
      ]);

      if (data.facultyList && data.facultyList.length > 0) {
        const recSql = `
          INSERT INTO attendance_records (
            id, batch_id, faculty_id, employee_id, employee_name, email,
            month, year, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
        `;
        for (const faculty of data.facultyList) {
          await db.query(recSql, [
            uuidv4(),
            batch.batchId,
            faculty.id || faculty.employeeId,
            faculty.employeeId || faculty.id,
            faculty.employeeName || faculty.name,
            faculty.email,
            batch.month,
            batch.year,
          ]);
        }
      }
      return batch;
    }

    // In-memory store
    this.memoryBatches.set(batch.batchId, batch);
    return batch;
  }

  async updateBatchStatus(batchId, status, results = null) {
    if (db.isConnected) {
      const completedAt = ['sent', 'failed', 'completed'].includes(status) ? new Date() : null;
      const sql = `
        UPDATE attendance_batches 
        SET status = ?, updated_at = NOW(), completed_at = ?
        WHERE batch_id = ?
      `;
      await db.query(sql, [status, completedAt, batchId]);

      if (results) {
        for (const result of results) {
          const recSql = `
            UPDATE attendance_records 
            SET status = ?, message_id = ?, error_message = ?, sent_at = ?, updated_at = NOW()
            WHERE batch_id = ? AND email = ?
          `;
          await db.query(recSql, [
            result.success ? 'sent' : 'failed',
            result.messageId || null,
            result.error || null,
            result.success ? new Date() : null,
            batchId,
            result.recipient || result.email,
          ]);
        }
      }
      return this.findBatchById(batchId);
    }

    const batch = this.memoryBatches.get(batchId);
    if (!batch) return null;

    if (status === 'processing') batch.markProcessing();
    else if (status === 'sent') batch.markSent(results || []);
    else if (status === 'failed') batch.markFailed(results || 'Failed');
    else batch.status = status;

    this.memoryBatches.set(batchId, batch);
    return batch;
  }

  async findBatchById(batchId) {
    if (db.isConnected) {
      const sql = `SELECT * FROM attendance_batches WHERE batch_id = ?`;
      const rows = await db.query(sql, [batchId]);
      if (rows.length === 0) return null;
      return new AttendanceBatch(rows[0]);
    }
    return this.memoryBatches.get(batchId) || null;
  }

  async getBatches(filters = {}) {
    if (db.isConnected) {
      let sql = `SELECT * FROM attendance_batches WHERE 1=1`;
      const params = [];
      if (filters.status) {
        sql += ` AND status = ?`;
        params.push(filters.status);
      }
      sql += ` ORDER BY created_at DESC`;
      if (filters.limit) {
        sql += ` LIMIT ?`;
        params.push(parseInt(filters.limit, 10));
      }
      const rows = await db.query(sql, params);
      return rows.map((r) => new AttendanceBatch(r));
    }

    let list = Array.from(this.memoryBatches.values());
    if (filters.status) {
      list = list.filter((b) => b.status === filters.status);
    }
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (filters.limit) {
      list = list.slice(0, parseInt(filters.limit, 10));
    }
    return list;
  }

  async getFacultyAttendance(facultyId) {
    const batches = await this.getBatches();
    return {
      facultyId,
      totalBatches: batches.length,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getStats() {
    const batches = await this.getBatches();
    return {
      totalBatches: batches.length,
      sentBatches: batches.filter((b) => b.status === 'sent').length,
      pendingBatches: batches.filter((b) => b.status === 'pending' || b.status === 'processing').length,
      failedBatches: batches.filter((b) => b.status === 'failed').length,
      totalFacultySent: batches.reduce((acc, b) => acc + (b.sentCount || 0), 0),
      lastBatchAt: batches[0]?.createdAt || null,
    };
  }
}

export const attendanceRepository = new AttendanceRepository();
export default attendanceRepository;
