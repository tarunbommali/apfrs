// backend/src/repositories/user.repository.js
import { BaseRepository } from './base.repository.js';
import db from '../config/database.js';
import { User } from '../models/User.js';

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  async findByEmail(email) {
    const normalized = email?.toLowerCase().trim();
    if (!normalized) return null;

    const sql = `SELECT * FROM users WHERE email = ? AND is_active = TRUE`;
    const rows = await db.query(sql, [normalized]);
    if (rows.length === 0) return null;
    return new User(rows[0]);
  }

  async findById(id) {
    const sql = `SELECT * FROM users WHERE id = ? AND is_active = TRUE`;
    const rows = await db.query(sql, [id]);
    if (rows.length === 0) return null;
    return new User(rows[0]);
  }

  async findByCfmsId(cfmsId) {
    if (!cfmsId) return null;

    const sql = `SELECT * FROM users WHERE cfms_id = ? AND is_active = TRUE`;
    const rows = await db.query(sql, [cfmsId]);
    if (rows.length === 0) return null;
    return new User(rows[0]);
  }

  async findAllFaculty(filters = {}) {
    let sql = `SELECT * FROM users WHERE role = 'faculty' AND is_active = TRUE`;
    const params = [];

    if (filters.department) {
      sql += ` AND department = ?`;
      params.push(filters.department);
    }

    if (filters.job_status) {
      sql += ` AND job_status = ?`;
      params.push(filters.job_status);
    }

    if (filters.search) {
      const term = `%${filters.search}%`;
      sql += ` AND (name LIKE ? OR email LIKE ? OR cfms_id LIKE ? OR department LIKE ?)`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY name ASC`;

    if (filters.limit) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(filters.limit, 10));
      params.push(parseInt(filters.offset || 0, 10));
    }

    const rows = await db.query(sql, params);
    return rows.map((r) => new User(r));
  }

  async countFaculty(filters = {}) {
    let sql = `SELECT COUNT(*) as total FROM users WHERE role = 'faculty' AND is_active = TRUE`;
    const params = [];

    if (filters.department) {
      sql += ` AND department = ?`;
      params.push(filters.department);
    }

    if (filters.job_status) {
      sql += ` AND job_status = ?`;
      params.push(filters.job_status);
    }

    const rows = await db.query(sql, params);
    return rows[0]?.total || 0;
  }

  async getDepartmentStats() {
    const sql = `
      SELECT 
        department,
        COUNT(*) as total_faculty,
        SUM(CASE WHEN job_status = 'Regular' THEN 1 ELSE 0 END) as regular_count,
        SUM(CASE WHEN job_status != 'Regular' OR job_status IS NULL THEN 1 ELSE 0 END) as contract_count
      FROM users
      WHERE role = 'faculty' AND is_active = TRUE
      GROUP BY department
      ORDER BY department ASC
    `;
    return db.query(sql);
  }

  async getColleagues(facultyId) {
    const faculty = await this.findById(facultyId);
    if (!faculty) return [];

    const sql = `
      SELECT * FROM users
      WHERE department = ? AND id != ? AND role = 'faculty' AND is_active = TRUE
      ORDER BY name ASC
    `;
    const rows = await db.query(sql, [faculty.department, facultyId]);
    return rows.map((r) => new User(r));
  }

  async getStats() {
    const sql = `
      SELECT 
        COUNT(*) as total_faculty,
        COUNT(DISTINCT department) as total_departments
      FROM users
      WHERE role = 'faculty' AND is_active = TRUE
    `;
    const rows = await db.query(sql);
    return rows[0] || { total_faculty: 0, total_departments: 0 };
  }

  async create(user) {
    const sql = `
      INSERT INTO users (id, cfms_id, name, email, password_hash, role, department, designation, mobile, job_status, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await db.query(sql, [
      user.id,
      user.cfms_id,
      user.name,
      user.email,
      user.passwordHash,
      user.role,
      user.department,
      user.designation,
      user.mobile,
      user.job_status,
      user.isActive ? 1 : 0,
    ]);
    return this.findById(user.id);
  }

  async update(id, updates) {
    const fields = [];
    const params = [];

    const allowed = ['name', 'email', 'designation', 'department', 'mobile', 'job_status', 'is_active', 'password_hash'];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(updates[key]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = NOW()');
    params.push(id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, params);
    return this.findById(id);
  }

  async delete(id) {
    const sql = `UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = ?`;
    await db.query(sql, [id]);
    return true;
  }
}

export const userRepository = new UserRepository();
export default userRepository;
