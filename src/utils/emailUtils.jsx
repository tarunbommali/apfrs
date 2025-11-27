/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
      const parsed = JSON.parse(savedConfig);
      // Basic validation to ensure it's a plausible object
      if (parsed && typeof parsed === 'object' && parsed.host) {
        console.log('📧 Loaded SMTP config from localStorage:', {
          host: parsed.host,
          port: parsed.port,
          user: mask(parsed.user),
          secure: parsed.secure
        });
        return parsed;
      }
      console.warn('⚠️ Invalid saved SMTP config, removing...');
      localStorage.removeItem('smtpConfig');
    }
  } catch (err) {
    console.error('❌ Error loading SMTP config:', err);
  }

  // Fallback to environment variables if nothing in localStorage
  const envConfig = {
    host: import.meta.env.VITE_SMTP_HOST || '',
    port: import.meta.env.VITE_SMTP_PORT || '587',
    secure: import.meta.env.VITE_SMTP_SECURE !== 'false', // default to true
    user: import.meta.env.VITE_SMTP_USER || '',
    pass: import.meta.env.VITE_SMTP_PASS || '',
    subject: import.meta.env.VITE_SMTP_SUBJECT || 'APFRS Attendance Report',
    testRecipient: import.meta.env.VITE_SMTP_TEST_RECIPIENT || '',
  };

  if (envConfig.host) {
    console.log('📧 Using environment SMTP config:', {
      host: envConfig.host,
      port: envConfig.port,
      user: mask(envConfig.user),
      secure: envConfig.secure
    });
    return envConfig;
  }

  return null; // Return null if no config is found
};

