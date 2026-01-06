/* eslint-disable no-unused-vars */
/**
 * Email Template Generator - Creates HTML email content for attendance reports
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Get performance color based on attendance percentage
 */
const getPerformanceColor = (percentage) => {
  const pct = parseFloat(percentage) || 0;
  if (pct >= 90) return { bg: '#ecfdf5', border: '#10b981', text: '#059669' };
  if (pct >= 75) return { bg: '#eff6ff', border: '#3b82f6', text: '#2563eb' };
  if (pct >= 50) return { bg: '#fffbeb', border: '#f59e0b', text: '#d97706' };
  return { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' };
};

/**
 * Get performance remark based on attendance percentage
 */
const getPerformanceRemark = (percentage, name) => {
  const pct = parseFloat(percentage) || 0;
  const firstName = name?.split(' ')[0] || 'The employee';

  if (pct >= 90) {
    return `Excellent performance! ${firstName} has maintained outstanding attendance this month.`;
  }
  if (pct >= 75) {
    return `Good performance. ${firstName} has maintained satisfactory attendance levels.`;
  }
  if (pct >= 50) {
    return `Average attendance. ${firstName} is encouraged to improve attendance for better performance.`;
  }
  return `Attention required. ${firstName}'s attendance needs significant improvement.`;
};

/**
 * Generate HTML email content for an attendance report
 * @param {Object} employee - Employee data
 * @param {Object} summary - Attendance summary
 * @param {Object} config - Email config
 * @param {string} periodLabel - Period label (e.g., "January 2025")
 * @returns {string} HTML content
 */
export const generateEmailHTML = (employee, summary, config, periodLabel) => {
  const colors = getPerformanceColor(summary.attendancePercentage);
  const companyName = config?.companyName || 'APFRS';
  const systemName = config?.systemName || 'Attendance System';
  const reportId = `${employee.cfmsId || 'EMP'}-${Date.now().toString(36).toUpperCase()}`;
  const safePeriodLabel = periodLabel && !periodLabel.toLowerCase().includes('undefined')
    ? periodLabel
    : `${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attendance Report - ${safePeriodLabel}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                ${companyName}
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                Attendance Performance Report
              </p>
              <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 6px 16px; border-radius: 20px; margin-top: 16px;">
                <span style="color: #ffffff; font-size: 13px; font-weight: 600;">
                  📅 ${safePeriodLabel}
                </span>
              </div>
            </td>
          </tr>
          
          <!-- Employee Info -->
          <tr>
            <td style="padding: 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 24px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 18px; font-weight: 700;">
                      👤 Employee Information
                    </h2>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600;">Name</span><br>
                          <span style="color: #1e293b; font-size: 16px; font-weight: 600;">${employee.name || 'N/A'}</span>
                        </td>
                        <td style="padding: 8px 0;">
                          <span style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600;">Employee ID</span><br>
                          <span style="color: #1e293b; font-size: 16px; font-weight: 600;">${employee.cfmsId || employee.employeeId || 'N/A'}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600;">Designation</span><br>
                          <span style="color: #1e293b; font-size: 14px;">${employee.designation || 'N/A'}</span>
                        </td>
                        <td style="padding: 8px 0;">
                          <span style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600;">Department</span><br>
                          <span style="color: #1e293b; font-size: 14px;">${employee.department || 'N/A'}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Attendance Metrics -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 18px; font-weight: 700;">
                📊 Attendance Summary
              </h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Present Days -->
                  <td width="33%" style="padding: 8px;">
                    <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 16px; text-align: center;">
                      <div style="font-size: 28px; font-weight: 800; color: #059669;">${summary.presentDays || 0}</div>
                      <div style="font-size: 11px; color: #047857; text-transform: uppercase; font-weight: 600; margin-top: 4px;">Present Days</div>
                    </div>
                  </td>
                  <!-- Absent Days -->
                  <td width="33%" style="padding: 8px;">
                    <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 12px; padding: 16px; text-align: center;">
                      <div style="font-size: 28px; font-weight: 800; color: #dc2626;">${summary.absentDays || 0}</div>
                      <div style="font-size: 11px; color: #b91c1c; text-transform: uppercase; font-weight: 600; margin-top: 4px;">Absent Days</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Attendance Percentage -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <div style="background: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 16px; padding: 24px; text-align: center;">
                <div style="font-size: 48px; font-weight: 800; color: ${colors.text};">
                  ${summary.attendancePercentage || 0}%
                </div>
                <div style="font-size: 14px; color: ${colors.text}; font-weight: 600; margin-top: 8px;">
                  Overall Attendance Rate
                </div>
              </div>
            </td>
          </tr>
          
          <!-- Additional Stats -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 13px;">Working Days</span>
                    <span style="float: right; color: #1e293b; font-weight: 700;">${summary.workingDays || 0}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 13px;">Total Hours Worked</span>
                    <span style="float: right; color: #1e293b; font-weight: 700;">${summary.totalHours || 0} hrs</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px;">
                    <span style="color: #64748b; font-size: 13px;">Holidays</span>
                    <span style="float: right; color: #1e293b; font-weight: 700;">${summary.holidays || 0}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 12px;">
                      Report ID: <strong>${reportId}</strong>
                    </p>
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 12px;">
                      Generated on ${new Date().toLocaleString()}
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                      This is an automated email from ${systemName}. Please do not reply.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
        <!-- Bottom Text -->
        <p style="margin: 24px 0 0; color: #94a3b8; font-size: 11px; text-align: center;">
          © ${new Date().getFullYear()} ${companyName}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * Generate plain text email content
 */
export const generateEmailPlainText = (employee, summary, config, periodLabel) => {
  const companyName = config?.companyName || 'APFRS';
  const reportId = `${employee.cfmsId || 'EMP'}-${Date.now().toString(36).toUpperCase()}`;
  const safePeriodLabel = periodLabel && !periodLabel.toLowerCase().includes('undefined')
    ? periodLabel
    : `${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`;

  return `
${companyName} - ATTENDANCE PERFORMANCE REPORT
${safePeriodLabel}
${'='.repeat(50)}

EMPLOYEE INFORMATION
--------------------
Name: ${employee.name || 'N/A'}
Employee ID: ${employee.cfmsId || employee.employeeId || 'N/A'}
Designation: ${employee.designation || 'N/A'}
Department: ${employee.department || 'N/A'}
Email: ${employee.email || 'N/A'}

ATTENDANCE SUMMARY
------------------
Present Days: ${summary.presentDays || 0}
Absent Days: ${summary.absentDays || 0}

Working Days: ${summary.workingDays || 0}
Total Hours: ${summary.totalHours || 0} hrs
Holidays: ${summary.holidays || 0}

ATTENDANCE RATE: ${summary.attendancePercentage || 0}%



${'='.repeat(50)}
Report ID: ${reportId}
Generated on: ${new Date().toLocaleString()}

This is an automated email. Please do not reply.
© ${new Date().getFullYear()} ${companyName}
  `.trim();
};

export default {
  generateEmailHTML,
  generateEmailPlainText
};
