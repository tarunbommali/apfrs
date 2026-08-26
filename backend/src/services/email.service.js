// backend/src/services/email.service.js
import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import { v4 as uuidv4 } from 'uuid';

class EmailService {
  constructor() {
    this.emailStatusStore = new Map();
  }

  getTransporter(customConfig = null) {
    const smtp = customConfig || config.smtp;

    const resolveAuthValue = (primary, fallbackKeys = []) => {
      if (primary) return primary;
      for (const key of fallbackKeys) {
        if (key != null && key !== '') return key;
      }
      return undefined;
    };

    const authUser = resolveAuthValue(smtp?.user, [
      smtp?.email,
      smtp?.username,
      smtp?.authUser,
      process.env.SMTP_EMAIL,
      process.env.SMTP_USER,
    ]);

    const authPass = resolveAuthValue(smtp?.password, [
      smtp?.pass,
      smtp?.appPassword,
      smtp?.authPass,
      process.env.SMTP_PASSWORD,
      process.env.SMTP_PASS,
    ]);

    const port = parseInt(smtp?.port || process.env.SMTP_PORT || '587', 10);
    const host = smtp?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const isSecure = smtp?.secure !== undefined ? Boolean(smtp.secure) : port === 465;

    const transporterConfig = {
      host,
      port,
      secure: isSecure,
      auth: {
        user: authUser,
        pass: authPass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    };

    if (port === 587) {
      transporterConfig.secure = false;
      transporterConfig.requireTLS = true;
    }

    return nodemailer.createTransport(transporterConfig);
  }

  async sendEmail(emailData, customConfig = null) {
    const emailId = uuidv4();

    try {
      const transporter = this.getTransporter(customConfig);
      await transporter.verify();

      const senderEmail = customConfig?.user || customConfig?.email || config.smtp.user || 'admin@apfrs.in';
      const mailOptions = {
        from: emailData.from || `"APFRS Reports" <${senderEmail}>`,
        to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
        subject: emailData.subject || 'APFRS Attendance Notification',
        html: emailData.html,
        text: emailData.text,
        replyTo: emailData.replyTo,
        attachments: emailData.attachments || [],
      };

      const info = await transporter.sendMail(mailOptions);

      this.emailStatusStore.set(emailId, {
        id: emailId,
        status: 'sent',
        messageId: info.messageId,
        recipients: emailData.to,
        timestamp: new Date().toISOString(),
      });

      logger.info('Email sent successfully', { emailId, recipients: emailData.to, messageId: info.messageId });

      return {
        success: true,
        messageId: info.messageId,
        emailId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.emailStatusStore.set(emailId, {
        id: emailId,
        status: 'failed',
        error: error.message,
        recipients: emailData?.to,
        timestamp: new Date().toISOString(),
      });

      logger.error('Email send failed', { emailId, error: error.message });
      throw new AppError(500, `Email send failed: ${error.message}`);
    }
  }

  async sendBulkEmails(emails, customConfig = null) {
    const batchId = uuidv4();
    const results = [];

    try {
      const transporter = this.getTransporter(customConfig);
      await transporter.verify();

      const senderEmail = customConfig?.user || customConfig?.email || config.smtp.user || 'admin@apfrs.in';

      for (let i = 0; i < emails.length; i++) {
        const emailData = emails[i];
        const emailId = uuidv4();

        try {
          const mailOptions = {
            from: emailData.from || `"APFRS Reports" <${senderEmail}>`,
            to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
            subject: emailData.subject || 'APFRS Attendance Report',
            html: emailData.html,
            text: emailData.text,
            attachments: emailData.attachments || [],
          };

          const info = await transporter.sendMail(mailOptions);

          results.push({
            emailId,
            success: true,
            messageId: info.messageId,
            recipient: emailData.to,
            employeeId: emailData.employeeId,
            employeeName: emailData.employeeName,
          });

          if (i < emails.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 350));
          }
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
      }

      const sentCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      this.emailStatusStore.set(`batch-${batchId}`, {
        batchId,
        total: emails.length,
        sent: sentCount,
        failed: failedCount,
        results,
        timestamp: new Date().toISOString(),
      });

      return {
        success: failedCount === 0,
        batchId,
        total: emails.length,
        sent: sentCount,
        failed: failedCount,
        results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Bulk email transporter failure', { batchId, error: error.message });
      throw new AppError(500, `Bulk email connection error: ${error.message}`);
    }
  }

  async testConnection(customConfig = null) {
    try {
      const transporter = this.getTransporter(customConfig);
      await transporter.verify();
      return { success: true, message: 'SMTP connection verified successfully.' };
    } catch (error) {
      throw new AppError(500, `SMTP connection failed: ${error.message}`);
    }
  }

  getEmailStatus(id) {
    return this.emailStatusStore.get(id) || this.emailStatusStore.get(`batch-${id}`) || null;
  }
}

export const emailService = new EmailService();
export default emailService;
