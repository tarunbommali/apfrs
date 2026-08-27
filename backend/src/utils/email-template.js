// backend/src/utils/email-template.js
/**
 * Professional HTML Email Template Generator for JNTU-GV APFRS Monthly Attendance Reports
 * Adapted from core/email/templates.js & styles.js with university branding and performance metrics.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Get performance colors based on attendance percentage
 */
export const getPerformanceColor = (percentage) => {
  const pct = parseFloat(percentage) || 0;
  if (pct >= 90) return { bg: '#ecfdf5', border: '#10b981', text: '#059669', badgeBg: '#d1fae5', label: 'Excellent' };
  if (pct >= 75) return { bg: '#eff6ff', border: '#3b82f6', text: '#2563eb', badgeBg: '#dbeafe', label: 'Satisfactory' };
  if (pct >= 50) return { bg: '#fffbeb', border: '#f59e0b', text: '#d97706', badgeBg: '#fef3c7', label: 'Average' };
  return { bg: '#fef2f2', border: '#ef4444', text: '#dc2626', badgeBg: '#fee2e2', label: 'Needs Attention' };
};

/**
 * Get performance remark based on attendance percentage
 */
export const getPerformanceRemark = (percentage, name) => {
  const pct = parseFloat(percentage) || 0;
  const firstName = name?.split(' ')[0] || 'The faculty member';

  if (pct >= 90) {
    return `Excellent attendance record! ${firstName} has maintained outstanding presence throughout the academic month.`;
  }
  if (pct >= 75) {
    return `Satisfactory performance. ${firstName} has met the institution attendance requirements.`;
  }
  if (pct >= 50) {
    return `Average attendance. ${firstName} is advised to regularize biometric punching for upcoming sessions.`;
  }
  return `Action required: Attendance falls below the minimum required threshold. Please verify punch logs or submit regularizations.`;
};

/**
 * Generate responsive HTML email content for a faculty attendance statement
 */
