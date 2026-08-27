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
      logger.warn('Could not read email_settings from DB, using env config', { error: err.message });
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
      from_name: 'APFRS Reporting Cell',
      from_email: config.smtp?.user || 'reports@jntugvcev.edu.in',
      reply_to: 'admin@apfrs.in',
      subject_template: 'Monthly Attendance Statement — {{month}} {{year}}',
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

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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

  async _logEmail({ emailId, batchId, recipientEmail, recipientName, subject, status, messageId, errorMessage }) {
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

    const fromAddress = `"${settings.from_name || 'APFRS Reports'}" <${settings.from_email || settings.smtp_username}>`;
    const mailOptions = {
      from: emailData.from || fromAddress,
      to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
      subject: emailData.subject || 'APFRS Attendance Notification',
      html: emailData.html,
      text: emailData.text,
      replyTo: emailData.replyTo || settings.reply_to,
      attachments: emailData.attachments || [],
    };

    const fallbackOrder = settings.fallback_order || 'smtp_first';
    const fallbackEnabled = settings.fallback_enabled !== false;
    
    const hasSmtp = Boolean(settings.smtp_host && settings.smtp_username && settings.smtp_password);
    const hasResend = Boolean(settings.resend_api_key);

    let providerChain = [];
    if (fallbackOrder === 'resend_first') {
      if (hasResend) providerChain.push('resend');
      if (fallbackEnabled && hasSmtp) providerChain.push('smtp');
    } else {
      if (hasSmtp) providerChain.push('smtp');
      if (fallbackEnabled && hasResend) providerChain.push('resend');
    }

    // If neither was matched through configured check (e.g. initial testing), fall back to active provider
    if (providerChain.length === 0) {
      providerChain = [settings.active_provider || 'smtp'];
    }

    let lastError = null;
    let result = null;

    for (const provider of providerChain) {
      try {
        if (provider === 'smtp') {
          result = await this._sendViaSmtp(mailOptions, settings);
        } else if (provider === 'resend') {
          result = await this._sendViaResend(mailOptions, settings);
        }
        break; // Successfully sent
      } catch (err) {
        lastError = err;
        logger.warn(`Provider ${provider} failed:`, { error: err.message });
      }
    }

    if (result) {
      await this._logEmail({
        emailId,
        recipientEmail: mailOptions.to,
        subject: mailOptions.subject,
        status: 'sent',
        messageId: result.messageId,
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

    await this._logEmail({
      emailId,
      recipientEmail: Array.isArray(emailData.to) ? emailData.to.join(', ') : (emailData.to || ''),
      subject: emailData.subject,
      status: 'failed',
      errorMessage: lastError?.message || 'All providers failed',
    });

    throw new AppError(500, `Email dispatch failed: ${lastError?.message || 'All providers failed'}`);
  }

  // ── Send Test Email ──────────────────────────────────────────────────────────
  async sendTestEmail(recipientEmail, providerOverride = null, tempConfig = null) {
    const settings = await this.getEffectiveSettings();
    if (providerOverride) {
      settings.active_provider = providerOverride;
      settings.fallback_enabled = false;
    }
    if (tempConfig) {
      if (tempConfig.smtpHost) settings.smtp_host = tempConfig.smtpHost;
      if (tempConfig.smtpPort) settings.smtp_port = parseInt(tempConfig.smtpPort, 10);
      if (tempConfig.smtpEncryption) settings.smtp_encryption = tempConfig.smtpEncryption;
      if (tempConfig.smtpUsername) settings.smtp_username = tempConfig.smtpUsername;
      if (tempConfig.smtpPassword) settings.smtp_password = tempConfig.smtpPassword;
      if (tempConfig.resendApiKey) settings.resend_api_key = tempConfig.resendApiKey;
      if (tempConfig.fromEmail) settings.from_email = tempConfig.fromEmail;
      if (tempConfig.fromName) settings.from_name = tempConfig.fromName;
    }

    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 8px; background-color: #ffffff;">
        <div style="background-color: #1e3a8a; padding: 16px; border-radius: 6px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px;">e-Office APFRS Email Delivery Test</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">Attendance & Faculty Reporting System</p>
        </div>
        <div style="padding: 20px 0; color: #334155;">
          <p>Hello,</p>
          <p>This is an automated verification email confirming that your APFRS email delivery pipeline is operational.</p>
          <div style="background: #f8fafc; padding: 14px; border-radius: 6px; font-size: 13px; font-family: monospace; border: 1px solid #e2e8f0; margin: 16px 0;">
            <strong>Provider:</strong> ${providerOverride || settings.active_provider || 'SMTP (with fallback)'}<br>
            <strong>Sender:</strong> ${settings.from_name} &lt;${settings.from_email}&gt;<br>
            <strong>Timestamp:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST<br>
            <strong>Status:</strong> Handshake verified
          </div>
          <p style="font-size: 12px; color: #64748b;">If you received this message, attendance dispatching to faculty will function correctly.</p>
        </div>
      </div>
    `;

    const res = await this.sendEmail({
      to: recipientEmail,
      subject: `[Test] APFRS Email Configuration Verification — ${new Date().toLocaleTimeString()}`,
      html: testHtml,
      text: `e-Office APFRS Email Delivery Test verified for ${recipientEmail}.`,
    }, settings);

    return res;
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
      sent: sentCount,
      failed: failedCount,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Status lookup (DB-backed) ────────────────────────────────────────────────
  async getEmailStatus(id) {
    const rowsByEmailId = await db.query(
      `SELECT * FROM email_logs WHERE email_id = ? ORDER BY created_at DESC LIMIT 1`,
      [id]
    );
    if (rowsByEmailId.length > 0) return rowsByEmailId[0];

    const rowsByBatchId = await db.query(
      `SELECT
         batch_id                        AS batchId,
         COUNT(*)                        AS total,
         SUM(status = 'sent')            AS sent,
         SUM(status = 'failed')          AS failed,
         MAX(created_at)                 AS timestamp
       FROM email_logs
       WHERE batch_id = ?
       GROUP BY batch_id`,
      [id]
    );
    return rowsByBatchId[0] || null;
  }
}

export const emailService = new EmailService();
export default emailService;
