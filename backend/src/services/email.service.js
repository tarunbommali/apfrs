// backend/src/services/email.service.js
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import db from '../config/database.js';
import { emailSettingsRepository } from '../repositories/email-settings.repository.js';

class EmailService {
  async getEffectiveSettings() {
    try {
      const dbSettings = await emailSettingsRepository.getSettings();
      if (dbSettings) return dbSettings;
    } catch (err) {
      logger.warn('Could not read email_settings from DB, using fallback defaults', { error: err.message });
    }

    return {
      active_provider: 'smtp',
      fallback_enabled: true,
      fallback_order: 'smtp_first',
      smtp_host: config.smtp?.host || process.env.SMTP_HOST || 'smtp.gmail.com',
      smtp_port: parseInt(config.smtp?.port || process.env.SMTP_PORT || '587', 10),
      smtp_encryption: 'tls',
      smtp_username: config.smtp?.user || process.env.SMTP_EMAIL || process.env.SMTP_USER || 'reports@jntugvcev.edu.in',
      smtp_password: config.smtp?.password || process.env.SMTP_PASSWORD || '',
      smtp_pool_size: 5,
      smtp_timeout: 30,
      resend_api_key: process.env.RESEND_API_KEY || '',
      resend_domain: 'notify.jntugvcev.edu.in',
      resend_tag: 'apfrs-monthly',
      from_name: 'Digital Monitoring Cell',
      from_email: config.smtp?.user || 'reports@jntugvcev.edu.in',
      reply_to: 'admin@apfrs.in',
      subject_template: 'Monthly Attendance Statement — {{month}} {{year}}',
      signature: '',
      retries: 3,
      batch_delay: 200,
      sandbox_mode: false,
    };
  }

  getTransporter(settings) {
    const host = settings.smtp_host || 'smtp.gmail.com';
    const port = parseInt(settings.smtp_port || 587, 10);
    const encryption = settings.smtp_encryption || 'tls';
    const isSecure = encryption === 'ssl' || port === 465;

    const transporterConfig = {
      host,
      port,
      secure: isSecure,
      auth: {
        user: settings.smtp_username,
        pass: settings.smtp_password,
      },
      connectionTimeout: (settings.smtp_timeout || 30) * 1000,
      greetingTimeout: 15000,
      socketTimeout: 25000,
      pool: (settings.smtp_pool_size || 5) > 1,
      maxConnections: settings.smtp_pool_size || 5,
    };

    if (port === 587 || encryption === 'tls') {
      transporterConfig.secure = false;
      transporterConfig.requireTLS = true;
    }

    return nodemailer.createTransport(transporterConfig);
  }

  async _sendViaSmtp(mailOptions, settings) {
    if (!settings.smtp_host || !settings.smtp_username) {
      throw new Error('SMTP host and username must be configured.');
    }
    if (!settings.smtp_password) {
      throw new Error('SMTP app password is not configured.');
    }

    const transporter = this.getTransporter(settings);
    const info = await transporter.sendMail(mailOptions);
    return {
      provider: 'smtp',
      messageId: info.messageId,
      response: info.response,
    };
  }

  async _sendViaResend(mailOptions, settings) {
    const apiKey = settings.resend_api_key || process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Resend API key is not configured.');
    }

    const payload = {
      from: mailOptions.from || `${settings.from_name || 'APFRS'} <${settings.from_email || 'onboarding@resend.dev'}>`,
      to: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
      subject: mailOptions.subject,
      html: mailOptions.html,
      text: mailOptions.text,
      reply_to: mailOptions.replyTo || settings.reply_to,
      tags: [{ name: 'category', value: settings.resend_tag || 'apfrs-monthly' }],
    };

