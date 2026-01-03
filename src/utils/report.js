/**
 * Report Generator - Creates PDF, Excel, and CSV reports for individuals
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Generate PDF report for an individual
 * @param {Object} data - Report data containing employee and summary
 * @returns {Blob} PDF blob
 */
export const generateIndividualPDF = (data) => {
  const { employee, summary, month, year, periodLabel } = data;
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Helper function to add centered text
  const addCenteredText = (text, y, fontSize = 12, style = 'normal') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', style);
    const textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, y);
  };

  // Header
  doc.setFillColor(79, 70, 229); // Indigo
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  addCenteredText('ATTENDANCE PERFORMANCE REPORT', 18, 16, 'bold');
  addCenteredText(`${periodLabel || MONTH_NAMES[month - 1] + ' ' + year}`, 30, 12, 'normal');

  // Reset colors
  doc.setTextColor(0, 0, 0);
  yPos = 55;

  // Employee Information Section
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

  // Attendance Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Attendance Summary', margin + 5, yPos);
  
  yPos += 10;

  // Summary Cards
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

  // Additional Statistics
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Additional Statistics', margin + 5, yPos);
  
  yPos += 10;

  const statsData = [
    ['Working Days', summary.workingDays?.toString() || 'N/A'],
    ['Total Hours Worked', `${summary.totalHours || 0} hours`],
    ['Average Hours/Day', summary.workingDays > 0 ? 
      `${(summary.totalHours / summary.workingDays).toFixed(1)} hours` : 'N/A'],
    ['Holidays', summary.holidays?.toString() || 'N/A'],
    ['Performance Status', getPerformanceStatus(summary.attendancePercentage)]
  ];

  doc.autoTable({
    startY: yPos,
    head: [['Metric', 'Value']],
    body: statsData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 10 }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Day-wise Breakdown (if attendance data available)
  if (employee.attendance && employee.attendance.length > 0) {
    // Check if we need a new page
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Day-wise Attendance Breakdown', margin + 5, yPos);
    
    yPos += 10;

    const attendanceData = employee.attendance
      .filter(day => day.status && day.status !== '')
      .map(day => [
        `Day ${day.day}`,
        day.inTime || '-',
        day.outTime || '-',
        day.status || '-',
        day.duration || `${day.hours || 0} hrs`
      ]);

    if (attendanceData.length > 0) {
      doc.autoTable({
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

  // Footer
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
    ['Performance Status', getPerformanceStatus(summary.attendancePercentage)],
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
    `Performance Status,${getPerformanceStatus(summary.attendancePercentage)}`,
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
const getPerformanceStatus = (percentage) => {
  const pct = parseFloat(percentage) || 0;
  if (pct >= 90) return 'Excellent';
  if (pct >= 75) return 'Good';
  if (pct >= 50) return 'Average';
  return 'Needs Improvement';
};

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
  const { employee, summary, month, year, periodLabel } = data;
  const doc = new jsPDF();
  
  // Use same generation logic as generateIndividualPDF
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Header
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ATTENDANCE PERFORMANCE REPORT', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${periodLabel || MONTH_NAMES[month - 1] + ' ' + year}`, pageWidth / 2, 30, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  yPos = 55;

  // Employee Info
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 35, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Name: ${employee.name || 'N/A'}`, margin + 5, yPos + 5);
  doc.text(`ID: ${employee.cfmsId || 'N/A'}`, margin + 5, yPos + 15);
  doc.text(`Department: ${employee.department || 'N/A'}`, margin + 5, yPos + 25);

  yPos += 45;

  // Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Attendance Summary', margin + 5, yPos);
  yPos += 10;

  const summaryData = [
    ['Present Days', summary.presentDays?.toString() || '0'],
    ['Absent Days', summary.absentDays?.toString() || '0'],
    ['Leave Days', summary.leaveDays?.toString() || '0'],
    ['Total Hours', `${summary.totalHours || 0} hrs`],
    ['Attendance %', `${summary.attendancePercentage || 0}%`]
  ];

  doc.autoTable({
    startY: yPos,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: margin, right: margin }
  });

  // Return as base64
  return doc.output('datauristring').split(',')[1];
};

export default {
  generateIndividualPDF,
  generateIndividualExcel,
  generateIndividualCSV,
  downloadReport,
  generatePDFBase64
};