export const validateSMTPConfig = (config) => {
  if (!config) return { isValid: false, error: 'Configuration is missing.' };
  
  const requiredFields = ['host', 'port', 'user', 'pass'];
  for (const field of requiredFields) {
    if (!config[field]) {
      return { isValid: false, error: `Missing required field: ${field}` };
    }
  }
  
  return { isValid: true };
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

// Helper function to get performance status
const getPerformanceStatus = (percentage) => {
  if (percentage >= 75) return 'Excellent';
  if (percentage >= 50) return 'Good';
  return 'Needs Improvement';
};

// Helper function to get status color (RGB)
const getStatusColor = (percentage) => {
  if (percentage >= 75) return [5, 150, 105]; // Green
  if (percentage >= 50) return [217, 119, 6]; // Yellow/Orange
  return [220, 38, 38]; // Red
};

// Generate PDF file from employee data with better error handling
export const generatePDFReport = (employee, summary, attendance = [], percentage) => {
  try {
    // Create new PDF document
    const doc = new jsPDF();
    
    // Add header with gradient background effect
    doc.setFillColor(79, 70, 229); // Indigo color
    doc.rect(0, 0, 210, 40, 'F');
    
    // Add title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Report', 105, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Monthly attendance summary — ${employee.name}`, 105, 22, { align: 'center' });
    
    // Add generation date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 28, { align: 'center' });
    
    let yPosition = 50;
    
    // Employee information section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Information', 14, yPosition);
    
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${employee.name}`, 20, yPosition);
    doc.text(`Employee ID: ${employee.cfmsId || 'N/A'}`, 20, yPosition + 6);
    doc.text(`Designation: ${employee.designation || 'N/A'}`, 20, yPosition + 12);
    doc.text(`Department: ${employee.department || 'N/A'}`, 20, yPosition + 18);
    
    yPosition += 30;
    
    // Summary statistics in a table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Summary', 14, yPosition);
    
    yPosition += 10;
    
    const summaryData = [
      ['Present Days', summary.presentDays, '31 days'],
      ['Absent Days', summary.absentDays, '31 days'],
      ['Total Hours', `${summary.totalHours} hours`, 'This month'],
      ['Attendance %', `${percentage}%`, getPerformanceStatus(percentage)]
    ];
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value', 'Details']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 60, halign: 'center' }
      }
    });
    
    yPosition = doc.lastAutoTable.finalY + 15;
    
    // Performance status
    const status = getPerformanceStatus(percentage);
    const statusColor = getStatusColor(percentage);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(`Performance Status: ${status}`, 14, yPosition);
    
    yPosition += 10;
    
    // Detailed attendance records - only if we have valid attendance data
    if (attendance && Array.isArray(attendance) && attendance.length > 0) {
      // Check if we need a new page
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Detailed Attendance Records', 14, yPosition);
      
      yPosition += 10;
      
      // Prepare attendance data for table
      const attendanceData = attendance.map(day => [
        day.date || day.day || '-',
        day.inTime || '-',
        day.outTime || '-',
        day.status || '-',
        day.duration || '-',
        day.hours || '-'
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'In Time', 'Out Time', 'Status', 'Duration', 'Hours']],
        body: attendanceData,
        theme: 'grid',
        headStyles: {
          fillColor: [55, 65, 81],
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 }
        },
        pageBreak: 'auto'
      });
    } else {
      // Add a note if no detailed attendance data is available
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('No detailed attendance records available for this period.', 14, yPosition);
    }
    
    // Add footer on each page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `APFRS Report System • Page ${i} of ${pageCount} • © ${new Date().getFullYear()} JNTU-GV College`,
        105,
        290,
        { align: 'center' }
      );
    }
    
    // Convert PDF to base64 using the correct method
    const pdfOutput = doc.output('arraybuffer');
    const uint8Array = new Uint8Array(pdfOutput);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64PDF = btoa(binaryString);

    console.log('📊 PDF generated successfully:', {
      filename: `attendance_report_${employee.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
      size: base64PDF.length,
      pages: pageCount
    });

    return {
      base64PDF,
      filename: `attendance_report_${employee.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    };
  } catch (error) {
    console.error('❌ Error generating PDF report:', error);
    // Return a minimal PDF in case of error
    const doc = new jsPDF();
    doc.text('Error generating attendance report', 20, 20);
    const pdfOutput = doc.output('arraybuffer');
    const uint8Array = new Uint8Array(pdfOutput);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64PDF = btoa(binaryString);
    
    return {
      base64PDF,
      filename: `attendance_report_${employee.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    };
  }
};

export const generateAttendanceReport = (employee, summary, percentage) => {
  const present = Number(summary.presentDays || 0);
  const daysInPeriod = 31;
  const calculatedPercentage = percentage || ((present / daysInPeriod) * 100).toFixed(1);
  const status = getPerformanceStatus(calculatedPercentage);
  const statusColor = calculatedPercentage >= 75 ? '#059669' : calculatedPercentage >= 50 ? '#d97706' : '#dc2626';

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
  .attachment-note { background: #e0f2fe; padding: 12px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #0284c7; }
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

      <div class="attachment-note">
        <strong>📎 PDF Report Attached</strong>
        <p style="margin: 6px 0 0; color: #0c4a6e;">
          A detailed PDF report with complete attendance data in table format is attached to this email.
        </p>
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
          <div class="value" style="color:${statusColor};">${calculatedPercentage}%</div>
          <div style="font-size:12px; color:#6b7280; margin-top:6px;">monthly average</div>
        </div>
      </div>

      <div class="section" style="background:#f1f5f9; padding:12px; border-radius:8px;">
        <strong>Summary</strong>
        <p style="margin:8px 0 0; color:#334155;">
          ${employee.name} has recorded ${calculatedPercentage}% attendance this month (${summary.presentDays} present, ${summary.absentDays} absent). Total working hours: ${summary.totalHours} hours.
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
    text: generatePlaintextFromSummary(employee, summary, calculatedPercentage) + '\n\n📎 A PDF file with detailed attendance data in table format is attached to this email.',
    subject: `Attendance Report — ${employee.name} (${new Date().toLocaleDateString()})`,
    percentage: calculatedPercentage
  };
};

// Updated sendEmail function with better attachment logging
export const sendEmail = async (payload) => {
  // ALWAYS get fresh config from localStorage
  const config = getSMTPConfig();

  if (!validateSMTPConfig(config).isValid) {
    throw new Error('SMTP configuration is missing or incomplete. Please configure SMTP credentials.');
  }

  const { recipients, subject, body, isHtml, attachments } = payload;

  const fromAddress = `"APFRS Reports" <${config.user}>`;
  const replyToAddress = config.user;

  // Log attachment details for debugging
  console.log('📎 Attachment details:', {
    hasAttachments: attachments ? attachments.length : 0,
    attachments: attachments ? attachments.map(a => ({
      filename: a.filename,
      size: a.content ? a.content.length : 0,
      type: a.contentType
    })) : []
  });

  const emailPayload = {
    config: {
      host: config.host,
      port: Number(config.port),
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    },
    emailData: {
      from: fromAddress,
      to: recipients.map(r => r.email),
      subject,
      html: isHtml ? body : undefined,
      text: !isHtml ? body : undefined,
      replyTo: replyToAddress,
      attachments: attachments || [],
    },
  };

  console.log('📧 Sending email request:', {
    to: recipients.map(r => r.email),
    subject,
    from: fromAddress,
    smtpHost: config.host,
    smtpPort: config.port,
    smtpUser: mask(config.user),
    hasPassword: !!config.pass,
    hasAttachments: attachments ? attachments.length : 0,
    attachmentDetails: attachments ? attachments.map(a => a.filename) : []
  });

  const res = await sendRequestWithRetry(`${EMAIL_API_BASE_URL}/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emailPayload),
  });

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

// Updated sendIndividualReport function with proper PDF generation
export const sendIndividualReport = async (employee) => {
  console.log(`📤 Sending individual report to: ${employee.name} <${employee.email}>`);
  const summary = calculateSummary(employee);
  const percentage = ((summary.presentDays / 31) * 100).toFixed(1);
  
  // Generate PDF attachment - pass employee.attendance as the third parameter
  const pdfReport = generatePDFReport(employee, summary, employee.attendance || [], percentage);
  
  // Generate email content
  const { html, text, subject } = generateAttendanceReport(employee, summary, percentage);
  
  console.log('📊 Generated PDF report:', {
    filename: pdfReport.filename,
    size: pdfReport.base64PDF.length,
    employee: employee.name
  });

  return await sendEmail({
    recipients: [{ email: employee.email, name: employee.name }],
    subject,
    body: html,
    isHtml: true,
    attachments: [
      {
        filename: pdfReport.filename,
        content: pdfReport.base64PDF,
        encoding: 'base64',
        contentType: 'application/pdf',
      },
    ],
  });
};

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

// Utility function to send email with custom PDF attachment
export const sendEmailWithPDFAttachment = async (to, subject, htmlContent, pdfData, options = {}) => {
  const pdfReport = generatePDFReport(
    options.employee || { name: 'Employee' },
    options.summary || { presentDays: 0, absentDays: 0, totalHours: '0' },
    pdfData,
    options.percentage || '0'
  );

  return await sendEmail({
    recipients: [{ email: to }],
    subject,
    body: htmlContent,
    isHtml: true,
    attachments: [
      {
        filename: pdfReport.filename,
        content: pdfReport.base64PDF,
        encoding: 'base64',
        contentType: 'application/pdf',
      },
    ],
  });
};

// Test email function
export const sendTestEmail = async (testRecipient = null) => {
  const config = getSMTPConfig();
  if (!validateSMTPConfig(config).isValid) {
    throw new Error('SMTP configuration is missing or incomplete.');
  }

  const recipient = testRecipient || config.testRecipient || config.user;
  if (!recipient) {
    throw new Error('No test recipient specified and no default test recipient found in configuration.');
  }

  console.log(`🧪 Sending test email to: ${recipient}`);

  const testEmployee = {
    name: 'Test User',
    email: recipient,
    cfmsId: 'TEST001',
    department: 'Testing',
    designation: 'Test Role',
    attendance: [
      {
        date: '2024-01-01',
        inTime: '09:00',
        outTime: '17:00',
        status: 'Present',
        duration: '8 hours',
        hours: '8.0'
      }
    ]
  };

  return await sendIndividualReport(testEmployee);
};