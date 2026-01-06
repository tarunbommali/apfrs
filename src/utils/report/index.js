/**
 * Report Generator - Creates PDF, Excel, and CSV reports for individuals
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { calculateSummary } from '../../core/attendance/calculations';
import { getHolidayLabel, getHolidayType } from '../../config/calendar';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Generate PDF report for an individual
 * @param {Object} data - Report data containing employee and summary
 * @returns {Blob} PDF blob
 */
const createIndividualDocument = (data) => {
  const { employee, summary, month, year, periodLabel } = data;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  const addCenteredText = (text, y, fontSize = 12, style = 'normal') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', style);
    const textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, y);
  };

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  addCenteredText('ATTENDANCE PERFORMANCE REPORT', 18, 16, 'bold');
  addCenteredText(`${periodLabel || MONTH_NAMES[month - 1] + ' ' + year}`, 30, 12, 'normal');

  doc.setTextColor(0, 0, 0);
  yPos = 55;

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 45, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information', margin + 5, yPos + 5);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const infoStartY = yPos + 15;
  const col1X = margin + 5;
  const col2X = pageWidth / 2 + 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Name:', col1X, infoStartY);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.name || 'N/A', col1X + 30, infoStartY);

  doc.setFont('helvetica', 'bold');
  doc.text('Employee ID:', col2X, infoStartY);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.cfmsId || 'N/A', col2X + 35, infoStartY);

  doc.setFont('helvetica', 'bold');
  doc.text('Designation:', col1X, infoStartY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.designation || 'N/A', col1X + 35, infoStartY + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Department:', col2X, infoStartY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.department || 'N/A', col2X + 35, infoStartY + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Email:', col1X, infoStartY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.email || 'N/A', col1X + 25, infoStartY + 20);

  yPos += 55;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Attendance Summary', margin + 5, yPos);

  yPos += 10;

  const cardWidth = (pageWidth - 2 * margin - 20) / 4;
  const cardHeight = 35;
  const cards = [
    { label: 'Present Days', value: summary.presentDays?.toString() || '0', color: [16, 185, 129] },
    { label: 'Absent Days', value: summary.absentDays?.toString() || '0', color: [239, 68, 68] },
    { label: 'Leave Days', value: summary.leaveDays?.toString() || '0', color: [245, 158, 11] },
    { label: 'Attendance %', value: `${summary.attendancePercentage || 0}%`, color: [79, 70, 229] }
  ];

  cards.forEach((card, index) => {
    const x = margin + index * (cardWidth + 5);

    doc.setFillColor(...card.color);
    doc.roundedRect(x, yPos, cardWidth, cardHeight, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(card.label, x + 5, yPos + 12);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(card.value, x + 5, yPos + 26);
  });

  doc.setTextColor(0, 0, 0);
  yPos += cardHeight + 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Additional Statistics', margin + 5, yPos);

  yPos += 10;

  const statsData = [
    ['Working Days', summary.workingDays?.toString() || 'N/A'],
    ['Total Hours Worked', `${summary.totalHours || 0} hours`],
    ['Average Hours/Day', summary.workingDays > 0 ?
      `${(summary.totalHours / summary.workingDays).toFixed(1)} hours` : 'N/A'],
    ['Holidays', summary.holidays?.toString() || 'N/A']
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: statsData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 10 }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  if (employee.attendance && employee.attendance.length > 0) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Day-wise Attendance Breakdown', margin + 5, yPos);

    yPos += 10;

    const attendanceData = employee.attendance.map((day) => {
        const statusLabel = formatAttendanceStatus(day, month, year);
        const hasDuration = day.duration && day.duration.trim().length > 0;
        const hoursLabel = day.hours ? `${formatNumber(day.hours, 1)} hrs` : '-';

        return [
          `Day ${day.day}`,
          day.inTime || '-',
          day.outTime || '-',
          statusLabel,
          hasDuration ? day.duration : hoursLabel
        ];
      });

    if (attendanceData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Day', 'In Time', 'Out Time', 'Status', 'Duration']],
        body: attendanceData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 25 },
          4: { cellWidth: 35 }
        }
      });
    }
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);

    const footerText = `Generated on ${new Date().toLocaleString()} | APFRS Attendance System | Page ${i} of ${pageCount}`;
    const footerWidth = doc.getStringUnitWidth(footerText) * 8 / doc.internal.scaleFactor;
    doc.text(footerText, (pageWidth - footerWidth) / 2, doc.internal.pageSize.getHeight() - 10);
  }

  return doc;
};