export const generateFacultyAttendanceEmailHTML = ({
  faculty = {},
  summary = {},
  periodLabel = '',
  config = {},
}) => {
  const presentDays = summary.presentDays ?? summary.present_days ?? summary.pDays ?? 0;
  const workingDays = summary.workingDays ?? summary.total_working_days ?? summary.wDays ?? (presentDays > 0 ? 27 : 0);
  const absentDays = summary.absentDays ?? summary.absent_days ?? summary.aDays ?? Math.max(0, workingDays - presentDays);
  const holidays = summary.holidays ?? 4;
  
  const percentage = summary.attendancePercentage ?? (workingDays > 0 ? ((presentDays / workingDays) * 100).toFixed(1) : 0);
  const colors = getPerformanceColor(percentage);
  const remark = getPerformanceRemark(percentage, faculty.name);

  const institutionName = config.institutionName || 'JNTU-GV College of Engineering Vizianagaram';
  const systemName = config.systemName || 'e-Office APFRS';
  const reportId = `APFRS-${faculty.cfmsId || faculty.employeeId || 'FAC'}-${Date.now().toString(36).toUpperCase()}`;
  const safePeriod = periodLabel || `${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monthly Attendance Statement - ${safePeriod}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; line-height: 1.5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04); overflow: hidden; border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85; font-weight: 700; margin-bottom: 6px;">
                ${systemName} • Attendance Statement
              </div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                ${institutionName}
              </h1>
              <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255,255,255,0.25); padding: 5px 16px; border-radius: 20px; margin-top: 14px;">
                <span style="color: #ffffff; font-size: 13px; font-weight: 600;">
                  📅 Statement Period: ${safePeriod}
                </span>
              </div>
            </td>
          </tr>
          
          <!-- Faculty Information Section -->
          <tr>
            <td style="padding: 24px 28px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px;">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                      👤 Faculty Profile Details
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="padding: 4px 0; vertical-align: top;">
                          <span style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600;">Full Name</span><br>
                          <strong style="color: #0f172a; font-size: 14px;">${faculty.name || 'Faculty Member'}</strong>
                        </td>
                        <td width="50%" style="padding: 4px 0; vertical-align: top;">
                          <span style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600;">CFMS / Employee ID</span><br>
                          <strong style="color: #0f172a; font-size: 14px; font-family: monospace;">${faculty.cfmsId || faculty.employeeId || 'N/A'}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding: 8px 0 0; vertical-align: top;">
                          <span style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600;">Designation</span><br>
                          <span style="color: #334155; font-size: 13px;">${faculty.designation || 'Faculty'}</span>
                        </td>
                        <td width="50%" style="padding: 8px 0 0; vertical-align: top;">
                          <span style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600;">Department</span><br>
                          <span style="color: #334155; font-size: 13px;">${faculty.department || 'Academic Department'}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Key Metrics Grid -->
          <tr>
            <td style="padding: 12px 28px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Present / Total Working Ratio -->
                  <td width="50%" style="padding-right: 8px;">
                    <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 10px; padding: 16px; text-align: center;">
                      <div style="font-size: 26px; font-weight: 800; color: #059669; font-family: monospace;">
                        ${presentDays} <span style="font-size: 16px; color: #64748b; font-weight: 400;">/ ${workingDays}</span>
                      </div>
                      <div style="font-size: 11px; color: #047857; text-transform: uppercase; font-weight: 700; margin-top: 4px; letter-spacing: 0.5px;">
                        Present / Working Days
                      </div>
                    </div>
                  </td>
                  <!-- Absent Days -->
                  <td width="50%" style="padding-left: 8px;">
                    <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 10px; padding: 16px; text-align: center;">
                      <div style="font-size: 26px; font-weight: 800; color: #dc2626; font-family: monospace;">
                        ${absentDays}
                      </div>
                      <div style="font-size: 11px; color: #b91c1c; text-transform: uppercase; font-weight: 700; margin-top: 4px; letter-spacing: 0.5px;">
                        Absent Days
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Overall Attendance Rate Card -->
          <tr>
            <td style="padding: 0 28px 24px;">
              <div style="background: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 12px; padding: 20px; text-align: center;">
                <div style="font-size: 42px; font-weight: 900; color: ${colors.text}; font-family: monospace; line-height: 1;">
                  ${percentage}%
                </div>
                <div style="display: inline-block; background: ${colors.badgeBg}; color: ${colors.text}; font-size: 12px; font-weight: 700; padding: 3px 12px; border-radius: 12px; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${colors.label} Rate
                </div>
                <p style="margin: 12px 0 0; color: #334155; font-size: 12px; line-height: 1.4;">
                  ${remark}
                </p>
              </div>
            </td>
          </tr>

          <!-- Calendar & Working Days Details Table -->
          <tr>
            <td style="padding: 0 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                    Total Working Days in Month
                  </td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #0f172a; text-align: right; font-family: monospace;">
                    ${workingDays} Days
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                    Official Calendar Holidays & Sundays
                  </td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #0f172a; text-align: right; font-family: monospace;">
                    ${holidays} Days
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 12px; color: #64748b;">
                    Official Biometric Status
                  </td>
                  <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #059669; text-align: right;">
                    Verified & Recorded
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Institutional Sign-off & Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 22px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px; color: #64748b; font-size: 11px; font-family: monospace;">
                Report Verification ID: <strong>${reportId}</strong>
              </p>
              <p style="margin: 0 0 6px; color: #64748b; font-size: 11px;">
                Generated automatically by APFRS Biometric Reporting Cell on ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 10px;">
                This is an officially dispatched institutional communication. For discrepancies, contact the Principal's Office / Establishment Section.
              </p>
            </td>
          </tr>
          
        </table>

        <p style="margin: 20px 0 0; color: #94a3b8; font-size: 11px; text-align: center;">
          © ${new Date().getFullYear()} ${institutionName}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * Generate plain text version for email clients without HTML support
 */
export const generateFacultyAttendanceEmailPlainText = ({
  faculty = {},
  summary = {},
  periodLabel = '',
  config = {},
}) => {
  const presentDays = summary.presentDays ?? summary.present_days ?? summary.pDays ?? 0;
  const workingDays = summary.workingDays ?? summary.total_working_days ?? summary.wDays ?? (presentDays > 0 ? 27 : 0);
  const absentDays = summary.absentDays ?? summary.absent_days ?? summary.aDays ?? Math.max(0, workingDays - presentDays);
  const percentage = summary.attendancePercentage ?? (workingDays > 0 ? ((presentDays / workingDays) * 100).toFixed(1) : 0);
  const institutionName = config.institutionName || 'JNTU-GV College of Engineering Vizianagaram';
  const safePeriod = periodLabel || `${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`;

  return `
${institutionName} - MONTHLY ATTENDANCE STATEMENT
Period: ${safePeriod}
${'='.repeat(60)}

FACULTY INFORMATION:
- Name: ${faculty.name || 'N/A'}
- CFMS ID: ${faculty.cfmsId || faculty.employeeId || 'N/A'}
- Designation: ${faculty.designation || 'N/A'}
- Department: ${faculty.department || 'N/A'}
- Email: ${faculty.email || 'N/A'}

ATTENDANCE SUMMARY:
- Present Days: ${presentDays} / ${workingDays} Working Days
- Absent Days: ${absentDays}
- Overall Attendance Rate: ${percentage}%

Report Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
${'='.repeat(60)}
This is an automated institutional notification from e-Office APFRS.
  `.trim();
};
