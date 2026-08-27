// backend/src/repositories/department.repository.js
import { BaseRepository } from './base.repository.js';
import db from '../config/database.js';

class DepartmentRepository extends BaseRepository {
  constructor() {
    super('departments');
  }

  async getDepartmentsList(filters = {}) {
    let sql = `
      SELECT 
        d.*,
        u.name AS hod_name,
        u.email AS hod_email,
        u.photo_url AS hod_photo_url,
        (SELECT COUNT(*) FROM users u2 WHERE u2.department = d.code AND u2.role = 'faculty') AS faculty_count
      FROM departments d
      LEFT JOIN users u ON d.hod_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      sql += ` AND d.status = ?`;
      params.push(filters.status);
    }

    if (filters.search) {
      sql += ` AND (d.name LIKE ? OR d.code LIKE ?)`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    sql += ` ORDER BY d.name ASC`;

    return db.query(sql, params);
  }

  async getDepartmentDetailsById(id) {
    const sql = `
      SELECT 
        d.*,
        u.name AS hod_name,
        u.email AS hod_email,
        u.photo_url AS hod_photo_url,
        (SELECT COUNT(*) FROM users u2 WHERE u2.department = d.code AND u2.role = 'faculty') AS faculty_count
      FROM departments d
      LEFT JOIN users u ON d.hod_id = u.id
      WHERE d.id = ?
    `;
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  }

  async findByCode(code) {
    const sql = `SELECT * FROM departments WHERE code = ?`;
    const rows = await db.query(sql, [code]);
    return rows[0] || null;
  }

  async findByName(name) {
    const sql = `SELECT * FROM departments WHERE name = ?`;
    const rows = await db.query(sql, [name]);
    return rows[0] || null;
  }

  async getDepartmentFaculty(code) {
    const sql = `
      SELECT id, cfms_id, name, email, designation, department, mobile, gender, job_status, incharge, is_active, photo_url
      FROM users
      WHERE department = ? AND role = 'faculty'
      ORDER BY name ASC
    `;
    return db.query(sql, [code]);
  }
}

export const departmentRepository = new DepartmentRepository();
export default departmentRepository;
