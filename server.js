/* eslint-env node */
import process from 'node:process';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
const PORT = process.env.SMTP_SERVER_PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

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
  const { config, emailData } = body;
  if (!config) return 'SMTP config missing';
  if (!emailData) return 'Email data missing';
  const requiredConfigFields = ['host', 'port', 'email', 'password'];
  for (const field of requiredConfigFields) {
    if (!config[field]) return `SMTP config field "${field}" is required`;
  }
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
  const validationError = validatePayload(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const { config, emailData } = req.body;

  try {
    const transporter = nodemailer.createTransport(buildTransportOptions(config));

    // Ensure the credentials are correct before attempting to send
    await transporter.verify();

    const info = await transporter.sendMail({
      from: emailData.from || `"Attendance System" <${config.email}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      replyTo: emailData.replyTo || config.email
    });

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      accepted: info.accepted
    });
  } catch (error) {
    const mappedError = mapSMTPError(error);
    console.error('SMTP send failed:', error.message);
    res.status(mappedError.status).json({
      success: false,
      message: mappedError.message,
      error: error.message,
      hint: mappedError.hint
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SMTP relay server listening on port ${PORT}`);
});
