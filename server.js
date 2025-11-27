/* eslint-env node */
import process from 'node:process';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import portfinder from 'portfinder';

dotenv.config();

const app = express();
const PORT = process.env.SMTP_SERVER_PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const normalizeCredential = (value = '', { stripAllSpaces = false } = {}) => {
  if (value == null) return '';
  const str = typeof value === 'string' ? value : String(value);
  const trimmed = str.trim();
  return stripAllSpaces ? trimmed.replace(/\s+/g, '') : trimmed;
};

const normalizeSMTPConfig = (config = {}) => {
  return {
    host: normalizeCredential(config.host),
    port: normalizeCredential(config.port),
    email: normalizeCredential(config.email),
    password: normalizeCredential(config.password, { stripAllSpaces: true }),
    security: config.security || 'tls'
  };
};

const getEnvSMTPDefaults = () => {
  return normalizeSMTPConfig({
    host: process.env.SMTP_HOST || process.env.VITE_SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || process.env.VITE_SMTP_PORT || '587',
    email: process.env.SMTP_EMAIL || process.env.VITE_SMTP_EMAIL || '',
    password: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.VITE_SMTP_PASSWORD || '',
    security: process.env.SMTP_SECURITY || process.env.VITE_SMTP_SECURITY || 'tls'
  });
};

const mergeSMTPConfig = (primary = {}, fallback = {}) => {
  const normalizedPrimary = normalizeSMTPConfig(primary);
  const normalizedFallback = normalizeSMTPConfig(fallback);
  return {
    host: normalizedPrimary.host || normalizedFallback.host,
    port: normalizedPrimary.port || normalizedFallback.port,
    email: normalizedPrimary.email || normalizedFallback.email,
    password: normalizedPrimary.password || normalizedFallback.password,
    security: normalizedPrimary.security || normalizedFallback.security || 'tls'
  };
};

const buildTransportOptions = (config) => {
  const port = Number(config.port) || 587;
  const useSSL = config.security === 'ssl' || port === 465;
  const requireTLS = config.security === 'tls';

  return {
    host: config.host,
    port,
    secure: useSSL,
    auth: {
      user: config.email,
      pass: config.password
    },
    tls: requireTLS ? { rejectUnauthorized: false } : undefined,
    connectionTimeout: 1000 * 20
  };
};

const validatePayload = (body) => {
  if (!body || typeof body !== 'object') return 'Missing request body';
  const { emailData } = body;
  if (!emailData) return 'Email data missing';
  const requiredEmailFields = ['to', 'subject', 'html'];
  for (const field of requiredEmailFields) {
    if (!emailData[field]) return `Email field "${field}" is required`;
  }
  return null;
};

const mapSMTPError = (error) => {
  if (!error) {
    return {
      status: 500,
      message: 'Unknown error while sending email'
    };
  }

  if (error.code === 'EAUTH' || error.responseCode === 535) {
    return {
      status: 401,
      message: 'SMTP authentication failed. Verify the email address and app password.',
      hint: 'Gmail requires 2FA and an app password. Visit https://support.google.com/mail/?p=BadCredentials to resolve the 535 error.'
    };
  }

  if (error.code === 'ENOTFOUND' || error.code === 'ECONNECTION') {
    return {
      status: 502,
      message: 'Unable to reach the SMTP host. Check the host name, port, and network connectivity.'
    };
  }

  if (error.code === 'ETIMEDOUT') {
    return {
      status: 504,
      message: 'Connection to the SMTP server timed out. Verify the port/security combo and firewall rules.'
    };
  }

  return {
    status: 500,
    message: error.message || 'Failed to send email'
  };
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/send-email', async (req, res) => {
  console.log('📧 Email send request received:', {
    config: {
      host: req.body.config?.host,
      port: req.body.config?.port,
      email: req.body.config?.email,
      passwordLength: req.body.config?.password?.length,
      security: req.body.config?.security
    },
    emailData: {
      to: req.body.emailData?.to,
      subject: req.body.emailData?.subject
    }
  });

  const validationError = validatePayload(req.body);
  if (validationError) {
    console.log('❌ Validation error:', validationError);
    return res.status(400).json({ success: false, message: validationError });
  }

  const { config = {}, emailData } = req.body;
  const mergedConfig = mergeSMTPConfig(config, getEnvSMTPDefaults());
  
  console.log('🔧 Merged SMTP config:', {
    host: mergedConfig.host,
    port: mergedConfig.port,
    email: mergedConfig.email,
    passwordLength: mergedConfig.password?.length,
    security: mergedConfig.security
  });

  const missingField = ['host', 'port', 'email', 'password'].find((field) => !mergedConfig[field]);
  if (missingField) {
    console.log('❌ Missing field:', missingField);
    return res.status(400).json({ success: false, message: `SMTP config field "${missingField}" is required` });
  }

  try {
    const transporterOptions = buildTransportOptions(mergedConfig);
    console.log('🚀 Creating transporter with options:', {
      host: transporterOptions.host,
      port: transporterOptions.port,
      secure: transporterOptions.secure,
      authUser: transporterOptions.auth.user
    });

    const transporter = nodemailer.createTransport(transporterOptions);

    console.log('🔐 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');

    const mailOptions = {
      from: emailData.from || `"Attendance System" <${mergedConfig.email}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text || '',
      replyTo: emailData.replyTo || mergedConfig.email
    };

    console.log('📤 Sending email to:', emailData.to);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      accepted: info.accepted
    });
  } catch (error) {
    console.error('❌ SMTP send failed:', {
      error: error.message,
      code: error.code,
      responseCode: error.responseCode,
      command: error.command
    });
    
    const mappedError = mapSMTPError(error);
    res.status(mappedError.status).json({
      success: false,
      message: mappedError.message,
      error: error.message,
      hint: mappedError.hint,
      code: error.code
    });
  }
});

portfinder.basePort = PORT;
portfinder.getPort((err, port) => {
  if (err) {
    console.error('❌ Could not find an open port:', err);
    process.exit(1);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 SMTP relay server listening on port ${port}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📧 Default SMTP host: ${getEnvSMTPDefaults().host}`);
  });
});