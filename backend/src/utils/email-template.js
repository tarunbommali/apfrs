// backend/src/utils/email-template.js
/**
 * Standalone HTML and plain text email templates for JNTUGV APFRS.
 */

/**
 * Generate responsive HTML email content for a faculty attendance statement
 */
export const generateFacultyAttendanceEmailHTML = ({
  report = {},
  monthName = '',
}) => {
  const employeeName = report.employee?.name || 'Faculty Member';
  const year = report.period?.year || new Date().getFullYear();
  const presentDays = report.summary?.presentDays ?? 0;
  const workingDays = report.statistics?.workingDays ?? 0;
  const attendanceRate = report.summary?.attendancePercentage ?? 0.0;
  const reportId = report.reportId || 'N/A';

  return `
<div style="font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; max-width: 560px; margin: 0 auto;">

  <p>Dear ${employeeName},</p>

  <p>
    Please find attached your attendance report for
    <strong>${monthName} ${year}</strong>.
  </p>

  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr>
      <td style="padding: 14px; background: #f0fdf4; border: 1px solid #bbf7d0; text-align: center;">
        <div style="font-size: 20px; font-weight: bold; color: #16a34a;">
          ${presentDays} / ${workingDays}
        </div>
        <div style="font-size: 11px; color: #4b5563; text-transform: uppercase; margin-top: 4px;">
          Present Days
        </div>
      </td>

      <td style="width: 12px;"></td>

      <td style="padding: 14px; background: #eff6ff; border: 1px solid #bfdbfe; text-align: center;">
        <div style="font-size: 20px; font-weight: bold; color: #2563eb;">
          ${attendanceRate}%
        </div>
        <div style="font-size: 11px; color: #4b5563; text-transform: uppercase; margin-top: 4px;">
          Attendance Rate
        </div>
      </td>
    </tr>
  </table>

  <p style="font-size: 13px; color: #4b5563;">
    The attached PDF contains the complete day-wise attendance details.
  </p>

  <p>
    Regards,<br>
    <strong>Digital Monitoring Cell</strong><br>
    JNTUGV College of Engineering, Vizianagaram
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

  <p style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">
    This is an automated attendance report.
  </p>

  <p style="font-size: 11px; color: #9ca3af; margin-top: 0;">
    Report ID: ${reportId}
  </p>

</div>
  `.trim();
};

/**
 * Generate plain text version for email clients without HTML support
 */
export const generateFacultyAttendanceEmailPlainText = ({
  report = {},
  monthName = '',
}) => {
  const employeeName = report.employee?.name || 'Faculty Member';
  const year = report.period?.year || new Date().getFullYear();
  const presentDays = report.summary?.presentDays ?? 0;
  const workingDays = report.statistics?.workingDays ?? 0;
  const attendanceRate = report.summary?.attendancePercentage ?? 0.0;
  const reportId = report.reportId || 'N/A';

  return `
Subject: Attendance Report — ${monthName} ${year}

Dear ${employeeName},

Please find attached your attendance report for ${monthName} ${year}.

Present Days: ${presentDays} / ${workingDays}
Attendance Rate: ${attendanceRate}%

The attached PDF contains the complete day-wise attendance details.

Regards,
Digital Monitoring Cell
JNTUGV College of Engineering, Vizianagaram

This is an automated attendance report.
Report ID: ${reportId}
  `.trim();
};