export const generateIndividualPDF = (data) => {
  const doc = createIndividualDocument(data);
  return doc.output('blob');
};

/**
 * Generate Excel report for an individual
 * @param {Object} data - Report data
 * @returns {Object} { buffer, filename }
 */
export const generateIndividualExcel = (data) => {
  const { employee, summary, month, year, periodLabel } = data;
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['ATTENDANCE PERFORMANCE REPORT'],
    [`Period: ${periodLabel || MONTH_NAMES[month - 1] + ' ' + year}`],
    [''],
    ['EMPLOYEE INFORMATION'],
    ['Name', employee.name || 'N/A'],
    ['Employee ID', employee.cfmsId || 'N/A'],
    ['Designation', employee.designation || 'N/A'],
    ['Department', employee.department || 'N/A'],
    ['Email', employee.email || 'N/A'],
    [''],
    ['ATTENDANCE SUMMARY'],
    ['Present Days', summary.presentDays || 0],
    ['Absent Days', summary.absentDays || 0],
    ['Leave Days', summary.leaveDays || 0],
    ['Working Days', summary.workingDays || 0],
    ['Total Hours', summary.totalHours || 0],
    ['Attendance Percentage', `${summary.attendancePercentage || 0}%`],
    [''],
    ['Report Generated', new Date().toLocaleString()]
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Daily Attendance Sheet
  if (employee.attendance && employee.attendance.length > 0) {
    const dailyData = [
      ['Day', 'Date', 'In Time', 'Out Time', 'Status', 'Duration', 'Hours']
    ];

    employee.attendance.forEach(day => {
      dailyData.push([
        day.day,
        day.date || `Day ${day.day}`,
        day.inTime || '-',
        day.outTime || '-',
        day.status || '-',
        day.duration || '-',
        day.hours || 0
      ]);
    });

    const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
    XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Attendance');
  }

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const filename = `attendance_report_${employee.cfmsId || employee.name.replace(/\s+/g, '_')}_${year}_${month}.xlsx`;

  return { buffer, filename };
};

/**
 * Generate CSV report for an individual
 * @param {Object} data - Report data
 * @returns {Object} { content, filename }
 */
export const generateIndividualCSV = (data) => {
  const { employee, summary, month, year, periodLabel } = data;
  
  const lines = [
    'ATTENDANCE PERFORMANCE REPORT',
    `Period,${periodLabel || MONTH_NAMES[month - 1] + ' ' + year}`,
    '',
    'EMPLOYEE INFORMATION',
    `Name,${employee.name || 'N/A'}`,
    `Employee ID,${employee.cfmsId || 'N/A'}`,
    `Designation,${employee.designation || 'N/A'}`,
    `Department,${employee.department || 'N/A'}`,
    `Email,${employee.email || 'N/A'}`,
    '',
    'ATTENDANCE SUMMARY',
    `Present Days,${summary.presentDays || 0}`,
    `Absent Days,${summary.absentDays || 0}`,
    `Leave Days,${summary.leaveDays || 0}`,
    `Working Days,${summary.workingDays || 0}`,
    `Total Hours,${summary.totalHours || 0}`,
    `Attendance Percentage,${summary.attendancePercentage || 0}%`,
    '',
    'DAILY ATTENDANCE',
    'Day,Date,In Time,Out Time,Status,Duration,Hours'
  ];

  if (employee.attendance && employee.attendance.length > 0) {
    employee.attendance.forEach(day => {
      lines.push([
        day.day,
        day.date || `Day ${day.day}`,
        day.inTime || '-',
        day.outTime || '-',
        day.status || '-',
        day.duration || '-',
        day.hours || 0
      ].join(','));
    });
  }

  lines.push('');
  lines.push(`Report Generated,${new Date().toLocaleString()}`);

  const content = lines.join('\n');
  const filename = `attendance_report_${employee.cfmsId || employee.name.replace(/\s+/g, '_')}_${year}_${month}.csv`;

  return { content, filename };
};

/**
 * Get performance status based on attendance percentage
 */

