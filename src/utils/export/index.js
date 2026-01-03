import * as XLSX from 'xlsx';
import {
  calculateSummary,
  calculateOverallStats,
  calculateMonthlyStats
} from '../../core/attendance/calculations';
import { generateReportFilename } from './file';
import { getWorkingDays, getHolidays } from '../../core/calendar/workingDays';

const sanitizeCSVValue = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue === '') return '';
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildFileName = (department = 'All', monthNumber = 11, year = new Date().getFullYear(), extension = 'csv') => {
  const baseName = generateReportFilename(department, monthNumber, year).replace(/\.csv$/i, '');
  return `${baseName}.${extension}`.toLowerCase();
};

const buildSummaryRow = (employee, summary) => ({
  name: employee.name || 'Unknown',
  designation: employee.designation || 'N/A',
  cfmsId: employee.cfmsId || '',
  department: employee.department || 'N/A',
  presentDays: summary.presentDays,
  absentDays: summary.absentDays,
  leaveDays: summary.leaveDays,
  totalHours: summary.totalHours,
  attendancePercentage: summary.attendancePercentage,
  workingDays: summary.workingDays,
  holidays: summary.holidays
});

export const exportToCSV = (attendanceData = [], monthNumber = 11) => {
  if (!Array.isArray(attendanceData) || attendanceData.length === 0) return '';

  const headers = [
    'Name',
    'Designation',
    'CFMS ID',
    'Department',
    'Present Days',
    'Absent Days',
    'Leave Days',
    'Total Hours',
    'Attendance %',
    'Working Days',
    'Holidays'
  ];

  const csvRows = [headers.join(',')];

  attendanceData.forEach((employee) => {
    const summary = calculateSummary(employee, monthNumber);
    const row = buildSummaryRow(employee, summary);
    csvRows.push(
      [
        row.name,
        row.designation,
        row.cfmsId,
        row.department,
        row.presentDays,
        row.absentDays,
        row.leaveDays,
        row.totalHours,
        row.attendancePercentage,
        row.workingDays,
        row.holidays
      ]
        .map(sanitizeCSVValue)
        .join(',')
    );
  });

  return csvRows.join('\n');
};

export const exportToExcel = (
  employees = [],
  monthNumber = 11,
  year = new Date().getFullYear(),
  options = {}
) => {
  if (!Array.isArray(employees) || employees.length === 0) return null;

  const workbook = XLSX.utils.book_new();
  const summaryData = employees.map((employee) => buildSummaryRow(employee, calculateSummary(employee, monthNumber)));
  const summarySheet = XLSX.utils.json_to_sheet(summaryData, {
    header: [
      'name',
      'designation',
      'cfmsId',
      'department',
      'presentDays',
      'absentDays',
      'leaveDays',
      'totalHours',
      'attendancePercentage',
      'workingDays',
      'holidays'
    ]
  });
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  const dailyStats = calculateMonthlyStats(employees, monthNumber).map((stat) => ({
    day: stat.day,
    isWorkingDay: stat.isWorkingDay ? 'Yes' : 'No',
    present: stat.present,
    absent: stat.absent,
    leave: stat.leave,
    total: stat.total
  }));

  if (dailyStats.length) {
    const dailySheet = XLSX.utils.json_to_sheet(dailyStats, {
      header: ['day', 'isWorkingDay', 'present', 'absent', 'leave', 'total']
    });
    XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Stats');
  }

  const totalDays = employees[0]?.attendance?.length || 31;
  const workingDays = getWorkingDays(employees, monthNumber, totalDays);
  const holidays = getHolidays(monthNumber, totalDays);

  const metadataSheet = XLSX.utils.aoa_to_sheet([
    ['Generated At', new Date().toISOString()],
    ['Month', monthNumber],
    ['Year', year],
    ['Department Filter', options.department || 'All'],
    ['Employee Count', employees.length],
    ['Working Days', workingDays.length],
    ['Holidays', holidays.length]
  ]);
  XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

  const fileName = buildFileName(options.department, monthNumber, year, 'xlsx');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  return { fileName, buffer, workbook };
};

export const generateReportJSON = (
  employees = [],
  monthNumber = 11,
  year = new Date().getFullYear(),
  options = {}
) => {
  const summaries = (Array.isArray(employees) ? employees : []).map((employee) => ({
    cfmsId: employee.cfmsId || '',
    name: employee.name || 'Unknown',
    designation: employee.designation || 'N/A',
    department: employee.department || 'N/A',
    empType: employee.empType || '',
    summary: calculateSummary(employee, monthNumber)
  }));

  const totalDays = employees[0]?.attendance?.length || 31;

  return {
    generatedAt: new Date().toISOString(),
    metadata: {
      month: monthNumber,
      year,
      department: options.department || 'All',
      recordCount: summaries.length,
      workingDays: getWorkingDays(employees, monthNumber, totalDays),
      holidays: getHolidays(monthNumber, totalDays)
    },
    stats: {
      overall: calculateOverallStats(employees, monthNumber),
      daily: calculateMonthlyStats(employees, monthNumber)
    },
    summaries
  };
};

export const formatReportData = (
  attendanceData = [],
  format = 'json',
  options = {}
) => {
  const monthNumber = options.monthNumber ?? 11;
  const year = options.year ?? new Date().getFullYear();
  const department = options.department || 'All';

  if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
    return { fileName: buildFileName(department, monthNumber, year, format), mimeType: '', data: null };
  }

  if (format === 'csv') {
    return {
      fileName: buildFileName(department, monthNumber, year, 'csv'),
      mimeType: 'text/csv',
      data: exportToCSV(attendanceData, monthNumber)
    };
  }

  if (format === 'excel') {
    const excelResult = exportToExcel(attendanceData, monthNumber, year, { department });
    return {
      fileName: excelResult?.fileName || buildFileName(department, monthNumber, year, 'xlsx'),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      data: excelResult?.buffer || null,
      workbook: excelResult?.workbook || null
    };
  }

  const jsonPayload = generateReportJSON(attendanceData, monthNumber, year, { department });
  return {
    fileName: buildFileName(department, monthNumber, year, 'json'),
    mimeType: 'application/json',
    data: JSON.stringify(jsonPayload, null, 2),
    json: jsonPayload
  };
};