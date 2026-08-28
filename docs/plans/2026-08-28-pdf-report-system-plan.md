# HTML-to-PDF Attendance Report and Dispatch System Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement a unified report system that renders a printable two-page HTML/CSS attendance statement, provides interactive browser previews, generates high-fidelity individual and consolidated PDFs on the server, and attaches individual PDFs during automated email dispatches.

**Architecture:** A unified report service on the backend compiles database metrics into an HTML/CSS string and generates PDF buffers using Puppeteer. Endpoints are exposed for previews and PDF downloads, and individual PDFs are injected directly into the existing background email dispatch job.

**Tech Stack:** Node.js, Express, React, TailwindCSS, Puppeteer, Nodemailer, MySQL

---

### Task 1: Create Backend Canonical Report Data Builder & Service

**Files:**
* Create: `backend/src/services/report.service.js`
* Create: `backend/src/utils/report-template.js`

**Step 1: Write report-template with CSS print styling**
Define a clean printable HTML template inside `backend/src/utils/report-template.js` with responsive cards, custom day-wise table formatting, and A4 page-break CSS constraints:
```javascript
export const generateReportHTML = (reportData) => {
  const { employee, period, summary, statistics, dailyAttendance } = reportData;
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const safePeriod = `${MONTH_NAMES[period.month - 1]} ${period.year}`;

  const rowsHtml = dailyAttendance.map(d => {
    const isWeekend = d.status === 'Weekend' || d.status === 'SS';
    const isHoliday = d.status === 'H';
    const inTime = d.inTime || (isWeekend ? 'Weekend' : isHoliday ? 'H' : '-');
    const outTime = d.outTime || (isWeekend ? 'Weekend' : isHoliday ? 'H' : '-');
    const duration = d.duration || '-';
    
    return `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">Day ${d.day}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${inTime}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${outTime}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">
          <span style="font-weight: 600; color: ${d.status === 'P' || d.status === 'Present' ? '#059669' : d.status === 'A' || d.status === 'Absent' ? '#dc2626' : '#64748b'}">
            ${d.status}
          </span>
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${duration}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.5; margin: 0; background: #ffffff; }
    .page { page-break-after: always; position: relative; height: 100%; box-sizing: border-box; }
    .page:last-child { page-break-after: avoid; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #312e81 100%); color: white; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: 700; color: #4f46e5; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .metric-card { text-align: center; border-radius: 8px; border: 1px solid #e2e8f0; padding: 12px; }
    .metric-val { font-size: 20px; font-weight: bold; font-family: monospace; }
    .table-container { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
    .table-container th { background: #4f46e5; color: white; padding: 8px 12px; font-weight: 600; }
    .footer { position: absolute; bottom: 0; left: 0; right: 0; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: center; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.9; font-weight: bold;">APFRS Attendance Performance Report</div>
      <h1 style="margin: 4px 0 0 0; font-size: 22px;">JNTUGV CEV</h1>
      <div style="margin-top: 10px; font-size: 13px; font-weight: 600; opacity: 0.95;">Statement Period: ${safePeriod}</div>
    </div>
    
    <div class="section-title">Employee Information</div>
    <div class="grid">
      <div class="info-card">
        <div style="font-size: 11px; color: #64748b; font-weight: 600;">Full Name</div>
        <div style="font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 2px;">${employee.name}</div>
        <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 12px;">Designation</div>
        <div style="font-size: 13px; color: #334155; margin-top: 2px;">${employee.designation}</div>
      </div>
      <div class="info-card">
        <div style="font-size: 11px; color: #64748b; font-weight: 600;">CFMS ID</div>
        <div style="font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 2px; font-family: monospace;">${employee.employeeId}</div>
        <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 12px;">Department</div>
        <div style="font-size: 13px; color: #334155; margin-top: 2px;">${employee.department}</div>
      </div>
    </div>
    
    <div class="section-title">Attendance Summary</div>
    <div class="metric-grid">
      <div class="metric-card" style="background: #ecfdf5; border-color: #10b981;">
        <div class="metric-val" style="color: #059669;">${summary.presentDays}</div>
        <div style="font-size: 9px; font-weight: bold; color: #047857; text-transform: uppercase; margin-top: 4px;">Present Days</div>
      </div>
      <div class="metric-card" style="background: #fef2f2; border-color: #ef4444;">
        <div class="metric-val" style="color: #dc2626;">${summary.absentDays}</div>
        <div style="font-size: 9px; font-weight: bold; color: #b91c1c; text-transform: uppercase; margin-top: 4px;">Absent Days</div>
      </div>
      <div class="metric-card" style="background: #fffbeb; border-color: #f59e0b;">
        <div class="metric-val" style="color: #d97706;">${summary.leaveDays}</div>
        <div style="font-size: 9px; font-weight: bold; color: #b45309; text-transform: uppercase; margin-top: 4px;">Leave Days</div>
      </div>
      <div class="metric-card" style="background: #eff6ff; border-color: #3b82f6;">
        <div class="metric-val" style="color: #2563eb;">${summary.attendancePercentage}%</div>
        <div style="font-size: 9px; font-weight: bold; color: #1d4ed8; text-transform: uppercase; margin-top: 4px;">Attendance Rate</div>
      </div>
    </div>

    <div class="section-title">Additional Statistics</div>
    <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
        <td style="padding: 10px 16px; color: #64748b;">Working Days</td>
        <td style="padding: 10px 16px; text-align: right; font-weight: bold; font-family: monospace;">${statistics.workingDays} Days</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 16px; color: #64748b;">Total Hours Worked</td>
        <td style="padding: 10px 16px; text-align: right; font-weight: bold; font-family: monospace;">${statistics.totalHoursWorked} hours</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
        <td style="padding: 10px 16px; color: #64748b;">Average Hours/Day</td>
        <td style="padding: 10px 16px; text-align: right; font-weight: bold; font-family: monospace;">${statistics.averageHoursPerDay} hours</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b;">Holidays & Sundays</td>
        <td style="padding: 10px 16px; text-align: right; font-weight: bold; font-family: monospace;">${statistics.holidays} Days</td>
      </tr>
    </table>

    <div class="footer">
      Generated on ${new Date().toLocaleDateString('en-IN')} | APFRS Biometric Reporting Cell | Page 1 of 2
    </div>
  </div>

  <div class="page">
    <div class="section-title" style="margin-top: 10px;">Day-wise Attendance Breakdown</div>
    <table class="table-container">
      <thead>
        <tr>
          <th>Day</th>
          <th>In Time</th>
          <th>Out Time</th>
          <th>Status</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
    <div class="footer">
      Generated on ${new Date().toLocaleDateString('en-IN')} | APFRS Biometric Reporting Cell | Page 2 of 2
    </div>
  </div>
</body>
</html>
  `;
};
```

**Step 2: Create report service with Puppeteer**
Install `puppeteer` package in backend and write `backend/src/services/report.service.js` to compile the template and render it to a PDF buffer:
```javascript
import puppeteer from 'puppeteer';
import { generateReportHTML } from '../utils/report-template.js';
import { monthlyAttendanceRepository } from '../repositories/monthly-attendance.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { AppError } from '../utils/errors.js';

class ReportService {
  async getReportData(cfmsId, month, year) {
    const recordsObj = await monthlyAttendanceRepository.getMonthlyAttendance(month, year);
    if (!recordsObj) {
      throw new AppError(404, `No attendance statement found for ${month}/${year}`);
    }

    const record = recordsObj.records.find(r => r.cfmsId === cfmsId);
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
    const totalHours = (totalMinutes / 60).toFixed(2);
    const avgHours = presentWorkingDays > 0 ? (totalHours / presentWorkingDays).toFixed(1) : '0.0';

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
        totalHoursWorked: `${totalHours} hours`,
        averageHoursPerDay: `${avgHours} hours`,
        holidays: record.holidayDays,
      },
      dailyAttendance,
    };
  }

  async generatePdf(reportData) {
    const htmlContent = generateReportHTML(reportData);
    const browser = await puppeteer.launch({
      headless: 'new',
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

  async generateConsolidatedPdf(reportsDataList) {
    const combinedHtml = reportsDataList.map(data => generateReportHTML(data)).join('');
    const browser = await puppeteer.launch({
      headless: 'new',
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
```

**Step 3: Commit**
```bash
git add backend/src/utils/report-template.js backend/src/services/report.service.js
git commit -m "feat(backend): implement report service and shared HTML template with print-page breaks"
```

---

### Task 2: Create Report Router & Middleware Authorization

**Files:**
* Modify: `backend/src/routes/admin.routes.js`
* Modify: `backend/src/routes/faculty.routes.js`

**Step 1: Install Puppeteer**
Run: `npm install puppeteer --prefix backend`
Expected: Install completes and adds package to backend.

**Step 2: Add endpoints to admin.routes.js**
Expose consolidated PDF download and administrative preview routes:
```javascript
// admin.routes.js:
import { reportService } from '../services/report.service.js';

router.get('/attendance/report/:cfmsId/preview', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const reportData = await reportService.getReportData(req.params.cfmsId, parseInt(month), parseInt(year));
    res.send(generateReportHTML(reportData));
  } catch (err) {
    next(err);
  }
});

router.get('/attendance/report/consolidated/pdf', async (req, res, next) => {
  try {
    const { month, year, cfmsIds } = req.query;
    const ids = String(cfmsIds).split(',');
    const reportsList = [];
    for (const id of ids) {
      try {
        const data = await reportService.getReportData(id, parseInt(month), parseInt(year));
        reportsList.push(data);
      } catch (err) {
        // Skip missing individual records in consolidated export
      }
    }
    if (reportsList.length === 0) {
      return res.status(404).json({ success: false, error: 'No matching faculty records found.' });
    }
    const pdf = await reportService.generateConsolidatedPdf(reportsList);
    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=APFRS_Attendance_Consolidated_${month}_${year}.pdf`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});
```

**Step 3: Add endpoint to faculty.routes.js**
Expose secure individual PDF download to authorized faculty:
```javascript
// faculty.routes.js:
import { reportService } from '../services/report.service.js';

router.get('/attendance/report/pdf', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const cfmsId = req.user.cfms_id;
    if (!cfmsId) {
      return res.status(400).json({ success: false, error: 'User does not possess a registered CFMS ID.' });
    }
    const reportData = await reportService.getReportData(cfmsId, parseInt(month), parseInt(year));
    const pdf = await reportService.generatePdf(reportData);
    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${cfmsId}-${year}-${month}.pdf`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});
```

**Step 4: Commit**
```bash
git add backend/src/routes/admin.routes.js backend/src/routes/faculty.routes.js
git commit -m "feat(backend): add report endpoints and faculty identity validation"
```

---

### Task 3: Hook PDF Seeding into Email Dispatch & Job Queue

**Files:**
* Modify: `backend/src/services/attendance.service.js` (lines 67-180)

**Step 1: Modify dispatchBatch in attendance.service.js**
* Inside `dispatchBatch`, compile each individual faculty report to PDF buffer.
* Attach the generated buffer to Nodemailer's attachments array:
```javascript
        const reportData = await reportService.getReportData(empId, record.month, record.year);
        const pdfBuffer = await reportService.generatePdf(reportData);
        
        emails.push({
          to: record.email,
          subject: emailTemplate?.subject || `Monthly Attendance Statement — ${periodLabel}`,
          html: `<p>Dear ${name},</p><p>Please find attached your Attendance Performance Report for ${periodLabel}.</p><p>Warm Regards,<br>APFRS Reporting Cell</p>`,
          text: `Dear ${name},\n\nPlease find attached your Attendance Performance Report for ${periodLabel}.\n\nRegards,\nAPFRS Reporting Cell`,
          employeeId: empId,
          employeeName: name,
          attachments: [
            {
              filename: `attendance-${empId}-${record.year}-${record.month}.pdf`,
              content: pdfBuffer,
            }
          ]
        });
```

**Step 2: Commit**
```bash
git add backend/src/services/attendance.service.js
git commit -m "feat(backend): attach generated individual report PDF buffer during email dispatch"
```

---

### Task 4: Align Frontend with Template Preview & Consolidated PDF Download

**Files:**
* Modify: `frontend/src/routes/reports.$month.$year.tsx`
* Modify: `frontend/src/routes/consolidated.tsx`

**Step 1: Add HTML report preview inside MonthReportPage**
Add a "Preview" dialog using an `iframe` pointed to the backend preview endpoint `/api/admin/attendance/report/:cfmsId/preview?month=X&year=Y` inside `MonthReportPage`.

**Step 2: Add consolidated PDF button in consolidated.tsx**
Add a "Download Consolidated PDF" button inside the Dispatch cokpit that requests `/api/admin/attendance/report/consolidated/pdf?month=X&year=Y&cfmsIds=ID1,ID2` for checked recipients.

**Step 3: Commit**
```bash
git add frontend/src/routes/reports.$month.$year.tsx frontend/src/routes/consolidated.tsx
git commit -m "feat(frontend): implement report preview dialog and consolidated PDF download button"
```

---

### Task 5: Compilation, Build, & Validation Check

**Step 1: Run Linting**
Run: `npm run lint --prefix frontend`
Expected: Passes with no ESLint errors.

**Step 2: Run Production Build**
Run: `npm run build --prefix frontend`
Expected: Compiles with 0 bundler errors.

**Step 3: Commit**
```bash
git commit -m "test(validation): verify frontend build and lint check passing"
```
