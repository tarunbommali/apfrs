import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 8001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Email status tracking (in-memory for demo, can be extended to DB)
const emailStatusStore = new Map();

// Create reusable transporter
const createTransporter = (config) => {
  const smtpConfig = {
    host: config.host || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(config.port || process.env.SMTP_PORT || '587'),
    secure: config.secure || (config.port === '465'),
    auth: {
      user: config.user || config.email || process.env.SMTP_EMAIL,
      pass: config.pass || config.password || process.env.SMTP_PASSWORD,
    },
  };

  // Handle TLS settings
  if (smtpConfig.port === 587) {
    smtpConfig.secure = false;
    smtpConfig.requireTLS = true;
  }

  console.log('📧 Creating SMTP transporter:', {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    user: smtpConfig.auth.user?.substring(0, 3) + '***'
  });

  return nodemailer.createTransport(smtpConfig);
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'APFRS Email Service',
    timestamp: new Date().toISOString()
  });
});

// Send individual email
app.post('/api/send-email', async (req, res) => {
  const { config, emailData } = req.body;
  const emailId = uuidv4();

  try {
    console.log(`📤 Processing email request ${emailId}`);
    console.log('Recipients:', emailData.to);

    if (!emailData.to || emailData.to.length === 0) {
      throw new Error('No recipients specified');
    }

    const transporter = createTransporter(config || {});

    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    // Prepare email options
    const mailOptions = {
      from: emailData.from || `"APFRS Reports" <${config?.user || process.env.SMTP_EMAIL}>`,
      to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
      subject: emailData.subject || 'APFRS Attendance Report',
      html: emailData.html,
      text: emailData.text,
      replyTo: emailData.replyTo,
      attachments: emailData.attachments || []
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent successfully: ${info.messageId}`);

    // Store status
    emailStatusStore.set(emailId, {
      id: emailId,
      status: 'sent',
      messageId: info.messageId,
      recipients: emailData.to,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      messageId: info.messageId,
      emailId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Email send failed for ${emailId}:`, error.message);

    // Store failed status
    emailStatusStore.set(emailId, {
      id: emailId,
      status: 'failed',
      error: error.message,
      recipients: emailData?.to,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: error.message,
      emailId,
      hint: getErrorHint(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Send bulk emails
app.post('/api/send-bulk-emails', async (req, res) => {
  const { config, emails } = req.body;
  const batchId = uuidv4();

  console.log(`📨 Starting bulk email batch ${batchId} with ${emails?.length || 0} emails`);

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No emails provided',
      batchId
    });
  }

  const results = [];
  const transporter = createTransporter(config || {});

  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified for bulk send');
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `SMTP connection failed: ${error.message}`,
      batchId
    });
  }

  for (let i = 0; i < emails.length; i++) {
    const emailData = emails[i];
    const emailId = uuidv4();

    try {
      const mailOptions = {
        from: emailData.from || `"APFRS Reports" <${config?.user || process.env.SMTP_EMAIL}>`,
        to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
        subject: emailData.subject || 'APFRS Attendance Report',
        html: emailData.html,
        text: emailData.text,
        attachments: emailData.attachments || []
      };

      const info = await transporter.sendMail(mailOptions);

      results.push({
        emailId,
        success: true,
        messageId: info.messageId,
        recipient: emailData.to,
        employeeId: emailData.employeeId,
        employeeName: emailData.employeeName
      });

      console.log(`✅ [${i + 1}/${emails.length}] Sent to ${emailData.to}`);

      // Small delay between emails to avoid rate limiting
      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      results.push({
        emailId,
        success: false,
        error: error.message,
        recipient: emailData.to,
        employeeId: emailData.employeeId,
        employeeName: emailData.employeeName
      });

      console.error(`❌ [${i + 1}/${emails.length}] Failed for ${emailData.to}: ${error.message}`);
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`📊 Batch ${batchId} complete: ${successCount} sent, ${failCount} failed`);

  res.json({
    success: failCount === 0,
    batchId,
    summary: {
      total: emails.length,
      sent: successCount,
      failed: failCount
    },
    results,
    timestamp: new Date().toISOString()
  });
});

// Get email status
app.get('/api/email-status/:id', (req, res) => {
  const status = emailStatusStore.get(req.params.id);
  if (status) {
    res.json(status);
  } else {
    res.status(404).json({ error: 'Email status not found' });
  }
});

// Test SMTP connection
app.post('/api/test-smtp', async (req, res) => {
  const { config } = req.body;

  try {
    const transporter = createTransporter(config || {});
    await transporter.verify();

    res.json({
      success: true,
      message: 'SMTP connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      hint: getErrorHint(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function for error hints
function getErrorHint(error) {
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('auth') || message.includes('credentials')) {
    return 'Check your email credentials. For Gmail, use an App Password instead of your regular password.';
  }
  if (message.includes('timeout') || message.includes('connect')) {
    return 'Connection timeout. Check your SMTP host and port settings.';
  }
  if (message.includes('certificate') || message.includes('ssl')) {
    return 'SSL/TLS certificate issue. Try changing the secure/port settings.';
  }
  if (message.includes('rate') || message.includes('limit')) {
    return 'Rate limit exceeded. Wait a few minutes before sending more emails.';
  }
  
  return 'Check your SMTP configuration and ensure the server is accessible.';
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 APFRS Email Service running on port ${PORT}`);
  console.log(`📧 SMTP Host: ${process.env.SMTP_HOST || 'Not configured'}`);
  console.log(`📧 SMTP User: ${process.env.SMTP_EMAIL?.substring(0, 5) || 'Not configured'}***`);
});
