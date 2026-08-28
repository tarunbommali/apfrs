// backend/src/repositories/monthly-attendance.repository.js
import db from '../config/database.js';
import { MonthlyAttendanceSheet, FacultyMonthlyAttendance } from '../models/MonthlyAttendance.js';
import { User } from '../models/User.js';
import { userRepository } from './user.repository.js';
import { calendarRepository } from './calendar.repository.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

class MonthlyAttendanceRepository {
  /**
   * Saves or replaces a monthly attendance workbook, auto-syncs with academic calendar,
   * matches/provisions faculty users in `users` table by CFMS ID/email,
   * and bulk-inserts all faculty attendance records into MySQL.
   */
  async saveMonthlySheetAndRecords(month, year, fileName, records = [], uploadedBy = 'Admin') {
    const numMonth = parseInt(month, 10);
    const numYear = parseInt(year, 10);

    // 1. Sync with Academic Calendar in MySQL
    let holidayDateSet = new Set();
    try {
      const allHolidays = await calendarRepository.getHolidays();
      const monthPrefix = `${numYear}-${String(numMonth).padStart(2, '0')}`;
      const monthHolidays = allHolidays.filter((h) => h.date && h.date.startsWith(monthPrefix));
      holidayDateSet = new Set(monthHolidays.map((h) => h.date));
    } catch (calErr) {
      logger.warn('Could not read academic calendar holidays:', { error: calErr.message });
    }

    // Calculate total days, Sundays, and official working days from academic calendar
    const totalDaysInMonth = new Date(numYear, numMonth, 0).getDate();
    let officialWorkingDays = 0;
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${numYear}-${String(numMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(numYear, numMonth - 1, day).getDay();
      const isSunday = dayOfWeek === 0;
      const isHoliday = holidayDateSet.has(dateStr);
      if (!isSunday && !isHoliday) {
        officialWorkingDays += 1;
      }
    }
    if (officialWorkingDays === 0) officialWorkingDays = 24; // Sensible fallback

    // 2. Load registered faculty by CFMS ID
    const cfmsIds = records.map((r) => String(r.cfmsId || r.cfms_id || '').trim()).filter(Boolean);
    const existingFacultyMap = await userRepository.findByEmailsOrCfmsIds([], cfmsIds);

    const skippedCfmsIds = [];
    const insertedRecords = [];

    // Filter and resolve records against source of truth database registry
    for (const record of records) {
      const cfmsId = String(record.cfmsId || record.cfms_id || '').trim();
      const existingFaculty = cfmsId ? existingFacultyMap.get(cfmsId) : null;

      if (!existingFaculty) {
        skippedCfmsIds.push(cfmsId || 'Row without CFMS ID');
        continue;
      }

      insertedRecords.push({
        raw: record,
        existingFaculty
      });
    }

    // 3. Upsert monthly sheet and records within a single transaction
    const sheetId = `sheet-${numYear}-${String(numMonth).padStart(2, '0')}`;
    const sheetSql = `
      INSERT INTO monthly_attendance_sheets (
        id, month, year, file_name, total_faculty, working_days, uploaded_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        file_name     = VALUES(file_name),
        total_faculty = VALUES(total_faculty),
        working_days  = VALUES(working_days),
        uploaded_by   = VALUES(uploaded_by),
        updated_at    = NOW()
    `;

    await db.transaction(async (conn) => {
      await conn.query(sheetSql, [sheetId, numMonth, numYear, fileName, insertedRecords.length, officialWorkingDays, uploadedBy]);

      // 4. Clear existing monthly records for this sheet (to allow re-upload/refresh)
      await conn.query(`DELETE FROM faculty_monthly_attendance WHERE sheet_id = ?`, [sheetId]);

      // 5. Bulk insert faculty monthly records with calendar-synchronized working days
      if (insertedRecords.length > 0) {
        const placeholders = insertedRecords.map(() => `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`).join(', ');
        const values = [];

        for (const { raw, existingFaculty } of insertedRecords) {
          const cfmsId = existingFaculty.cfms_id;
          const facultyId = existingFaculty.id;

          // Auto-align daily records with calendar holidays, punch timings, and working days
          const daily = Array.isArray(raw.attendance) ? raw.attendance : [];
          let presentDays = 0;
          let absentDays = 0;
          let leaveDays = 0;
          let halfDays = 0;
          let lateDays = 0;
          let holidayDays = 0;

          const syncedDaily = daily.map((d) => {
            if (!d.date) return d;
            const dateStr = d.date.length === 10 ? d.date : `${numYear}-${String(numMonth).padStart(2, '0')}-${String(d.date).padStart(2, '0')}`;
            const isSun = new Date(dateStr).getDay() === 0;
            const isHol = holidayDateSet.has(dateStr);
            const hasTiming = Boolean((d.inTime && String(d.inTime).trim()) || (d.outTime && String(d.outTime).trim()));

            let finalStatus = d.status || 'A';
            if (isSun || isHol) {
              finalStatus = 'H';
              holidayDays += 1;
            } else if (hasTiming || d.status === 'P' || d.status === 'Late') {
              finalStatus = 'P';
              presentDays += 1;
            } else if (d.status === 'HD' || d.status === 'HALF') {
              finalStatus = 'HD';
              halfDays += 1;
            } else if (d.status === 'L' || d.status === 'CL' || d.status === 'OD' || d.status === 'LEAVE') {
              finalStatus = 'L';
              leaveDays += 1;
            } else {
              finalStatus = 'A';
              absentDays += 1;
            }

            return { ...d, date: dateStr, status: finalStatus };
          });

          const effectivePresent = presentDays + halfDays * 0.5;
          const attendancePercentage = officialWorkingDays > 0
            ? Math.min(100, Math.round((effectivePresent / officialWorkingDays) * 1000) / 10)
            : 0;

          const model = new FacultyMonthlyAttendance({
            sheetId,
            facultyId,
            cfmsId,
            name: existingFaculty.name,
            email: existingFaculty.email,
            department: existingFaculty.department,
            designation: existingFaculty.designation,
            gender: existingFaculty.gender,
            incharge: existingFaculty.incharge,
            jobStatus: existingFaculty.job_status,
            month: numMonth,
            year: numYear,
            presentDays,
            absentDays,
            leaveDays,
            halfDays,
            lateDays,
            holidayDays,
            totalWorkingDays: officialWorkingDays,
            attendancePercentage,
            attendance: syncedDaily,
          });

          values.push(
            model.id,
            model.sheetId,
            model.facultyId,
            model.cfmsId,
            model.name,
            model.email,
            model.department,
            model.designation,
            model.gender || 'male',
            model.jobStatus,
            model.incharge || 'None',
            model.month,
            model.year,
            model.presentDays,
            model.absentDays,
            model.leaveDays,
            model.halfDays,
            model.lateDays,
            model.holidayDays,
            model.totalWorkingDays,
            model.attendancePercentage,
            JSON.stringify(model.dailyRecords)
          );
        }

        const insertSql = `
          INSERT INTO faculty_monthly_attendance (
            id, sheet_id, faculty_id, cfms_id, name, email, department, designation,
            gender, job_status, incharge, month, year, present_days, absent_days, leave_days, half_days,
            late_days, holiday_days, total_working_days, attendance_percentage, daily_records,
            created_at, updated_at
          ) VALUES ${placeholders}
        `;
        await conn.query(insertSql, values);
      }
    });

    logger.info('Monthly attendance workbook successfully synced with calendar and seeded to MySQL', {
      sheetId,
      month: numMonth,
      year: numYear,
      workingDays: officialWorkingDays,
      totalFaculty: insertedRecords.length,
    });

    const savedSheet = await this.getMonthlyAttendance(numMonth, numYear);
    return {
      ...savedSheet,
      warnings: skippedCfmsIds,
    };
  }

  /**
   * Retrieves the latest active monthly attendance sheet and all its records.
   */
  async getLatestMonthlyAttendance() {
    const sheetRows = await db.query(
      `SELECT * FROM monthly_attendance_sheets ORDER BY year DESC, month DESC, created_at DESC LIMIT 1`
    );
    if (sheetRows.length === 0) return null;

    const sheet = new MonthlyAttendanceSheet(sheetRows[0]);
    const recordRows = await db.query(
      `SELECT * FROM faculty_monthly_attendance WHERE sheet_id = ? ORDER BY department ASC, name ASC`,
      [sheet.id]
    );

    const records = recordRows.map((r) => new FacultyMonthlyAttendance(r));
    return {
      sheet,
      month: sheet.month,
      year: sheet.year,
      workingDays: sheet.workingDays,
      totalFaculty: sheet.totalFaculty,
      records,
    };
  }

  /**
   * Retrieves monthly attendance sheet and all records for a given month and year.
   */
  async getMonthlyAttendance(month, year) {
    const sheetRows = await db.query(
      `SELECT * FROM monthly_attendance_sheets WHERE month = ? AND year = ? LIMIT 1`,
      [parseInt(month, 10), parseInt(year, 10)]
    );
    if (sheetRows.length === 0) return null;

    const sheet = new MonthlyAttendanceSheet(sheetRows[0]);
    const recordRows = await db.query(
      `SELECT * FROM faculty_monthly_attendance WHERE sheet_id = ? ORDER BY department ASC, name ASC`,
      [sheet.id]
    );

    const records = recordRows.map((r) => new FacultyMonthlyAttendance(r));
    return {
      sheet,
      month: sheet.month,
      year: sheet.year,
      workingDays: sheet.workingDays,
      totalFaculty: sheet.totalFaculty,
      records,
    };
  }

  /**
   * Returns list of all uploaded attendance months.
   */
  async getAvailableMonths() {
    return db.query(`
      SELECT month, year, file_name, total_faculty, working_days, created_at
      FROM monthly_attendance_sheets
      ORDER BY year DESC, month DESC
    `);
  }

  /**
   * Returns aggregated analytics from persisted monthly attendance records.
   */
  async getMonthlyAnalytics(month = null, year = null) {
    let sheet;
    if (month && year) {
      const sheets = await db.query(
        `SELECT * FROM monthly_attendance_sheets WHERE month = ? AND year = ? LIMIT 1`,
        [parseInt(month, 10), parseInt(year, 10)]
      );
      sheet = sheets[0];
    } else {
      const sheets = await db.query(
        `SELECT * FROM monthly_attendance_sheets ORDER BY year DESC, month DESC, created_at DESC LIMIT 1`
      );
      sheet = sheets[0];
    }

    if (!sheet) return null;

    const statsRows = await db.query(`
      SELECT
        COUNT(*) as totalFaculty,
        AVG(attendance_percentage) as averageAttendance,
        SUM(CASE WHEN attendance_percentage >= 90 THEN 1 ELSE 0 END) as above90,
        SUM(CASE WHEN attendance_percentage < 75 THEN 1 ELSE 0 END) as below75,
        SUM(present_days) as totalPresentDays,
        SUM(absent_days) as totalAbsentDays,
        SUM(leave_days) as totalLeaveDays
      FROM faculty_monthly_attendance
      WHERE sheet_id = ?
    `, [sheet.id]);

    const deptRows = await db.query(`
      SELECT
        department,
        COUNT(*) as totalFaculty,
        AVG(attendance_percentage) as averageAttendance,
        SUM(CASE WHEN attendance_percentage >= 90 THEN 1 ELSE 0 END) as above90,
        SUM(CASE WHEN attendance_percentage < 75 THEN 1 ELSE 0 END) as below75
      FROM faculty_monthly_attendance
      WHERE sheet_id = ?
      GROUP BY department
      ORDER BY department ASC
    `, [sheet.id]);

    return {
      month: sheet.month,
      year: sheet.year,
      workingDays: sheet.working_days,
      sheetId: sheet.id,
      overall: statsRows[0] || {},
      departments: deptRows,
    };
  }

  /**
   * Retrieves individual faculty attendance record for given or latest month.
   */
  async getFacultyAttendance(identifier, month = null, year = null) {
    let sql = `
      SELECT fma.*, s.working_days as official_working_days
      FROM faculty_monthly_attendance fma
      JOIN monthly_attendance_sheets s ON fma.sheet_id = s.id
      WHERE (fma.email = ? OR fma.cfms_id = ? OR fma.faculty_id = ?)
    `;
    const params = [identifier, identifier, identifier];

    if (month && year) {
      sql += ` AND fma.month = ? AND fma.year = ?`;
      params.push(parseInt(month, 10), parseInt(year, 10));
    } else {
      sql += ` ORDER BY fma.year DESC, fma.month DESC LIMIT 1`;
    }

    const rows = await db.query(sql, params);
    if (rows.length === 0) return null;

    return new FacultyMonthlyAttendance(rows[0]);
  }

  /**
   * Syncs user changes to all of their records in the monthly attendance registry.
   */
  async updateFacultyRegistryInfo(facultyId, updates) {
    const fields = [];
    const params = [];
    const allowed = ['name', 'email', 'cfms_id', 'department', 'designation', 'gender', 'job_status', 'incharge'];

    for (const key of allowed) {
      let val = updates[key];
      if (key === 'cfms_id' && updates.cfmsId !== undefined) {
        val = updates.cfmsId;
      }
      if (key === 'job_status' && updates.jobStatus !== undefined) {
        val = updates.jobStatus;
      }

      if (val !== undefined) {
        fields.push(`${key} = ?`);
        params.push(val);
      }
    }

    if (fields.length === 0) return;

    params.push(facultyId);
    const sql = `UPDATE faculty_monthly_attendance SET ${fields.join(', ')}, updated_at = NOW() WHERE faculty_id = ?`;
    return db.query(sql, params);
  }
}

export const monthlyAttendanceRepository = new MonthlyAttendanceRepository();
export default monthlyAttendanceRepository;
