import { getHardcodedWorkingDays, getWorkingDays, getDaysInMonth } from './dateTimeUtils';
import { parseDurationToHours, estimateHoursFromTimes } from './timeUtils';

const getEmptySummary = () => ({
  presentDays: 0,
  absentDays: 0,
  leaveDays: 0,
  totalDays: 0,
  totalHours: 0,
  formattedDuration: '00:00:00',
  attendancePercentage: 0,
  workingDays: 0,
  holidays: 0,
  effectiveDays: 0
});

const getEmptyOverallStats = () => ({
  totalPresent: 0,
  totalAbsent: 0,
  totalLeave: 0,
  totalHours: 0,
  totalEmployees: 0,
  totalDays: 0,
  workingDays: 0,
  holidays: 0,
  goodAttendance: 0,
  averageAttendance: 0,
  poorAttendance: 0,
  averageAttendancePercentage: 0
});

const formatDuration = (totalHours) => {
  const hoursInt = Math.floor(totalHours);
  const minutes = Math.floor((totalHours - hoursInt) * 60);
  const seconds = Math.floor(((totalHours - hoursInt) * 60 - minutes) * 60);
  return `${hoursInt.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

export const calculateSummary = (employee, monthNumber = 11, year = new Date().getFullYear()) => {
  if (!employee || !employee.attendance) return getEmptySummary();

  const totalDays = employee.attendance.length;
  const workingDays = getHardcodedWorkingDays(monthNumber, totalDays, year);
  const workingDaysCount = workingDays.length;
  const workingDaySet = new Set(workingDays);

  let presentDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let totalHours = 0;

  employee.attendance.forEach((record, index) => {
    const dayNumber = index + 1;
    if (!workingDaySet.has(dayNumber)) return;

    const status = record.status?.toUpperCase() || '';
    if (status === 'P') {
      presentDays++;
      if (record.hours && record.hours > 0) {
        totalHours += record.hours;
      } else if (record.duration && record.duration.trim()) {
        totalHours += parseDurationToHours(record.duration);
      } else if (record.inTime && record.outTime) {
        totalHours += estimateHoursFromTimes(record.inTime, record.outTime);
      } else {
        totalHours += 8.0;
      }
    } else if (status === 'A') {
      absentDays++;
    } else if (['L', 'EL', 'OD'].includes(status)) {
      leaveDays++;
    } else if (status && status.trim() !== '') {
      absentDays++;
    }
  });

  const attendancePercentage = workingDaysCount > 0 ? (presentDays / workingDaysCount) * 100 : 0;
  const totalHoursFormatted = parseFloat(totalHours.toFixed(2));

  return {
    presentDays,
    absentDays,
    leaveDays,
    totalDays,
    workingDays: workingDaysCount,
    holidays: totalDays - workingDaysCount,
    effectiveDays: presentDays + absentDays + leaveDays,
    totalHours: totalHoursFormatted,
    formattedDuration: formatDuration(totalHours),
    attendancePercentage: parseFloat(attendancePercentage.toFixed(1))
  };
};

export const calculateOverallStats = (attendanceData, monthNumber = 11, year = new Date().getFullYear()) => {
  if (!attendanceData || !attendanceData.length) return getEmptyOverallStats();

  const totalDays = attendanceData[0].attendance.length;
  const workingDays = getHardcodedWorkingDays(monthNumber, totalDays, year);
  const workingDaysCount = workingDays.length;
  const holidaysCount = totalDays - workingDaysCount;

  const stats = attendanceData.reduce(
    (acc, employee) => {
      const summary = calculateSummary(employee, monthNumber, year);
      acc.totalPresent += summary.presentDays;
      acc.totalAbsent += summary.absentDays;
      acc.totalLeave += summary.leaveDays;
      acc.totalHours += parseFloat(summary.totalHours);
      acc.totalEmployees += 1;

      if (summary.attendancePercentage >= 75) acc.goodAttendance += 1;
      else if (summary.attendancePercentage >= 50) acc.averageAttendance += 1;
      else acc.poorAttendance += 1;

      return acc;
    },
    getEmptyOverallStats()
  );

  const totalWorkingDays = workingDaysCount * stats.totalEmployees;
  const averagePercentage = totalWorkingDays > 0 ? (stats.totalPresent / totalWorkingDays) * 100 : 0;

  return {
    ...stats,
    totalDays,
    workingDays: workingDaysCount,
    holidays: holidaysCount,
    averageAttendancePercentage: parseFloat(averagePercentage.toFixed(1))
  };
};

export const calculateMonthlyStats = (attendanceData, monthNumber = 11, year = new Date().getFullYear()) => {
  if (!attendanceData || !attendanceData.length) return [];

  const workingDays = getWorkingDays(attendanceData, monthNumber, null, year);
  const totalDays = getDaysInMonth(attendanceData);
  const workingDaySet = new Set(workingDays);

  const dailyStats = [];
  for (let day = 1; day <= totalDays; day++) {
    const isWorkingDay = workingDaySet.has(day);
    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    attendanceData.forEach((employee) => {
      const record = employee.attendance?.[day - 1];
      if (!record) return;
      if (record.status === 'P') presentCount += 1;
      else if (record.status === 'A') absentCount += 1;
      else if (['L', 'EL', 'OD'].includes(record.status)) leaveCount += 1;
    });

    dailyStats.push({
      day,
      isWorkingDay,
      present: presentCount,
      absent: absentCount,
      leave: leaveCount,
      total: attendanceData.length
    });
  }

  return dailyStats;
};

export const calculateAttendanceTrends = (attendanceData, monthNumber = 11, year = new Date().getFullYear()) => {
  if (!attendanceData || !attendanceData.length) {
    return { dailyTrends: [], weeklyTrends: [] };
  }

  const totalDays = getDaysInMonth(attendanceData);
  const workingDays = getWorkingDays(attendanceData, monthNumber, null, year);
  const workingDaySet = new Set(workingDays);

  const dailyTrends = [];
  for (let day = 1; day <= totalDays; day++) {
    let presentCount = 0;
    let totalCount = 0;

    attendanceData.forEach((employee) => {
      const record = employee.attendance?.[day - 1];
      if (!record) return;
      totalCount += 1;
      if (record.status === 'P') {
        presentCount += 1;
      }
    });

    dailyTrends.push({
      day,
      date: `${String(day).padStart(2, '0')}`,
      isWorkingDay: workingDaySet.has(day),
      present: presentCount,
      total: totalCount,
      attendanceRate: totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : '0.0'
    });
  }

  const weeklyTrends = [];
  for (let week = 0; week < Math.ceil(totalDays / 7); week++) {
    const start = week * 7 + 1;
    const end = Math.min((week + 1) * 7, totalDays);
    const weekRange = `${start}-${end}`;
    let weekPresent = 0;
    let weekTotal = 0;
    let weekWorkingDays = 0;

    for (let day = start; day <= end; day++) {
      const trend = dailyTrends[day - 1];
      if (!trend) continue;
      weekPresent += trend.present;
      weekTotal += trend.total;
      if (trend.isWorkingDay) weekWorkingDays += 1;
    }

    weeklyTrends.push({
      week: week + 1,
      weekRange,
      workingDays: weekWorkingDays,
      present: weekPresent,
      total: weekTotal,
      attendanceRate: weekTotal > 0 ? ((weekPresent / weekTotal) * 100).toFixed(1) : '0.0'
    });
  }

  return { dailyTrends, weeklyTrends };
};