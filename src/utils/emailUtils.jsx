/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

const normalizeApiBase = (baseUrl) => {
  if (!baseUrl) return '/api';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const EMAIL_API_BASE_URL = normalizeApiBase(import.meta.env.VITE_EMAIL_API_URL);
const DEFAULT_RETRY = 3;
const RETRY_BASE_MS = 800;

const cleanValue = (value = '', { stripAllSpaces = false } = {}) => {
  if (value == null) return '';
  const str = typeof value === 'string' ? value : String(value);
  const trimmed = str.trim();
  return stripAllSpaces ? trimmed.replace(/\s+/g, '') : trimmed;
};

const normalizeSMTPConfig = (config = {}) => {
  return {
    host: cleanValue(config.host),
    port: cleanValue(config.port || ''),
    email: cleanValue(config.email),
    password: cleanValue(config.password, { stripAllSpaces: true }),
    security: config.security || 'tls'
  };
};

const hasSMTPFields = (config) => {
  if (!config) return false;
  const { host, port, email, password } = normalizeSMTPConfig(config);
  return !!host && !!port && !!email && !!password;
};

const mask = (value = '') => {
  if (!value) return '';
  if (value.includes('@')) {
    const parts = value.split('@');
    const u = parts[0];
    return u.length <= 2 ? `**@${parts[1]}` : `${u.slice(0, 2)}***@${parts[1]}`;
  }
  return value.length <= 4 ? '****' : `${value.slice(0, 2)}***${value.slice(-1)}`;
};

export const getSMTPConfig = () => {
  try {
    const savedConfig = localStorage.getItem('smtpConfig');
    if (savedConfig) {
      const parsed = normalizeSMTPConfig(JSON.parse(savedConfig));
      if (hasSMTPFields(parsed)) {
        console.log('📧 Loaded SMTP config from localStorage:', {
          host: parsed.host,
          port: parsed.port,
          email: mask(parsed.email),
          security: parsed.security
        });
        return parsed;
      }
      console.warn('⚠️ Invalid saved SMTP config, removing...');
      localStorage.removeItem('smtpConfig');
    }
  } catch (err) {
    console.error('❌ Error loading SMTP config:', err);
  }

  const envConfig = normalizeSMTPConfig({
    host: import.meta.env.VITE_SMTP_HOST || 'smtp.gmail.com',
    port: import.meta.env.VITE_SMTP_PORT || '587',
    email: import.meta.env.VITE_SMTP_EMAIL || '',
    password: import.meta.env.VITE_SMTP_PASSWORD || import.meta.env.VITE_SMTP_PASS || '',
    security: import.meta.env.VITE_SMTP_SECURITY || 'tls'
  });

  console.log('📧 Using environment SMTP config:', {
    host: envConfig.host,
    port: envConfig.port,
    email: mask(envConfig.email),
    security: envConfig.security
  });

  return envConfig;
};

export const validateSMTPConfig = (config) => {
  const isValid = hasSMTPFields(config);
  console.log('🔍 SMTP config validation:', { isValid, config: { ...config, password: mask(config.password) } });
  return isValid;
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const sendRequestWithRetry = async (url, options = {}, retries = DEFAULT_RETRY) => {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      console.log(`📤 Attempt ${attempt + 1}/${retries + 1} to send email`);
      const resp = await fetch(url, options);
      const json = await resp.json().catch(() => null);
      
      if (resp.ok && json && (json.success === undefined || json.success === true)) {
        console.log('✅ Email sent successfully');
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

const generatePlaintextFromSummary = (employee, summary, percentage) => {
  return [
    `Attendance Report — ${employee.name}`,
    `Employee ID: ${employee.cfmsId || 'N/A'}`,
    `Department: ${employee.department || 'N/A'}`,
    `Designation: ${employee.designation || 'N/A'}`,
    '',
    `Report Period: 31 days (full month)`,
    `Generated On: ${new Date().toLocaleString()}`,
    '',
    `Present Days: ${summary.presentDays}`,
    `Absent Days: ${summary.absentDays}`,
    `Total Hours: ${summary.totalHours} hours`,
    `Attendance Percentage: ${percentage}%`,
    '',
    `Summary: ${employee.name} has ${percentage}% attendance this month (${summary.presentDays} present, ${summary.absentDays} absent).`,
    '',
    `This is an automated attendance report generated by the APFRS Report System.`,
    `© ${new Date().getFullYear()} JNTU-GV College. All rights reserved.`,
  ].join('\n');
};

export const generateAttendanceReport = (employee, summary) => {
  const present = Number(summary.presentDays || 0);
  const daysInPeriod = 31;
  const percentage = ((present / daysInPeriod) * 100).toFixed(1);
  const status = percentage >= 75 ? 'Excellent' : percentage >= 50 ? 'Good' : 'Needs Improvement';
  const statusColor = percentage >= 75 ? '#059669' : percentage >= 50 ? '#d97706' : '#dc2626';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Attendance Report — ${employee.name}</title>
<style>
  body { font-family: system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial; margin: 0; background: #f7fafc; color: #0f172a; }
  .wrap { max-width: 680px; margin: 28px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 6px 18px rgba(15,23,42,0.06); }
  .header { padding: 28px; background: linear-gradient(90deg,#4f46e5,#7c3aed); color: #fff; text-align: center; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
  .header p { margin: 6px 0 0; opacity: 0.92; font-size: 13px; }
  .body { padding: 24px; }
  .meta { background: #f8fafc; border-left: 4px solid #4f46e5; padding: 14px; border-radius: 6px; margin-bottom: 18px; color: #1e293b; }
  .grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; margin: 10px 0 18px; }
  .card { background: #fff; padding: 14px; border-radius: 8px; border: 1px solid #e6edf3; text-align: center; }
  .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .6px; }
  .value { font-size: 22px; font-weight: 700; margin-top: 6px; color: #0f172a; }
  .status { display:inline-block; padding: 8px 14px; background: ${statusColor}; color: #fff; border-radius: 18px; font-weight: 600; font-size: 13px; }
  .section { margin-top: 18px; }
  .footer { padding: 18px; text-align: center; font-size: 12px; color: #64748b; background: #fbfdff; border-top: 1px solid #eef2f7; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Attendance Report</h1>
      <p>Monthly attendance summary — ${employee.name}</p>
    </div>
    <div class="body">
      <div class="meta">
        <strong>Employee:</strong> ${employee.name}<br/>
        <strong>ID:</strong> ${employee.cfmsId || 'N/A'} &nbsp; • &nbsp;
        <strong>Department:</strong> ${employee.department || 'N/A'} &nbsp; • &nbsp;
        <strong>Designation:</strong> ${employee.designation || 'N/A'}
      </div>

      <div style="text-align:center; margin-bottom: 12px;">
        <span class="status">${status} Performance</span>
      </div>

      <div class="grid">
        <div class="card">
          <div class="label">Present Days</div>
          <div class="value">${summary.presentDays}</div>
          <div style="font-size:12px; color:#6b7280; margin-top:6px;">of ${daysInPeriod} days</div>
        </div>
        <div class="card">
          <div class="label">Absent Days</div>
          <div class="value">${summary.absentDays}</div>
          <div style="font-size:12px; color:#6b7280; margin-top:6px;">of ${daysInPeriod} days</div>
        </div>
        <div class="card">
          <div class="label">Total Hours</div>
          <div class="value">${summary.totalHours}h</div>
          <div style="font-size:12px; color:#6b7280; margin-top:6px;">recorded this month</div>
        </div>
        <div class="card">
          <div class="label">Attendance %</div>
          <div class="value" style="color:${statusColor};">${percentage}%</div>
          <div style="font-size:12px; color:#6b7280; margin-top:6px;">monthly average</div>
        </div>
      </div>

      <div class="section" style="background:#f1f5f9; padding:12px; border-radius:8px;">
        <strong>Summary</strong>
        <p style="margin:8px 0 0; color:#334155;">
          ${employee.name} has recorded ${percentage}% attendance this month (${summary.presentDays} present, ${summary.absentDays} absent). Total working hours: ${summary.totalHours} hours.
        </p>
      </div>
    </div>

    <div class="footer">
      This is an automated attendance report generated by the APFRS Report System.
      <div style="margin-top:6px;">© ${new Date().getFullYear()} JNTU-GV College. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`;

  return {
    html,
    text: generatePlaintextFromSummary(employee, summary, percentage),
    subject: `Attendance Report — ${employee.name} (${new Date().toLocaleDateString()})`,
    percentage
  };
};

export const sendEmail = async (to, subject, htmlContent, employeeName = '', options = {}) => {
  // ALWAYS get fresh config from localStorage
  const config = getSMTPConfig();

  if (!validateSMTPConfig(config)) {
    throw new Error('SMTP configuration is missing or incomplete. Please configure SMTP credentials.');
  }

  const resolvedHtml = typeof htmlContent === 'string' ? htmlContent : htmlContent?.html;
  const resolvedText = typeof options.text === 'string' ? options.text : (typeof htmlContent === 'object' ? htmlContent?.text : undefined);

  if (!resolvedHtml) {
    throw new Error('Email template missing HTML content.');
  }

  const fromAddress = options.from || `"APFRS Reports" <${config.email}>`;
  const replyToAddress = options.replyTo || config.email;

  const payload = {
    config: {
      host: config.host,
      port: Number(config.port),
      email: config.email,
      password: config.password,
      security: config.security
    },
    emailData: {
      from: fromAddress,
      to,
      subject,
      html: resolvedHtml,
      text: resolvedText,
      replyTo: replyToAddress
    }
  };

  console.log('📧 Sending email request:', {
    to,
    subject,
    from: fromAddress,
    smtpHost: config.host,
    smtpPort: config.port,
    smtpUser: mask(config.email),
    hasPassword: !!config.password
  });

  const res = await sendRequestWithRetry(`${EMAIL_API_BASE_URL}/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, options.retries ?? DEFAULT_RETRY);

  return res.response;
};

// Import calculateSummary from your utils
const calculateSummary = (employee) => {
  // Your existing calculateSummary implementation
  const presentDays = employee.attendance?.filter(a => a.status === 'Present').length || 0;
  const absentDays = employee.attendance?.filter(a => a.status === 'Absent').length || 0;
  const totalHours = employee.attendance?.reduce((sum, a) => sum + (parseFloat(a.hours) || 0), 0) || 0;
  
  return {
    presentDays,
    absentDays,
    totalHours: totalHours.toFixed(1)
  };
};

// Convenience wrapper for individual reports
export const sendIndividualReport = async (employee) => {
  console.log(`📤 Sending individual report to: ${employee.name} <${employee.email}>`);
  const summary = calculateSummary(employee);
  const { html, text, subject, percentage } = generateAttendanceReport(employee, summary);
  const emailSubject = subject;
  return await sendEmail(employee.email, emailSubject, html, employee.name, { text });
};

// Bulk report sender
export const sendBulkReports = async (employees, onProgress = () => {}, concurrency = 1) => {
  console.log(`📧 Starting bulk email to ${employees.length} employees`);
  const results = [];
  const queue = [...employees];

  let active = 0;
  let index = 0;

  const next = async () => {
    if (queue.length === 0) return;
    const emp = queue.shift();
    const pos = ++index;
    onProgress({ current: pos, total: employees.length, employee: emp.name, status: 'sending' });

    try {
      if (!emp.email || emp.email === 'N/A') {
        throw new Error('No valid email address');
      }
      const r = await sendIndividualReport(emp);
      results.push({ employee: emp.name, email: emp.email, success: true, data: r });
      onProgress({ current: pos, total: employees.length, employee: emp.name, status: 'sent' });
    } catch (err) {
      results.push({ 
        employee: emp.name, 
        email: emp.email, 
        success: false, 
        error: err?.message || String(err),
        hint: err?.hint 
      });
      onProgress({ 
        current: pos, 
        total: employees.length, 
        employee: emp.name, 
        status: 'error', 
        error: err?.message || String(err) 
      });
    } finally {
      active -= 1;
      if (queue.length > 0) await next();
    }
  };

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => {
    active += 1;
    return next();
  });

  await Promise.allSettled(workers);
  console.log(`📧 Bulk email completed: ${results.filter(r => r.success).length}/${employees.length} successful`);
  return results;
};