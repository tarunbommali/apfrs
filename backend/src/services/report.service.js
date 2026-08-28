// backend/src/services/report.service.js
import puppeteer from 'puppeteer';
import { generateReportHTML } from '../utils/report-template.js';
import { monthlyAttendanceRepository } from '../repositories/monthly-attendance.repository.js';
import { AppError } from '../utils/errors.js';

class ReportService {
  /**
   * Builds the canonical report data structure from db records.
   */
  async getReportData(cfmsId, month, year) {
    const recordsObj = await monthlyAttendanceRepository.getMonthlyAttendance(month, year);
    if (!recordsObj) {
      throw new AppError(404, `No attendance statement found for ${month}/${year}`);
    }

    const record = recordsObj.records.find(r => String(r.cfmsId).trim() === String(cfmsId).trim());
    if (!record) {
      throw new AppError(404, `No attendance record found for CFMS ID: ${cfmsId}`);
    }

    // Map daily records and calculate duration
    const dailyAttendance = (record.dailyRecords || []).map((day, idx) => {
      let duration = '-';
      if (day.inTime && day.outTime) {
        const [inH, inM, inS] = day.inTime.split(':').map(Number);
        const [outH, outM, outS] = day.outTime.split(':').map(Number);
        const diffMs = new Date(2000, 0, 1, outH, outM, outS || 0) - new Date(2000, 0, 1, inH, inM, inS || 0);
        if (diffMs > 0) {
          const h = Math.floor(diffMs / 3600000);
          const m = Math.floor((diffMs % 3600000) / 60000);
          const s = Math.floor((diffMs % 60000) / 1000);
          duration = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
      }

      // Sync display status for holidays
      let statusStr = day.status;
      if (statusStr === 'P') statusStr = 'Present';
      else if (statusStr === 'A') statusStr = 'Absent';
      else if (statusStr === 'H') statusStr = 'Holiday';

      return {
        day: idx + 1,
        date: day.date,
        inTime: day.inTime || null,
        outTime: day.outTime || null,
        status: statusStr,
        duration,
      };
    });

    // Calculate total hours
    let totalMinutes = 0;
    let presentWorkingDays = 0;
    dailyAttendance.forEach(d => {
      if (d.duration && d.duration !== '-') {
        const [h, m] = d.duration.split(':').map(Number);
        totalMinutes += (h * 60) + m;
        presentWorkingDays += 1;
      }
    });

    const totalHoursVal = (totalMinutes / 60);
    const totalHoursStr = totalHoursVal > 0 ? `${totalHoursVal.toFixed(2)} hours` : '0.00 hours';
    const avgHoursStr = presentWorkingDays > 0 ? `${(totalHoursVal / presentWorkingDays).toFixed(1)} hours` : '0.0 hours';

    return {
      employee: {
        name: record.name,
        employeeId: record.cfmsId,
        designation: record.designation,
        department: record.department,
        email: record.email,
      },
      period: { month, year },
      summary: {
        presentDays: record.presentDays,
        absentDays: record.absentDays,
        leaveDays: record.leaveDays,
        attendancePercentage: record.attendancePercentage,
      },
      statistics: {
        workingDays: record.totalWorkingDays,
        totalHoursWorked: totalHoursStr,
        averageHoursPerDay: avgHoursStr,
        holidays: record.holidayDays,
      },
      dailyAttendance,
    };
  }

  /**
   * Generates PDF for a single report.
   */
  async generatePdf(reportData) {
    const htmlContent = generateReportHTML(reportData);
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
      });
      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  /**
   * Generates PDF for consolidated reports, combining HTML pages.
   */
  async generateConsolidatedPdf(reportsDataList) {
    const combinedHtml = reportsDataList.map(data => generateReportHTML(data)).join('');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
      const page = await browser.newPage();
      await page.setContent(combinedHtml, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
      });
      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }
}

export const reportService = new ReportService();
export default reportService;
