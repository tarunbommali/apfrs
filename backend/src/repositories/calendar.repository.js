// backend/src/repositories/calendar.repository.js
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class CalendarRepository {
  async getHolidays() {
    const sql = `
      SELECT
        event_id AS id,
        DATE_FORMAT(start_date, '%Y-%m-%d') AS date,
        title AS label,
        event_type AS type
      FROM academic_calendar
      ORDER BY start_date ASC
    `;
    const rows = await db.query(sql);
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      label: r.label,
      type: r.type || 'holiday',
    }));
  }

  async saveHolidays(holidays = []) {
    // Replace all entries cleanly
    await db.query(`DELETE FROM academic_calendar`);

    if (holidays.length > 0) {
      const placeholders = holidays.map(() => `(?, ?, ?, ?, ?, 1, NOW(), NOW())`).join(', ');
      const values = holidays.flatMap((h) => [
        h.id || `hol-${uuidv4()}`,
        h.label || 'Holiday',
        h.date,
        h.date,
        h.type || 'holiday',
      ]);

      const sql = `
        INSERT INTO academic_calendar (event_id, title, start_date, end_date, event_type, is_active, created_at, updated_at)
        VALUES ${placeholders}
      `;
      await db.query(sql, values);
    }

    return this.getHolidays();
  }
}

export const calendarRepository = new CalendarRepository();
export default calendarRepository;
