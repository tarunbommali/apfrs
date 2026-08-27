// backend/src/repositories/incharge.repository.js
import db from '../config/database.js';
import { InchargeAssignment } from '../models/InchargeAssignment.js';
import { v4 as uuidv4 } from 'uuid';

class InchargeRepository {
  async findByFacultyId(facultyId) {
    const sql = `
      SELECT
        id,
        faculty_id,
        role,
        DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date,
        created_at,
        updated_at
      FROM faculty_incharge_assignments
      WHERE faculty_id = ?
      ORDER BY start_date DESC, created_at DESC
    `;
    const rows = await db.query(sql, [facultyId]);
    return rows.map((r) => new InchargeAssignment(r));
  }

  async findCurrentByFacultyId(facultyId) {
    const sql = `
      SELECT
        id,
        faculty_id,
        role,
        DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date,
        created_at,
        updated_at
      FROM faculty_incharge_assignments
      WHERE faculty_id = ?
        AND start_date <= CURDATE()
        AND (end_date IS NULL OR end_date >= CURDATE())
      ORDER BY start_date DESC
      LIMIT 1
    `;
    const rows = await db.query(sql, [facultyId]);
    if (rows.length === 0) return null;
    return new InchargeAssignment(rows[0]);
  }

  async findCurrentForMultipleFaculty(facultyIds = []) {
    if (!facultyIds.length) return new Map();
    const placeholders = facultyIds.map(() => '?').join(', ');
    const sql = `
      SELECT
        id,
        faculty_id,
        role,
        DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date,
        created_at,
        updated_at
      FROM faculty_incharge_assignments
      WHERE faculty_id IN (${placeholders})
        AND start_date <= CURDATE()
        AND (end_date IS NULL OR end_date >= CURDATE())
      ORDER BY start_date DESC
    `;
    const rows = await db.query(sql, facultyIds);
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.faculty_id)) {
        map.set(r.faculty_id, new InchargeAssignment(r));
      }
    }
    return map;
  }

  async findById(id) {
    const sql = `
      SELECT
        id,
        faculty_id,
        role,
        DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date,
        created_at,
        updated_at
      FROM faculty_incharge_assignments
      WHERE id = ?
    `;
    const rows = await db.query(sql, [id]);
    if (rows.length === 0) return null;
    return new InchargeAssignment(rows[0]);
  }

  async create({ id, facultyId, role, startDate, endDate }) {
    const assignmentId = id || `inc-${uuidv4().split('-')[0]}`;
    const sql = `
      INSERT INTO faculty_incharge_assignments (
        id, faculty_id, role, start_date, end_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await db.query(sql, [
      assignmentId,
      facultyId,
      role,
      startDate,
      endDate || null,
    ]);
    return this.findById(assignmentId);
  }

  async update(id, { role, startDate, endDate }) {
    const sql = `
      UPDATE faculty_incharge_assignments
      SET role = ?,
          start_date = ?,
          end_date = ?,
          updated_at = NOW()
      WHERE id = ?
    `;
    await db.query(sql, [
      role,
      startDate,
      endDate || null,
      id,
    ]);
    return this.findById(id);
  }

  async endAssignment(id, endDate) {
    const effectiveEndDate = endDate || new Date().toISOString().split('T')[0];
    const sql = `
      UPDATE faculty_incharge_assignments
      SET end_date = ?,
          updated_at = NOW()
      WHERE id = ?
    `;
    await db.query(sql, [effectiveEndDate, id]);
    return this.findById(id);
  }

  async delete(id) {
    const sql = `DELETE FROM faculty_incharge_assignments WHERE id = ?`;
    await db.query(sql, [id]);
    return true;
  }

  /**
   * Checks whether the date range overlaps with any other assignment for the same faculty.
   */
  async hasOverlap(facultyId, startDate, endDate = null, excludeId = null) {
    let sql = `
      SELECT id, role, DATE_FORMAT(start_date, '%Y-%m-%d') as start_date, DATE_FORMAT(end_date, '%Y-%m-%d') as end_date
      FROM faculty_incharge_assignments
      WHERE faculty_id = ?
    `;
    const params = [facultyId];

    if (excludeId) {
      sql += ` AND id != ?`;
      params.push(excludeId);
    }

    if (endDate) {
      // Overlap: existing.start <= new.end AND (existing.end IS NULL OR existing.end >= new.start)
      sql += ` AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)`;
      params.push(endDate, startDate);
    } else {
      // Open-ended: overlaps if existing has no end or existing ends after new start
      sql += ` AND (end_date IS NULL OR end_date >= ?)`;
      params.push(startDate);
    }

    const rows = await db.query(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }
}

export const inchargeRepository = new InchargeRepository();
export default inchargeRepository;
