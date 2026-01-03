import { getHolidayDays } from './calendar';

const normalizeMonth = (monthNumber) => {
  if (!monthNumber || Number.isNaN(Number(monthNumber))) return 11;
  const normalized = Number(monthNumber);
  if (normalized < 1 || normalized > 12) return 11;
  return normalized;
};

/**
 * Calculates working days for a given month dynamically using CALENDAR_CONFIG.
 * 
 * IMPORTANT: This function relies EXCLUSIVELY on calendar.js CALENDAR_CONFIG.
 * - All holidays (general, optional, Sundays, second Saturdays) come from the config
 * - NO hardcoded holiday logic exists in this function
 * - Automatically adapts to any changes in CALENDAR_CONFIG
 * 
 * @param {number} monthNumber - Month number (1-12)
 * @param {number} totalDaysInMonth - Days in the attendance data (e.g., from Excel)
 * @param {number} year - Year for which to calculate working days
 * @returns {Array<number>} Array of working day numbers (e.g., [1, 2, 4, 5, ...])
 */
export const getHardcodedWorkingDays = (monthNumber, totalDaysInMonth = 31, year = new Date().getFullYear()) => {
  const normalizedMonth = normalizeMonth(monthNumber);

  // STEP 1: Get ALL holidays from CALENDAR_CONFIG (includes Sundays, second Saturdays, etc.)
  // This is the ONLY source of truth for what constitutes a holiday
  const holidayDays = getHolidayDays(normalizedMonth, year);

  // STEP 2: Calculate actual days in the calendar month to prevent invalid dates
  // e.g., February only has 28/29 days, not 31
  const daysInMonthDate = new Date(year, normalizedMonth, 0).getDate();
  const limitDay = Math.min(totalDaysInMonth, daysInMonthDate);

  // STEP 3: Calculate working days by EXCLUDING all holidays from CALENDAR_CONFIG
  // Working Day = Any day that is NOT in the holidayDays array
  const workingDays = [];

  for (let day = 1; day <= limitDay; day++) {
    // If this day is in the holiday list from CALENDAR_CONFIG, skip it
    if (holidayDays.includes(day)) continue;

    // Otherwise, it's a working day
    workingDays.push(day);
  }

  return workingDays;
};

/**
 * Retrieves all holidays for a given month dynamically from CALENDAR_CONFIG.
 * 
 * This function is the complement to getHardcodedWorkingDays and uses the SAME
 * source of truth (calendar.js CALENDAR_CONFIG) to determine holidays.
 * 
 * @param {number} monthNumber - Month number (1-12)
 * @param {number} totalDaysInMonth - Days in the attendance data
 * @param {number} year - Year for which to retrieve holidays
 * @returns {Array<number>} Sorted array of holiday day numbers
 */
export const getHolidays = (monthNumber, totalDaysInMonth = 31, year = new Date().getFullYear()) => {
  const normalizedMonth = normalizeMonth(monthNumber);

  // Get all holidays directly from CALENDAR_CONFIG (includes all holiday types)
  const holidayDays = getHolidayDays(normalizedMonth, year);

  // Ensure we don't return holidays beyond the actual calendar month length
  const daysInMonthDate = new Date(year, normalizedMonth, 0).getDate();
  const limitDay = Math.min(totalDaysInMonth, daysInMonthDate);

  return holidayDays.sort((a, b) => a - b).filter((day) => day <= limitDay);
};

export const getWorkingDays = (attendanceData, monthNumber = 11, totalDaysOverride = null, year = new Date().getFullYear()) => {
  if (!attendanceData || !attendanceData.length) {
    const totalDays = totalDaysOverride || 31;
    return getHardcodedWorkingDays(monthNumber, totalDays, year);
  }

  const totalDays = totalDaysOverride || attendanceData[0]?.attendance?.length || 0;
  return getHardcodedWorkingDays(monthNumber, totalDays, year);
};

export const getDaysInMonth = (attendanceData) => {
  return attendanceData && attendanceData.length > 0 ? attendanceData[0].attendance.length : 0;
};

export const compareHolidaysWithAttendance = (attendanceData, monthNumber = 11) => {
  if (!attendanceData || !attendanceData.length) return [];

  const holidays = getHolidays(monthNumber, attendanceData[0]?.attendance?.length || 0);
  const results = [];

  attendanceData.forEach((employee) => {
    holidays.forEach((dayNumber) => {
      const record = employee.attendance?.[dayNumber - 1];
      results.push({
        name: employee.name,
        cfmsId: employee.cfmsId,
        day: dayNumber,
        date: record?.date || `${String(dayNumber).padStart(2, '0')}`,
        status: record?.status || '',
        inTime: record?.inTime || '',
        outTime: record?.outTime || '',
        expectedStatus: 'Holiday'
      });
    });
  });

  return results;
};

export const getDayAttendanceStatus = (attendanceData, dayNumber) => {
  if (!attendanceData || !Array.isArray(attendanceData) || dayNumber < 1) return [];

  return attendanceData.map((employee) => {
    const record = employee.attendance?.[dayNumber - 1];
    return {
      name: employee.name,
      cfmsId: employee.cfmsId,
      department: employee.department,
      designation: employee.designation,
      status: record?.status || 'Unknown',
      inTime: record?.inTime || '',
      outTime: record?.outTime || '',
      duration: record?.duration || '',
      hours: record?.hours || 0
    };
  });
};