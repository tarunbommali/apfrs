/* eslint-disable no-undef */
import { getSMTPConfig, validateSMTPConfig, createSMTPEmailPayload } from './smtpConfig';
import { delay } from './utility';

const EMAIL_API_BASE_URL = import.meta.env.VITE_EMAIL_API_URL || 'https://api.apfrs.jntugv.in/api';
const DEFAULT_RETRY = 3;
const RETRY_BASE_MS = 800;

const sendRequestWithRetry = async (url, options = {}, retries = DEFAULT_RETRY) => {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      console.log(`📤 Attempt ${attempt + 1}/${retries + 1} to send attendance report`);
      const resp = await fetch(url, options);
      const json = await resp.json().catch(() => null);

      if (resp.ok && json && (json.success === undefined || json.success === true)) {
        console.log('✅ Attendance report sent successfully');
        return { ok: true, response: json };
      }

      const err = new Error(json?.message || `HTTP ${resp.status}`);
      err.status = resp.status;
      err.body = json;
      if (json?.hint) err.hint = json.hint;
      if (json?.error) err.serverError = json.error;
      throw err;
    } catch (err) {
      attempt += 1;
      const isRetryable = !err.status || (err.status >= 500 && err.status < 600);
      console.log(`❌ Attempt ${attempt} failed:`, { error: err.message, retryable: isRetryable });

      if (!isRetryable || attempt > retries) {
        throw err;
      }

      const backoff = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 200);
      console.log(`⏳ Retrying in ${backoff + jitter}ms...`);
      await delay(backoff + jitter);
    }
  }
  throw new Error('Retry attempts exhausted');
};

export const sendEmail = async (payload, configOverride = null) => {
  const config = configOverride || getSMTPConfig();

  const validation = validateSMTPConfig(config);
  if (!validation.isValid) {
    throw new Error(`SMTP configuration error: ${validation.error}`);
  }

  const { recipients, subject, body, isHtml, attachments } = payload;

  console.log('📎 Attachment details:', {
    hasAttachments: attachments ? attachments.length : 0,
    attachments: attachments ? attachments.map(a => ({
      filename: a.filename,
      size: a.content ? a.content.length : 0,
      type: a.contentType
    })) : []
  });

  const emailPayload = createSMTPEmailPayload(config, {
    recipients,
    subject,
    body,
    isHtml,
    attachments: attachments || []
  });

  console.log('📧 Sending attendance report:', {
    company: emailPayload.config.companyName,
    to: emailPayload.emailData.to,
    subject: emailPayload.emailData.subject,
    smtpHost: config.host,
    smtpPort: emailPayload.config.port,
    recipients: recipients.length,
    hasAttachments: attachments ? attachments.length : 0
  });

  const res = await sendRequestWithRetry(`${EMAIL_API_BASE_URL}/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emailPayload),
  });

  return res.response;
};

export const sendIndividualReport = async (employee, configOverride = null, monthNumber = 11, year = new Date().getFullYear()) => {
  console.log(`📤 Sending attendance report to: ${employee.name} <${employee.email}>`);

  if (!employee.email || !employee.email.includes('@')) {
    throw new Error(`Invalid email address for ${employee.name}: ${employee.email}`);
  }

  const config = configOverride || getSMTPConfig();

  // Calculate summary using attendanceUtils
  const summary = calculateSummaryForEmail(employee, monthNumber);

  // Generate report data
  const report = generateAttendanceReport(employee, summary, config, monthNumber, year);

  try {
    const result = await sendEmail({
      recipients: [{ email: employee.email, name: employee.name }],
      subject: report.subject,
      body: report.html,
      isHtml: true,
      attachments: [],
    }, configOverride);

    return {
      ...result,
      reportData: {
        employeeId: employee.cfmsId || employee.employeeId,
        reportId: report.reportId,
        percentage: report.percentage,
        attendanceMetrics: report.attendanceMetrics,
        workingDays: summary.workingDays,
        holidays: summary.holidays,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error(`❌ Failed to send report to ${employee.name}:`, error);
    throw error;
  }
};