    const timeoutMs = (settings.smtp_timeout || 30) * 1000;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Resend API error: ${res.statusText}`);
    }

    return {
      provider: 'resend',
      messageId: data.id,
      response: 'OK',
    };
  }

  async _logEmail({ emailId, batchId, recipientEmail, recipientName, subject, status, messageId, errorMessage, provider }) {
    try {
      await db.query(
        `INSERT INTO email_logs
           (id, email_id, batch_id, recipient_email, recipient_name, subject,
            status, message_id, error_message, sent_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           status        = VALUES(status),
           message_id    = VALUES(message_id),
           error_message = VALUES(error_message),
           sent_at       = VALUES(sent_at),
           updated_at    = NOW()`,
        [
          uuidv4(),
          emailId,
          batchId || null,
          recipientEmail,
          recipientName || null,
          subject || null,
          status,
          messageId || null,
          errorMessage || null,
          status === 'sent' ? new Date() : null,
        ]
      );
    } catch (err) {
      logger.error('Failed to write email_log', { emailId, error: err.message });
    }
  }

  // ── Dispatch single email with fallback ─────────────────────────────────────
  async sendEmail(emailData, customSettings = null) {
    const emailId = uuidv4();
    const settings = customSettings || (await this.getEffectiveSettings());
    const startTime = Date.now();

    // 1. Subject template formatting: {{month}} {{year}}
    let subject = emailData.subject || settings.subject_template || 'Monthly Attendance Statement — {{month}} {{year}}';
    if (emailData.month) subject = subject.replace(/\{\{month\}\}/g, String(emailData.month));
    if (emailData.year) subject = subject.replace(/\{\{year\}\}/g, String(emailData.year));

    // 2. Body signature formatting
    let html = emailData.html || '';
    let text = emailData.text || '';
    if (settings.signature && settings.signature.trim() && !emailData.skipSignature) {
      const escapedSig = settings.signature.trim();
      if (html && !html.includes(escapedSig)) {
        html += `<br><br><div style="white-space: pre-wrap; font-family: inherit; font-size: 13px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px;">${escapedSig.replace(/\n/g, '<br>')}</div>`;
      }
      if (text && !text.includes(escapedSig)) {
        text += `\n\n---\n${escapedSig}`;
      }
    }

    const fromAddress = `"${settings.from_name || 'APFRS Reports'}" <${settings.from_email || settings.smtp_username}>`;
    const mailOptions = {
      from: emailData.from || fromAddress,
      to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
      subject,
      html,
      text,
      replyTo: emailData.replyTo || settings.reply_to,
      attachments: emailData.attachments || [],
    };

    // 3. Test mode (Sandbox mode): Simulate success without dispatching
    if (settings.sandbox_mode) {
      logger.info('Sandbox mode enabled: Email not dispatched to live network', { to: mailOptions.to, subject });
      const fakeMsgId = `sandbox-${uuidv4().split('-')[0]}`;
      await this._logEmail({
        emailId,
        recipientEmail: mailOptions.to,
        subject: mailOptions.subject,
        status: 'sent',
        messageId: fakeMsgId,
        provider: 'sandbox',
      });
      return {
        success: true,
        messageId: fakeMsgId,
        providerUsed: 'sandbox',
        durationMs: Date.now() - startTime,
        emailId,
        timestamp: new Date().toISOString(),
      };
    }

    // 4. Primary and Fallback provider resolution
    const primary = settings.active_provider === 'resend' ? 'resend' : 'smtp';
    const fallback = primary === 'smtp' ? 'resend' : 'smtp';
    const fallbackEnabled = settings.fallback_enabled !== false;

    let result = null;
    let primaryError = null;
    let fallbackError = null;

    // Attempt Primary Provider
    try {
      if (primary === 'smtp') {
        result = await this._sendViaSmtp(mailOptions, settings);
      } else {
        result = await this._sendViaResend(mailOptions, settings);
      }
    } catch (err) {
      primaryError = err;
      logger.warn(`Primary email provider (${primary}) failed:`, { error: err.message });
    }

    // Attempt Fallback Provider if primary failed and fallback is enabled
    if (!result && fallbackEnabled) {
      logger.info(`Attempting automatic fallback to ${fallback}...`);
      try {
        if (fallback === 'smtp') {
          result = await this._sendViaSmtp(mailOptions, settings);
        } else {
          result = await this._sendViaResend(mailOptions, settings);
        }
      } catch (err) {
        fallbackError = err;
        logger.warn(`Fallback email provider (${fallback}) failed:`, { error: err.message });
      }
    }

    if (result) {
      await this._logEmail({
        emailId,
        recipientEmail: mailOptions.to,
        subject: mailOptions.subject,
        status: 'sent',
        messageId: result.messageId,
        provider: result.provider,
      });

      return {
        success: true,
        messageId: result.messageId,
        providerUsed: result.provider,
        durationMs: Date.now() - startTime,
        emailId,
        timestamp: new Date().toISOString(),
      };
    }

    // Both/Active failed
    let finalErrorMessage = primaryError?.message || 'Email delivery failed';
    if (fallbackEnabled && fallbackError) {
      finalErrorMessage = `Both email providers failed. Primary (${primary}): ${primaryError?.message || 'Failed'}; Fallback (${fallback}): ${fallbackError?.message || 'Failed'}`;
    }

    await this._logEmail({
      emailId,
      recipientEmail: Array.isArray(emailData.to) ? emailData.to.join(', ') : (emailData.to || ''),
      subject: mailOptions.subject,
      status: 'failed',
      errorMessage: finalErrorMessage,
      provider: primary,
    });

    throw new AppError(500, finalErrorMessage);
  }

  // ── Send Test Email (Uses unsaved form values without persisting) ────────────
  async sendTestEmail(recipientEmail, providerOverride = null, tempConfig = null) {
    const settings = await this.getEffectiveSettings();

    if (providerOverride && providerOverride !== 'all') {
      settings.active_provider = providerOverride;
      settings.fallback_enabled = false;
    }

    // Apply temporary unsaved credentials
    if (tempConfig) {
      if (tempConfig.activeProvider) settings.active_provider = tempConfig.activeProvider;
      if (tempConfig.fallbackEnabled !== undefined) settings.fallback_enabled = Boolean(tempConfig.fallbackEnabled);
      if (tempConfig.smtpHost) settings.smtp_host = tempConfig.smtpHost;
      if (tempConfig.smtpPort) settings.smtp_port = parseInt(tempConfig.smtpPort, 10);
      if (tempConfig.smtpEncryption) settings.smtp_encryption = tempConfig.smtpEncryption;
      if (tempConfig.smtpUsername) settings.smtp_username = tempConfig.smtpUsername;
      if (tempConfig.smtpPassword) settings.smtp_password = tempConfig.smtpPassword;
      if (tempConfig.smtpTimeout) settings.smtp_timeout = parseInt(tempConfig.smtpTimeout, 10);
      if (tempConfig.smtpPoolSize) settings.smtp_pool_size = parseInt(tempConfig.smtpPoolSize, 10);
      if (tempConfig.resendApiKey) settings.resend_api_key = tempConfig.resendApiKey;
      if (tempConfig.resendDomain) settings.resend_domain = tempConfig.resendDomain;
      if (tempConfig.resendTag) settings.resend_tag = tempConfig.resendTag;
      if (tempConfig.fromEmail) settings.from_email = tempConfig.fromEmail;
      if (tempConfig.fromName) settings.from_name = tempConfig.fromName;
      if (tempConfig.replyTo) settings.reply_to = tempConfig.replyTo;
      if (tempConfig.signature !== undefined) settings.signature = tempConfig.signature;
    }

    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <div style="background-color: #1e3a8a; padding: 16px; border-radius: 6px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">APFRS Email Delivery Test</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">Attendance & Faculty Reporting System</p>
        </div>
        <div style="padding: 20px 0; color: #334155;">
          <p>Hello Administrator,</p>
          <p>This is an automated test message confirming that your APFRS email configuration is active and capable of sending messages.</p>
          <div style="background: #f8fafc; padding: 14px; border-radius: 6px; font-size: 13px; font-family: monospace; border: 1px solid #e2e8f0; margin: 16px 0;">
            <strong>Provider Used:</strong> ${settings.active_provider?.toUpperCase() || 'SMTP'}<br>
            <strong>Sender:</strong> ${settings.from_name} &lt;${settings.from_email}&gt;<br>
            <strong>Timestamp:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST<br>
            <strong>Status:</strong> Ready for monthly attendance statements
          </div>
          <p style="font-size: 12px; color: #64748b;">If you received this message, attendance dispatching to faculty will function properly.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject: `[Test] APFRS Email Configuration — ${new Date().toLocaleTimeString()}`,
      html: testHtml,
      text: `APFRS Email Delivery Test successfully verified for ${recipientEmail}.`,
      skipSignature: false,
    }, settings);
  }

  // ── Bulk Email Dispatch ──────────────────────────────────────────────────────
  async sendBulkEmails(emails, customSettings = null) {
    const batchId = uuidv4();
    const settings = customSettings || (await this.getEffectiveSettings());
    const results = [];

    for (let i = 0; i < emails.length; i++) {
      const emailData = emails[i];
      const emailId = uuidv4();

      try {
        const res = await this.sendEmail(emailData, settings);
        results.push({
          emailId,
          success: true,
          messageId: res.messageId,
          provider: res.providerUsed,
          recipient: emailData.to,
          employeeId: emailData.employeeId,
          employeeName: emailData.employeeName,
        });
      } catch (err) {
        results.push({
          emailId,
          success: false,
          error: err.message,
          recipient: emailData.to,
          employeeId: emailData.employeeId,
          employeeName: emailData.employeeName,
        });
      }

      if (i < emails.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, settings.batch_delay || 200));
      }
    }

    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return {
      success: failedCount === 0,
      batchId,
      total: emails.length,
      sentCount,
      failedCount,
      results,
    };
  }
}

export const emailService = new EmailService();
export default emailService;
