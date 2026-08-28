// backend/src/utils/report-template.js
/**
 * Standalone, print-ready HTML template for attendance report.
 * Uses inline styles and standard page breaks for clean PDF layout.
 */
export const generateReportHTML = (reportData) => {
  const { employee, period, summary, statistics, dailyAttendance } = reportData;
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const safePeriod = `${MONTH_NAMES[period.month - 1]} ${period.year}`;

  const rowsHtml = dailyAttendance.map(d => {
    const isPresent = d.status === 'Present';
    const isAbsent = d.status === 'Absent';
    const isLeave = d.status === 'Leave' || d.status === 'L';
    const isWorkingStatus = isPresent || isAbsent || isLeave;
    const isNonWorking = !isWorkingStatus;

    const inTime = d.inTime || (isNonWorking ? d.status : '-');
    const outTime = d.outTime || (isNonWorking ? d.status : '-');
    const duration = d.duration || '-';

    return `
      <tr>
        <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">Day ${d.day}</td>
        <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${inTime}</td>
        <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${outTime}</td>
        <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0;">
          <span style="font-weight: 600; color: ${isPresent ? '#059669' : isAbsent ? '#dc2626' : '#64748b'}">
            ${d.status}
          </span>
        </td>
        <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${duration}</td>
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
    .page { page-break-after: always; position: relative; min-height: 250mm; box-sizing: border-box; }
    .page:last-child { page-break-after: avoid; }
    .header { background: linear-gradient(135deg, #5e6ad2 0%, #312e81 100%); color: white; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: 700; color: #5e6ad2; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 16px; margin-top: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .metric-card { text-align: center; border-radius: 8px; border: 1px solid #e2e8f0; padding: 12px; }
    .metric-val { font-size: 20px; font-weight: bold; font-family: monospace; }
    .table-container { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
    .table-container th { background: #5e6ad2; color: white; padding: 8px 12px; font-weight: 600; }
    .footer { position: absolute; bottom: 0; left: 0; right: 0; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: center; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.9; font-weight: bold;">APFRS Attendance Performance Report</div>
      <h1 style="margin: 4px 0 0 0; font-size: 22px;">JNTUGV College of Engineering Vizianagaram</h1>
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
        <div style="font-size: 11px; color: #64748b; font-weight: 600;">CFMS ID / Employee ID</div>
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
        <td style="padding: 10px 16px; text-align: right; font-weight: bold; font-family: monospace;">${statistics.totalHoursWorked}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
        <td style="padding: 10px 16px; color: #64748b;">Average Hours/Day</td>
        <td style="padding: 10px 16px; text-align: right; font-weight: bold; font-family: monospace;">${statistics.averageHoursPerDay}</td>
      </tr>
      <tr>
        <td style="padding: 10px 16px; color: #64748b;">Holidays & Sundays</td>
        <td style="padding: 10px 16px; text-align: right; font-weight: bold; font-family: monospace;">${statistics.holidays} Days</td>
      </tr>
    </table>

    <div class="footer" style="position: absolute; bottom: 0; left: 0; right: 0; font-size: 9px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: center; line-height: 1.4;">
      <strong>Digital Monitoring Cell</strong> | JNTUGV College of Engineering, Vizianagaram<br>
      Report ID: ${reportData.reportId} | Generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} | Automated attendance report<br>
      Page 1 of 2
    </div>
  </div>

  <div class="page">
    <div class="section-title" style="margin-top: 10px;">Day-wise Attendance Breakdown</div>
    <table class="table-container">
      <thead>
        <tr>
          <th style="padding: 6px 8px;">Day</th>
          <th style="padding: 6px 8px;">In Time</th>
          <th style="padding: 6px 8px;">Out Time</th>
          <th style="padding: 6px 8px;">Status</th>
          <th style="padding: 6px 8px;">Duration</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>
  `;
};
