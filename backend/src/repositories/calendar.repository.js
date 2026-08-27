// backend/src/repositories/calendar.repository.js
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class CalendarRepository {
  async getAll() {
    const sql = `
      SELECT
        id,
        DATE_FORMAT(date, '%Y-%m-%d') AS date,
        label,
        type,
        created_at,
        updated_at
      FROM academic_calendar
      ORDER BY date ASC
    `;
    const rows = await db.query(sql);
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      name: r.label,
      label: r.label,
      type: r.type || 'Public holiday',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async getHolidays() {
    return this.getAll();
  }

  async getByMonthYear(month, year) {
    const mPad = String(month).padStart(2, '0');
    const prefix = `${year}-${mPad}%`;
    const sql = `
      SELECT
        id,
        DATE_FORMAT(date, '%Y-%m-%d') AS date,
        label,
        type,
        created_at,
        updated_at
      FROM academic_calendar
      WHERE date LIKE ?
      ORDER BY date ASC
    `;
    const rows = await db.query(sql, [prefix]);
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      name: r.label,
      label: r.label,
      type: r.type || 'Public holiday',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async findById(id) {
    const sql = `
      SELECT
        id,
        DATE_FORMAT(date, '%Y-%m-%d') AS date,
        label,
        type
      FROM academic_calendar
      WHERE id = ?
    `;
    const rows = await db.query(sql, [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      date: r.date,
      name: r.label,
      label: r.label,
      type: r.type || 'Public holiday',
    };
  }

  async findByDate(date) {
    const sql = `
      SELECT
        id,
        DATE_FORMAT(date, '%Y-%m-%d') AS date,
        label,
        type
      FROM academic_calendar
      WHERE date = ?
    `;
    const rows = await db.query(sql, [date]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      date: r.date,
      name: r.label,
      label: r.label,
      type: r.type || 'Public holiday',
    };
  }

  async create({ id, date, name, label, type }) {
    const holidayId = id || `hol-${uuidv4().slice(0, 8)}`;
    const holidayLabel = (label || name || 'Holiday').trim();
    const holidayType = type || 'Public holiday';

    const sql = `
      INSERT INTO academic_calendar (id, date, label, type, created_at, updated_at)
      VALUES (?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        label = VALUES(label),
        type = VALUES(type),
        updated_at = NOW()
    `;
    await db.query(sql, [holidayId, date, holidayLabel, holidayType]);
    return this.findById(holidayId);
  }

  async update(id, { date, name, label, type }) {
    const holidayLabel = (label || name || 'Holiday').trim();
    const holidayType = type || 'Public holiday';

    const sql = `
      UPDATE academic_calendar
      SET date = ?,
          label = ?,
          type = ?,
          updated_at = NOW()
      WHERE id = ?
    `;
    await db.query(sql, [date, holidayLabel, holidayType, id]);
    return this.findById(id);
  }

  async delete(id) {
    const sql = `DELETE FROM academic_calendar WHERE id = ?`;
    await db.query(sql, [id]);
    return true;
  }

  async saveHolidays(holidays = []) {
    await db.query(`DELETE FROM academic_calendar`);

    if (holidays.length > 0) {
      const placeholders = holidays.map(() => `(?, ?, ?, ?, NOW(), NOW())`).join(', ');
      const values = holidays.flatMap((h) => [
        h.id || `hol-${uuidv4().slice(0, 8)}`,
        h.date,
        (h.label || h.name || 'Holiday').trim(),
        h.type || 'Public holiday',
      ]);

      const sql = `
        INSERT INTO academic_calendar (id, date, label, type, created_at, updated_at)
        VALUES ${placeholders}
      `;
      await db.query(sql, values);
    }

    return this.getAll();
  }
}

export const calendarRepository = new CalendarRepository();
export default calendarRepository;
