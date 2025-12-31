import { getHolidayDays } from './calendar';

const normalizeMonth = (monthNumber) => {
  if (!monthNumber || Number.isNaN(Number(monthNumber))) return 11;
  const normalized = Number(monthNumber);
  if (normalized < 1 || normalized > 12) return 11;
  return normalized;
};

export const getHardcodedWorkingDays = (monthNumber, totalDaysInMonth = 31, year = 2025) => {
  const normalizedMonth = normalizeMonth(monthNumber);
  const holidayDays = getHolidayDays(normalizedMonth, year);

  // Calculate working days by excluding holidays and Sundays
  const workingDays = [];
  for (let day = 1; day <= totalDaysInMonth; day++) {
    // Check if it's a holiday
    if (holidayDays.includes(day)) continue;

    // Check if it's a Sunday
    const date = new Date(year, normalizedMonth - 1, day);
    if (date.getDay() === 0) continue;

    // It's a working day
    workingDays.push(day);
  }

  return workingDays;
};

export const getHolidays = (monthNumber, totalDaysInMonth = 31, year = new Date().getFullYear()) => {
  const normalizedMonth = normalizeMonth(monthNumber);
  const holidayDays = getHolidayDays(normalizedMonth, year);

  const allHolidays = [...holidayDays];

  // Add Sundays to the list of holidays
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const date = new Date(year, normalizedMonth - 1, day);
    if (date.getDay() === 0 && !allHolidays.includes(day)) {
      allHolidays.push(day);
    }
  }

  return allHolidays.sort((a, b) => a - b).filter((day) => day <= totalDaysInMonth);
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