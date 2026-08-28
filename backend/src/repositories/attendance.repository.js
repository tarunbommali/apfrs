// backend/src/repositories/attendance.repository.js
//
// All persistence is MySQL-only. In-memory Map fallbacks have been removed
// because the server exits at startup if MySQL is unavailable — maintaining
// two execution modes only masked bugs and added dead code.

import { BaseRepository } from './base.repository.js';
import db from '../config/database.js';
import { AttendanceBatch } from '../models/Attendance.js';
import { v4 as uuidv4 } from 'uuid';

class AttendanceRepository extends BaseRepository {
  constructor() {
    super('attendance_batches');
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  async createBatch(data) {
    const batch = new AttendanceBatch(data);

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

    // Phase 5: bulk INSERT replaces the previous per-record loop.
    if (data.facultyList && data.facultyList.length > 0) {
      const placeholders = data.facultyList
        .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())')
        .join(', ');

      const values = data.facultyList.flatMap((f) => [
        uuidv4(),
        batch.batchId,
        f.id || f.employeeId,
        f.employeeId || f.id,
        f.employeeName || f.name,
        f.email,
        batch.month,
        batch.year,
        'queued',
      ]);

      await db.query(
        `INSERT INTO attendance_records (
           id, batch_id, faculty_id, employee_id, employee_name, email,
           month, year, status, created_at, updated_at
         ) VALUES ${placeholders}`,
        values
      );
    }

    return batch;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  async updateBatchStatus(batchId, status, results = null) {
    await db.transaction(async (conn) => {
      if (results && results.length > 0) {
        for (const result of results) {
          await conn.query(
            `UPDATE attendance_records
             SET status = ?, message_id = ?, error_message = ?, sent_at = ?, updated_at = NOW()
             WHERE batch_id = ? AND email = ?`,
            [
              result.success ? 'sent' : 'failed',
              result.messageId || null,
              result.error || null,
              result.success ? new Date() : null,
              batchId,
              result.recipient || result.email,
            ]
          );
        }
      }

      await this.recalculateBatchStatus(batchId, conn);
    });

    return this.findBatchById(batchId);
  }

  async recalculateBatchStatus(batchId, conn = db) {
    const [counts] = await conn.query(
      `SELECT 
        COUNT(*) as total,
        SUM(status = 'sent') as sent,
        SUM(status = 'failed') as failed,
        SUM(status = 'queued') as queued,
        SUM(status = 'sending') as sending
       FROM attendance_records
       WHERE batch_id = ?`,
      [batchId]
    );

    const total = Number(counts.total || 0);
    const sent = Number(counts.sent || 0);
    const failed = Number(counts.failed || 0);
    const queued = Number(counts.queued || 0);
    const sending = Number(counts.sending || 0);

    let status = 'pending';
    if (sent === total) {
      status = 'completed';
    } else if (failed === total) {
      status = 'failed';
    } else if (sent + failed === total) {
      status = 'partial_failed';
    } else if (sending > 0 || sent > 0 || failed > 0) {
      status = 'processing';
    } else {
      status = 'pending';
    }

    const completedAt = ['completed', 'failed', 'partial_failed'].includes(status) ? new Date() : null;

    await conn.query(
      `UPDATE attendance_batches
       SET status = ?,
           sent_count = ?,
           failed_count = ?,
           completed_at = ?,
           updated_at = NOW()
       WHERE batch_id = ?`,
      [status, sent, failed, completedAt, batchId]
    );

    return status;
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  async findBatchById(batchId) {
    const sql = `SELECT * FROM attendance_batches WHERE batch_id = ?`;
    const rows = await db.query(sql, [batchId]);
    if (rows.length === 0) return null;
    return new AttendanceBatch(rows[0]);
  }

  async getBatches(filters = {}) {
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

      if (filters.offset) {
        sql += ` OFFSET ?`;
        params.push(parseInt(filters.offset, 10));
      }
    }

    const rows = await db.query(sql, params);
    return rows.map((r) => new AttendanceBatch(r));
  }

  // Phase 3 fix: was returning all-batch count regardless of facultyId.
  // Now queries attendance_records filtered by faculty_id.
  async getFacultyAttendance(facultyId) {
    const sql = `
      SELECT
        COUNT(*)               AS totalRecords,
        SUM(status = 'sent')   AS sentCount,
        SUM(status = 'failed') AS failedCount,
        MAX(sent_at)           AS lastSentAt
      FROM attendance_records
      WHERE faculty_id = ?
    `;
    const rows = await db.query(sql, [facultyId]);
    return {
      facultyId,
      totalRecords: Number(rows[0]?.totalRecords || 0),
      sentCount:    Number(rows[0]?.sentCount    || 0),
      failedCount:  Number(rows[0]?.failedCount  || 0),
      lastSentAt:   rows[0]?.lastSentAt || null,
      lastUpdated:  new Date().toISOString(),
    };
  }

  // Phase 3 fix: was loading every batch row into JS then counting.
  // Now uses a single SQL aggregation.
  async getStats() {
    const sql = `
      SELECT
        COUNT(*)                                AS totalBatches,
        COALESCE(SUM(status IN ('sent', 'completed', 'partial_failed')), 0) AS sentBatches,
        COALESCE(SUM(status IN ('pending','processing')), 0) AS pendingBatches,
        COALESCE(SUM(status = 'failed'), 0)     AS failedBatches,
        COALESCE(SUM(sent_count), 0)            AS totalFacultySent,
        MAX(created_at)                         AS lastBatchAt
      FROM attendance_batches
    `;
    const rows = await db.query(sql);
    const r = rows[0];
    return {
      totalBatches:     Number(r?.totalBatches    || 0),
      sentBatches:      Number(r?.sentBatches      || 0),
      pendingBatches:   Number(r?.pendingBatches   || 0),
      failedBatches:    Number(r?.failedBatches    || 0),
      totalFacultySent: Number(r?.totalFacultySent || 0),
      lastBatchAt:      r?.lastBatchAt || null,
    };
  }
}

export const attendanceRepository = new AttendanceRepository();
export default attendanceRepository;
