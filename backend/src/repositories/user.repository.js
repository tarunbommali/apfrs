// backend/src/repositories/user.repository.js
import { BaseRepository } from './base.repository.js';
import db from '../config/database.js';
import { User } from '../models/User.js';
import { inchargeRepository } from './incharge.repository.js';

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
    const user = new User(rows[0]);
    user.currentIncharge = await inchargeRepository.findCurrentByFacultyId(user.id);
    return user;
  }

  async findById(id) {
    const sql = `SELECT * FROM users WHERE id = ? AND is_active = TRUE`;
    const rows = await db.query(sql, [id]);
    if (rows.length === 0) return null;
    const user = new User(rows[0]);
    user.currentIncharge = await inchargeRepository.findCurrentByFacultyId(user.id);
    return user;
  }

  async findByCfmsId(cfmsId) {
    if (!cfmsId) return null;

    const sql = `SELECT * FROM users WHERE cfms_id = ? AND is_active = TRUE`;
    const rows = await db.query(sql, [cfmsId]);
    if (rows.length === 0) return null;
    const user = new User(rows[0]);
    user.currentIncharge = await inchargeRepository.findCurrentByFacultyId(user.id);
    return user;
  }

  /**
   * Bulk lookup replacing N sequential findByEmail/findByCfmsId calls.
   * Returns a Map keyed by both email and cfms_id for O(1) access.
   */
  async findByEmailsOrCfmsIds(emails = [], cfmsIds = []) {
    const cleanEmails  = emails.filter(Boolean).map((e) => e.toLowerCase().trim());
    const cleanCfmsIds = cfmsIds.filter(Boolean);

    if (cleanEmails.length === 0 && cleanCfmsIds.length === 0) return new Map();

    const conditions = [];
    const params = [];

    if (cleanEmails.length > 0) {
      conditions.push(`email IN (${cleanEmails.map(() => '?').join(', ')})`);
      params.push(...cleanEmails);
    }
    if (cleanCfmsIds.length > 0) {
      conditions.push(`cfms_id IN (${cleanCfmsIds.map(() => '?').join(', ')})`);
      params.push(...cleanCfmsIds);
    }

    const sql = `SELECT * FROM users WHERE is_active = TRUE AND (${conditions.join(' OR ')}) `;
    const rows = await db.query(sql, params);

    const userList = rows.map((r) => new User(r));
    const userIds = userList.map((u) => u.id);
    const inchargeMap = await inchargeRepository.findCurrentForMultipleFaculty(userIds);

    const map = new Map();
    for (const user of userList) {
      user.currentIncharge = inchargeMap.get(user.id) || null;
      if (user.email)   map.set(user.email.toLowerCase(), user);
      if (user.cfms_id) map.set(user.cfms_id, user);
    }
    return map;
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
    const facultyList = rows.map((r) => new User(r));

    // Batch resolve active incharge assignments for all rows in a single query
    const facultyIds = facultyList.map((f) => f.id);
    const inchargeMap = await inchargeRepository.findCurrentForMultipleFaculty(facultyIds);

    for (const f of facultyList) {
      f.currentIncharge = inchargeMap.get(f.id) || null;
    }

    return facultyList;
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

    if (filters.search) {
      const term = `%${filters.search}%`;
      sql += ` AND (name LIKE ? OR email LIKE ? OR cfms_id LIKE ? OR department LIKE ?)`;
      params.push(term, term, term, term);
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
      INSERT INTO users (
        id, cfms_id, name, email, photo_url, password_hash, role, department,
        designation, mobile, gender, job_status, higher_education, incharge, is_active,
        activation_token_hash, activation_expires_at, must_change_password,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    await db.query(sql, [
      user.id,
      user.cfms_id,
      user.name,
      user.email,
      user.photo_url || null,
      user.passwordHash,
      user.role,
      user.department,
      user.designation,
      user.mobile,
      user.gender || 'male',
      user.job_status,
      user.higher_education || null,
      user.incharge || 'None',
      user.isActive ? 1 : 0,
      user.activationTokenHash  || null,
      user.activationExpiresAt  || null,
      user.mustChangePassword   ? 1 : 0,
    ]);
    return this.findById(user.id);
  }

  /**
   * Look up a user by their activation token hash.
   * Used by the /api/auth/activate endpoint.
   */
  async findByActivationTokenHash(tokenHash) {
    const sql = `
      SELECT * FROM users
      WHERE activation_token_hash = ? AND is_active = TRUE
      LIMIT 1
    `;
    const rows = await db.query(sql, [tokenHash]);
    if (rows.length === 0) return null;
    return new User(rows[0]);
  }

  async update(id, updates) {
    const fields = [];
    const params = [];

    const allowed = [
      'name', 'email', 'photo_url', 'designation', 'department', 'mobile', 'gender',
      'job_status', 'higher_education', 'incharge', 'is_active', 'password_hash',
      // Activation fields (cleared by the activate endpoint)
      'activation_token_hash', 'activation_expires_at', 'must_change_password',
    ];
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
