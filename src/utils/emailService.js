/* eslint-disable no-undef */
import { getSMTPConfig, validateSMTPConfig, createSMTPEmailPayload } from './smtpConfig';
import { calculateSummary } from './attendanceCalculations';
import { generateEmailHTML } from './emailTemplateGenerator';
import { delay } from './utility';
import { setEmailSent, setEmailFailed, setEmailPending } from './emailStatusStore';
import { generatePDFBase64 } from './reportGenerator';

// Try local backend first, then fallback to external API
const getEmailApiUrl = () => {
  // Check if local backend is available
  const localBackend = 'http://localhost:8001/api';
  const externalApi = import.meta.env.VITE_EMAIL_API_URL || 'https://api.apfrs.jntugv.in/api';
  
  // We'll try local first in the send function
  return { local: localBackend, external: externalApi };
};

const DEFAULT_RETRY = 2;
const RETRY_BASE_MS = 800;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const sendRequestWithRetry = async (url, options = {}, retries = DEFAULT_RETRY) => {
  let attempt = 0;
  let lastError = null;
  
  while (attempt <= retries) {
    try {
      console.log(`📤 Attempt ${attempt + 1}/${retries + 1} to send attendance report`);
      const resp = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      const json = await resp.json().catch(() => null);

      if (resp.ok && json && (json.success === undefined || json.success === true)) {
        console.log('✅ Attendance report sent successfully');
        return { ok: true, response: json };
      }

      const err = new Error(json?.message || json?.error || `HTTP ${resp.status}`);
      err.status = resp.status;
      err.body = json;
      if (json?.hint) err.hint = json.hint;
      if (json?.error) err.serverError = json.error;
      throw err;
    } catch (err) {
      lastError = err;
      attempt += 1;
      const isRetryable = !err.status || (err.status >= 500 && err.status < 600) || err.name === 'AbortError';
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
  throw lastError || new Error('Retry attempts exhausted');
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

  const apis = getEmailApiUrl();
  let lastError = null;
  
  // Try local backend first
  try {
    console.log('📤 Trying local backend...');
    const res = await sendRequestWithRetry(`${apis.local}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload),
    }, 1);
    return res.response;
  } catch (localError) {
    console.log('⚠️ Local backend failed, trying external API...', localError.message);
    lastError = localError;
  }
  
  // Fallback to external API
  try {
    const res = await sendRequestWithRetry(`${apis.external}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload),
    });
    return res.response;
  } catch (externalError) {
    console.error('❌ Both local and external APIs failed');
    throw lastError || externalError;
  }
};

export const sendIndividualReport = async (employee, configOverride = null, monthNumber = 11, year = new Date().getFullYear()) => {
  console.log(`📤 Sending attendance report to: ${employee.name} <${employee.email}>`);
  
  const periodKey = `${year}-${String(monthNumber).padStart(2, '0')}`;

  if (!employee.email || !employee.email.includes('@')) {
    setEmailFailed(employee.email, periodKey, 'Invalid email address');
    throw new Error(`Invalid email address for ${employee.name}: ${employee.email}`);
  }

  // Set status to pending
  setEmailPending(employee.email, periodKey);

  const config = configOverride || getSMTPConfig();
  const periodLabel = `${MONTH_NAMES[monthNumber - 1]} ${year}`;

  // Calculate summary
  const summary = calculateSummary(employee, monthNumber, year);

  // Generate email HTML
  const emailHtml = generateEmailHTML(employee, summary, config, periodLabel);
  
  // Generate PDF attachment
  let pdfAttachment = null;
  try {
    const pdfBase64 = generatePDFBase64({
      employee,
      summary,
      month: monthNumber,
      year,
      periodLabel
    });
    
    pdfAttachment = {
      filename: `attendance_report_${employee.cfmsId || employee.name.replace(/\s+/g, '_')}_${year}_${monthNumber}.pdf`,
      content: pdfBase64,
      encoding: 'base64',
      contentType: 'application/pdf'
    };
  } catch (pdfError) {
    console.warn('⚠️ Could not generate PDF attachment:', pdfError.message);
  }

  const reportId = `${employee.cfmsId || 'EMP'}-${Date.now().toString(36).toUpperCase()}`;
  const subject = `${config?.subject || 'APFRS Attendance Report'} - ${periodLabel}`;

  try {
    const result = await sendEmail({
      recipients: [{ email: employee.email, name: employee.name }],
      subject,
      body: emailHtml,
      isHtml: true,
      attachments: pdfAttachment ? [pdfAttachment] : [],
    }, configOverride);

    // Update status to sent
    setEmailSent(employee.email, periodKey, { messageId: result?.messageId });

    return {
      ...result,
      reportData: {
        employeeId: employee.cfmsId || employee.employeeId,
        reportId,
        percentage: summary.attendancePercentage,
        workingDays: summary.workingDays,
        holidays: summary.holidays,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error(`❌ Failed to send report to ${employee.name}:`, error);
    
    // Update status to failed
    setEmailFailed(employee.email, periodKey, error.message);
    
    throw error;
  }
};

// Test SMTP connection
export const testSMTPConnection = async (config) => {
  const apis = getEmailApiUrl();
  
  try {
    const response = await fetch(`${apis.local}/test-smtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
      signal: AbortSignal.timeout(15000)
    });
    
    return await response.json();
  } catch (error) {
    console.error('SMTP test failed:', error);
    throw error;
  }
};
