// backend/src/repositories/email-settings.repository.js
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

class EmailSettingsRepository {
  async ensureTables() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_settings (
        id VARCHAR(64) PRIMARY KEY,
        active_provider VARCHAR(32) DEFAULT 'smtp',
        fallback_enabled BOOLEAN DEFAULT TRUE,
        fallback_order VARCHAR(32) DEFAULT 'smtp_first',
        smtp_host VARCHAR(255) DEFAULT 'smtp.gmail.com',
        smtp_port INT DEFAULT 587,
        smtp_encryption VARCHAR(32) DEFAULT 'tls',
        smtp_username VARCHAR(255) DEFAULT 'reports@jntugvcev.edu.in',
        smtp_password TEXT,
        smtp_pool_size INT DEFAULT 5,
        smtp_timeout INT DEFAULT 30,
        resend_api_key TEXT,
        resend_domain VARCHAR(255) DEFAULT 'notify.jntugvcev.edu.in',
        resend_webhook_url VARCHAR(255) DEFAULT '',
        resend_tag VARCHAR(128) DEFAULT 'apfrs-monthly',
        from_name VARCHAR(255) DEFAULT 'APFRS Reporting Cell',
        from_email VARCHAR(255) DEFAULT 'reports@jntugvcev.edu.in',
        reply_to VARCHAR(255) DEFAULT 'admin@apfrs.in',
        subject_template VARCHAR(500) DEFAULT 'Monthly Attendance Statement — {{month}} {{year}}',
        signature TEXT,
        retries INT DEFAULT 3,
        batch_delay INT DEFAULT 200,
        sandbox_mode BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS email_config_logs (
        id VARCHAR(64) PRIMARY KEY,
        updated_by VARCHAR(255) NOT NULL,
        changed_fields JSON NOT NULL,
        summary TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  async getSettings() {
    await this.ensureTables();
    const rows = await db.query(`SELECT * FROM email_settings WHERE id = 'default' LIMIT 1`);
    if (rows.length === 0) {
      // Seed initial default record
      const defaultId = 'default';
      await db.query(
        `INSERT INTO email_settings (
          id, active_provider, fallback_enabled, fallback_order,
          smtp_host, smtp_port, smtp_encryption, smtp_username, smtp_password,
          resend_api_key, resend_domain, from_name, from_email, reply_to, subject_template
        ) VALUES (
          ?, 'smtp', 1, 'smtp_first',
          'smtp.gmail.com', 587, 'tls', 'reports@jntugvcev.edu.in', ?,
          ?, 'notify.jntugvcev.edu.in', 'APFRS Reporting Cell', 'reports@jntugvcev.edu.in', 'admin@apfrs.in', 'Monthly Attendance Statement — {{month}} {{year}}'
        )`,
        [defaultId, process.env.SMTP_PASSWORD || '', process.env.RESEND_API_KEY || '']
      );
      const inserted = await db.query(`SELECT * FROM email_settings WHERE id = 'default' LIMIT 1`);
      return inserted[0];
    }
    return rows[0];
  }

  async updateSettings(data, updatedBy = 'Admin') {
    await this.ensureTables();
    const current = await this.getSettings();

    // Detect changed fields for audit log
    const changedFields = [];
    const fieldsToCompare = [
      'active_provider', 'fallback_enabled', 'fallback_order',
      'smtp_host', 'smtp_port', 'smtp_encryption', 'smtp_username',
      'resend_domain', 'resend_tag', 'from_name', 'from_email', 'reply_to',
      'subject_template', 'sandbox_mode'
    ];

    for (const field of fieldsToCompare) {
      const dbKey = field;
      const camelKey = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      const newVal = data[camelKey] !== undefined ? data[camelKey] : data[dbKey];
      if (newVal !== undefined && String(newVal) !== String(current[dbKey])) {
        changedFields.push({ field, old: current[dbKey], new: newVal });
      }
    }

    if (data.smtpPassword && data.smtpPassword !== current.smtp_password) {
      changedFields.push({ field: 'smtp_password', old: '***', new: '*** (updated)' });
    }
    if (data.resendApiKey && data.resendApiKey !== current.resend_api_key) {
      changedFields.push({ field: 'resend_api_key', old: '***', new: '*** (updated)' });
    }

    const smtpPass = data.smtpPassword !== undefined && data.smtpPassword !== '' ? data.smtpPassword : current.smtp_password;
    const resendKey = data.resendApiKey !== undefined && data.resendApiKey !== '' ? data.resendApiKey : current.resend_api_key;

    await db.query(
      `UPDATE email_settings SET
        active_provider = ?,
        fallback_enabled = ?,
        fallback_order = ?,
        smtp_host = ?,
        smtp_port = ?,
        smtp_encryption = ?,
        smtp_username = ?,
        smtp_password = ?,
        smtp_pool_size = ?,
        smtp_timeout = ?,
        resend_api_key = ?,
        resend_domain = ?,
        resend_webhook_url = ?,
        resend_tag = ?,
        from_name = ?,
        from_email = ?,
        reply_to = ?,
        subject_template = ?,
        signature = ?,
        retries = ?,
        batch_delay = ?,
        sandbox_mode = ?,
        updated_at = NOW()
      WHERE id = 'default'`,
      [
        data.active || data.activeProvider || current.active_provider,
        data.fallbackEnabled !== undefined ? (data.fallbackEnabled ? 1 : 0) : current.fallback_enabled,
        data.fallbackOrder || current.fallback_order,
        data.smtp?.host || data.smtpHost || current.smtp_host,
        parseInt(data.smtp?.port || data.smtpPort || current.smtp_port, 10),
        data.smtp?.encryption || data.smtpEncryption || current.smtp_encryption,
        data.smtp?.username || data.smtpUsername || current.smtp_username,
        smtpPass,
        parseInt(data.smtp?.poolSize || data.smtpPoolSize || current.smtp_pool_size, 10),
        parseInt(data.smtp?.timeout || data.smtpTimeout || current.smtp_timeout, 10),
        resendKey,
        data.resend?.domain || data.resendDomain || current.resend_domain,
        data.resend?.webhookUrl || data.resendWebhookUrl || current.resend_webhook_url,
        data.resend?.tag || data.resendTag || current.resend_tag,
        data.sender?.fromName || data.fromName || current.from_name,
        data.sender?.fromEmail || data.fromEmail || current.from_email,
        data.sender?.replyTo || data.replyTo || current.reply_to,
        data.sender?.subject || data.subjectTemplate || current.subject_template,
        data.sender?.signature || data.signature || current.signature,
        parseInt(data.sender?.retries || data.retries || current.retries, 10),
        parseInt(data.sender?.batchDelay || data.batchDelay || current.batch_delay, 10),
        data.sender?.sandbox !== undefined ? (data.sender.sandbox ? 1 : 0) : (data.sandboxMode ? 1 : 0),
      ]
    );

    // Record audit log if there are changes
    if (changedFields.length > 0) {
      const summary = `Updated ${changedFields.map(f => f.field).join(', ')}`;
      await db.query(
        `INSERT INTO email_config_logs (id, updated_by, changed_fields, summary, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [uuidv4(), updatedBy, JSON.stringify(changedFields), summary]
      );
    }

    return this.getSettings();
  }

  async getLogs(limit = 25) {
    await this.ensureTables();
    return db.query(`SELECT * FROM email_config_logs ORDER BY created_at DESC LIMIT ?`, [limit]);
  }
}

export const emailSettingsRepository = new EmailSettingsRepository();
