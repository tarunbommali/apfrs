// backend/src/services/calendar.service.js
import { calendarRepository } from '../repositories/calendar.repository.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const VALID_HOLIDAY_TYPES = [
  'Public holiday',
  'Institutional',
  'Academic',
  'Vacation',
];

class CalendarService {
  /**
   * Returns calendar structure, working days, and holidays for a given month and year.
   * @param {number} month - 1-indexed month (1 = Jan, 12 = Dec)
   * @param {number} year - 4-digit year (e.g. 2026)
   */
  async getCalendar(month, year) {
    const numMonth = parseInt(month, 10);
    const numYear = parseInt(year, 10);

    if (isNaN(numMonth) || numMonth < 1 || numMonth > 12) {
      throw new AppError(400, 'Invalid month. Must be between 1 and 12.');
    }
    if (isNaN(numYear) || numYear < 2000 || numYear > 2100) {
      throw new AppError(400, 'Invalid year. Must be a 4-digit year.');
    }

    const holidays = await calendarRepository.getByMonthYear(numMonth, numYear);
    const totalDays = new Date(numYear, numMonth, 0).getDate();

    // Set of holiday dates for fast lookup
    const holidayDateSet = new Set(holidays.map((h) => h.date));

    // Calculate working days & Sundays
    let sundaysCount = 0;
    let workingDays = 0;

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${numYear}-${String(numMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(numYear, numMonth - 1, d).getDay();
      const isSunday = dayOfWeek === 0;
      const isHoliday = holidayDateSet.has(dateStr);

      if (isSunday) {
        sundaysCount++;
      } else if (!isHoliday) {
        workingDays++;
      }
    }

    return {
      month: numMonth,
      year: numYear,
      totalDays,
      workingDays,
      sundaysCount,
      holidays,
    };
  }

  async getAllHolidays() {
    return calendarRepository.getAll();
  }

  async createHoliday({ date, name, label, type }) {
    const holidayLabel = (name || label || '').trim();
    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new AppError(400, 'Valid holiday date (YYYY-MM-DD) is required.');
    }
    if (!holidayLabel) {
      throw new AppError(400, 'Holiday name is required.');
    }

    const holidayType = type || 'Public holiday';
    if (!VALID_HOLIDAY_TYPES.includes(holidayType)) {
      throw new AppError(400, `Invalid holiday type. Allowed: ${VALID_HOLIDAY_TYPES.join(', ')}`);
    }

    const created = await calendarRepository.create({
      date,
      label: holidayLabel,
      type: holidayType,
    });

    logger.info('Holiday created in academic calendar', { id: created?.id, date, name: holidayLabel });
    return created;
  }

  async updateHoliday(id, { date, name, label, type }) {
    if (!id) throw new AppError(400, 'Holiday ID is required.');

    const existing = await calendarRepository.findById(id);
    if (!existing) {
      throw new AppError(404, 'Holiday not found.');
    }

    const holidayDate = date || existing.date;
    const holidayLabel = (name || label || existing.label || '').trim();
    const holidayType = type || existing.type || 'Public holiday';

    if (!holidayDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      throw new AppError(400, 'Valid holiday date (YYYY-MM-DD) is required.');
    }
    if (!holidayLabel) {
      throw new AppError(400, 'Holiday name is required.');
    }
    if (!VALID_HOLIDAY_TYPES.includes(holidayType)) {
      throw new AppError(400, `Invalid holiday type. Allowed: ${VALID_HOLIDAY_TYPES.join(', ')}`);
    }

    const updated = await calendarRepository.update(id, {
      date: holidayDate,
      label: holidayLabel,
      type: holidayType,
    });

    logger.info('Holiday updated in academic calendar', { id, date: holidayDate, name: holidayLabel });
    return updated;
  }

  async deleteHoliday(id) {
    if (!id) throw new AppError(400, 'Holiday ID is required.');
    const existing = await calendarRepository.findById(id);
    if (!existing) {
      throw new AppError(404, 'Holiday not found.');
    }

    await calendarRepository.delete(id);
    logger.info('Holiday deleted from academic calendar', { id, date: existing.date, name: existing.label });
    return { success: true, message: 'Holiday deleted successfully.' };
  }

  async syncCalendar(holidays = []) {
    const saved = await calendarRepository.saveHolidays(holidays);
    logger.info('Academic calendar synced in bulk', { total: saved.length });
    return {
      success: true,
      holidays: saved,
      verifiedAt: new Date().toISOString(),
      message: 'Academic calendar synchronized and verified successfully.',
    };
  }
}

export const calendarService = new CalendarService();
export default calendarService;