/**
 * Download report in specified format
 * @param {Object} data - Report data
 * @param {string} format - 'pdf', 'excel', or 'csv'
 */
export const downloadReport = async (data, format = 'pdf') => {
  try {
    let blob, filename;

    switch (format.toLowerCase()) {
      case 'pdf':
        blob = generateIndividualPDF(data);
        filename = `attendance_report_${data.employee.cfmsId || data.employee.name.replace(/\s+/g, '_')}_${data.year}_${data.month}.pdf`;
        break;

      case 'excel':
      case 'xlsx':
        const excelResult = generateIndividualExcel(data);
        blob = new Blob([excelResult.buffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        filename = excelResult.filename;
        break;

      case 'csv':
        const csvResult = generateIndividualCSV(data);
        blob = new Blob([csvResult.content], { type: 'text/csv;charset=utf-8;' });
        filename = csvResult.filename;
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
};

/**
 * Generate PDF as base64 for email attachment
 * @param {Object} data - Report data
 * @returns {string} Base64 encoded PDF
 */
export const generatePDFBase64 = (data) => {
  const doc = createIndividualDocument(data);
  return doc.output('datauristring').split(',')[1];
};

const formatNumber = (value, digits = 1) => {
  if (value == null || Number.isNaN(value)) return '0';
  return Number(value).toFixed(digits);
};

const formatAttendanceStatus = (record, month, year) => {
  const rawStatus = (record.status || '').toString().trim();
  const upper = rawStatus.toUpperCase();
  const holidayLabel = getHolidayLabel(month, record.day, year);
  const holidayType = getHolidayType(month, record.day, year);
  const dayNumber = Number(record.day);
  const isValidDay = Number.isFinite(dayNumber) && dayNumber > 0;
  const date = isValidDay ? new Date(year, month - 1, dayNumber) : null;
  const isSunday = holidayType === 'sunday' || (date ? date.getDay() === 0 : false);
  const isCalendarHoliday = Boolean(holidayType) || Boolean(holidayLabel);

  if (isCalendarHoliday) {
    return isSunday ? 'Weekend' : 'Holiday';
  }

  if (upper === 'P') return 'Present';
  if (upper === 'A') return 'Absent';
  if (upper === 'L') return 'Leave';

  if (upper.includes('HOLIDAY') || upper.includes('SECOND SATURDAY')) {
    return 'Holiday';
  }

  if (upper.includes('WEEKEND')) {
    return 'Weekend';
  }

  if (rawStatus) return rawStatus;

  return 'Not Recorded';
};

export const buildConsolidatedReport = (attendanceData, monthNumber, year) => {
  const month = monthNumber || new Date().getMonth() + 1;
  const targetYear = year || new Date().getFullYear();

  if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
    return {
      month,
      year: targetYear,
      periodLabel: `${MONTH_NAMES[month - 1]} ${targetYear}`,
      departments: []
    };
  }

  const departmentMap = new Map();

  const resolveDepartment = (value) => {
    const raw = (value || '').toString().trim();
    if (!raw) {
      return { key: 'unknown', label: 'UNKNOWN' };
    }
    const key = raw.toLowerCase();
    const label = raw.toUpperCase();
    return { key, label };
  };

  attendanceData.forEach((employee) => {
    const { key: departmentKey, label: departmentLabel } = resolveDepartment(employee.department);
    const summary = calculateSummary(employee, month, targetYear);
    const totalDays = summary.workingDays || summary.presentDays + summary.absentDays;

    if (!departmentMap.has(departmentKey)) {
      departmentMap.set(departmentKey, {
        department: departmentLabel,
        employees: [],
        presentSum: 0,
        totalSum: 0,
        hoursSum: 0
      });
    }

    const entry = departmentMap.get(departmentKey);
    entry.employees.push({
      name: employee.name || 'N/A',
      designation: employee.designation || 'N/A',
      cfmsId: employee.cfmsId || employee.cfms_id || 'N/A',
      email: employee.email || '',
      presentDays: summary.presentDays,
      totalDays,
      totalHours: summary.totalHours || 0,
      percentage: summary.attendancePercentage || 0
    });

    entry.presentSum += summary.presentDays;
    entry.totalSum += totalDays;
    entry.hoursSum += summary.totalHours || 0;
  });

  const departments = Array.from(departmentMap.values()).map((dept) => {
    const average = dept.totalSum > 0 ? (dept.presentSum / dept.totalSum) * 100 : 0;
    const employees = dept.employees
      .slice()
      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
      .map((emp, index) => ({
        ...emp,
        serial: index + 1,
        statsLabel: `${emp.presentDays}/${emp.totalDays || 0}`,
        hoursLabel: formatNumber(emp.totalHours, 1)
      }));

    return {
      department: dept.department,
      employees,
      averagePercentage: parseFloat(average.toFixed(1)),
      totalEmployees: dept.employees.length,
      presentSum: dept.presentSum,
      totalSum: dept.totalSum,
      hoursSum: parseFloat(dept.hoursSum.toFixed(1))
    };
  });

  departments.sort((a, b) => b.averagePercentage - a.averagePercentage);

  return {
    month,
    year: targetYear,
    periodLabel: `${MONTH_NAMES[month - 1]} ${targetYear}`,
    departments
  };
};

const createConsolidatedDocument = (report) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const { periodLabel, departments } = report;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 80, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Consolidated Attendance Report', pageWidth / 2, 38, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(periodLabel, pageWidth / 2, 60, { align: 'center' });

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  let currentY = 100;

  if (!departments.length) {
    doc.text('No attendance data available for the selected period.', 40, currentY);
    return doc;
  }

  departments.forEach((dept, deptIndex) => {
    if (deptIndex > 0 && currentY > 120) {
      doc.addPage();
      currentY = 60;
    }

    if (deptIndex > 0 && currentY < 100) {
      currentY = 100;
    }

    const header = `${dept.department} • ${dept.totalEmployees} Faculty • Avg ${formatNumber(dept.averagePercentage)}%`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(header, 40, currentY);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    currentY += 12;

    const tableBody = dept.employees.map((emp) => ([
      emp.serial,
      emp.name,
      `${emp.designation}${emp.cfmsId && emp.cfmsId !== 'N/A' ? ` | ${emp.cfmsId}` : ''}`,
      emp.statsLabel,
      emp.hoursLabel,
      `${formatNumber(emp.percentage)}%`
    ]));

    autoTable(doc, {
      startY: currentY,
      head: [['S.No', 'Faculty Member', 'Details', 'Stats [P/T]', 'Total Hours', 'Percentage']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], halign: 'center' },
      styles: { fontSize: 9, cellPadding: 6 },
      columnStyles: {
        0: { cellWidth: 50, halign: 'center' },
        1: { cellWidth: 160 },
        2: { cellWidth: 220 },
        3: { cellWidth: 90, halign: 'center' },
        4: { cellWidth: 90, halign: 'right' },
        5: { cellWidth: 90, halign: 'right' }
      },
      margin: { left: 40, right: 40 },
      willDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 2 && data.cell.text) {
          doc.setFont('helvetica', 'normal');
        }
      }
    });

    currentY = doc.lastAutoTable.finalY + 24;

    const aggregateLine = `Department Total: ${dept.presentSum} Present / ${dept.totalSum} Working Days • ${formatNumber(dept.hoursSum)} Hours Logged`;
    doc.setFont('helvetica', 'italic');
    doc.text(aggregateLine, 44, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 32;
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    const footer = `Generated ${new Date().toLocaleDateString()} • APFRS Attendance System • Page ${i} of ${totalPages}`;
    doc.text(footer, pageWidth / 2, doc.internal.pageSize.getHeight() - 30, { align: 'center' });
  }

  return doc;
};

export const generateConsolidatedPDF = (report) => {
  const doc = createConsolidatedDocument(report);
  return doc.output('blob');
};

export const generateConsolidatedPDFBase64 = (report) => {
  const doc = createConsolidatedDocument(report);
  return doc.output('datauristring').split(',')[1];
};

export const downloadConsolidatedPDF = (report) => {
  const doc = createConsolidatedDocument(report);
  const filename = `consolidated_attendance_${report.year}_${report.month}.pdf`;
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return filename;
};

export default {
  generateIndividualPDF,
  generateIndividualExcel,
  generateIndividualCSV,
  downloadReport,
  generatePDFBase64,
  buildConsolidatedReport,
  generateConsolidatedPDF,
  generateConsolidatedPDFBase64,
  downloadConsolidatedPDF
};
