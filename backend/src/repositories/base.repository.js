// backend/src/repositories/base.repository.js
import db from '../config/database.js';

export class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async findAll(filters = {}, options = {}) {
    let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        sql += ` AND ${key} = ?`;
        params.push(value);
      }
    }

    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDir || 'ASC'}`;
    }

    if (options.limit) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(options.limit, 10));
      params.push(parseInt(options.offset, 10) || 0);
    }

    return db.query(sql, params);
  }

  async findById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  }

  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;

    const result = await db.query(sql, values);
    return { ...data, id: result.insertId || data.id };
  }

  async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;

    await db.query(sql, [...values, id]);
    return this.findById(id);
  }

  async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    await db.query(sql, [id]);
    return true;
  }

  async count(filters = {}) {
    let sql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE 1=1`;
    const params = [];

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        sql += ` AND ${key} = ?`;
        params.push(value);
      }
    }

    const rows = await db.query(sql, params);
    return rows[0]?.total || 0;
  }
}

export default BaseRepository;
