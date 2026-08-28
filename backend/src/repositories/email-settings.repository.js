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
        from_name VARCHAR(255) DEFAULT 'Digital Monitoring Cell',
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
          ?, 'notify.jntugvcev.edu.in', 'Digital Monitoring Cell', 'reports@jntugvcev.edu.in', 'admin@apfrs.in', 'Monthly Attendance Statement — {{month}} {{year}}'
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

    // Map active_provider as single source of truth for fallback_order
    const primaryProvider = data.activeProvider || data.active || data.active_provider || current.active_provider || 'smtp';
    const fallbackOrder = primaryProvider === 'resend' ? 'resend_first' : 'smtp_first';

    // Track human-readable changed fields
    const changedLabels = [];

    // Helper to evaluate field change
    const checkChange = (newVal, currentVal, label) => {
      if (newVal !== undefined && String(newVal) !== String(currentVal ?? '')) {
        changedLabels.push(label);
        return true;
      }
      return false;
    };

    const newHost = data.smtpHost !== undefined ? data.smtpHost : (data.smtp?.host !== undefined ? data.smtp.host : current.smtp_host);
    checkChange(newHost, current.smtp_host, 'SMTP Host');

    const newPort = data.smtpPort !== undefined ? parseInt(data.smtpPort, 10) : (data.smtp?.port !== undefined ? parseInt(data.smtp.port, 10) : current.smtp_port);
    checkChange(newPort, current.smtp_port, 'SMTP Port');

    const newEncryption = data.smtpEncryption !== undefined ? data.smtpEncryption : (data.smtp?.encryption !== undefined ? data.smtp.encryption : current.smtp_encryption);
    checkChange(newEncryption, current.smtp_encryption, 'SMTP Encryption');

    const newUsername = data.smtpUsername !== undefined ? data.smtpUsername : (data.smtp?.username !== undefined ? data.smtp.username : current.smtp_username);
    checkChange(newUsername, current.smtp_username, 'SMTP Username');

    const newPool = data.smtpPoolSize !== undefined ? parseInt(data.smtpPoolSize, 10) : (data.smtp?.poolSize !== undefined ? parseInt(data.smtp.poolSize, 10) : current.smtp_pool_size);
    checkChange(newPool, current.smtp_pool_size, 'SMTP Connections');

    const newTimeout = data.smtpTimeout !== undefined ? parseInt(data.smtpTimeout, 10) : (data.smtp?.timeout !== undefined ? parseInt(data.smtp.timeout, 10) : current.smtp_timeout);
    checkChange(newTimeout, current.smtp_timeout, 'SMTP Timeout');

    const newResendDomain = data.resendDomain !== undefined ? data.resendDomain : (data.resend?.domain !== undefined ? data.resend.domain : current.resend_domain);
    checkChange(newResendDomain, current.resend_domain, 'Resend Domain');

    const newResendTag = data.resendTag !== undefined ? data.resendTag : (data.resend?.tag !== undefined ? data.resend.tag : current.resend_tag);
    checkChange(newResendTag, current.resend_tag, 'Email Tag');

    const newFromName = data.fromName !== undefined ? data.fromName : (data.sender?.fromName !== undefined ? data.sender.fromName : current.from_name);
    checkChange(newFromName, current.from_name, 'From Name');

    const newFromEmail = data.fromEmail !== undefined ? data.fromEmail : (data.sender?.fromEmail !== undefined ? data.sender.fromEmail : current.from_email);
    checkChange(newFromEmail, current.from_email, 'From Email');

    const newReplyTo = data.replyTo !== undefined ? data.replyTo : (data.sender?.replyTo !== undefined ? data.sender.replyTo : current.reply_to);
    checkChange(newReplyTo, current.reply_to, 'Reply-To Email');

    const newSubject = data.subjectTemplate !== undefined ? data.subjectTemplate : (data.sender?.subject !== undefined ? data.sender.subject : current.subject_template);
    checkChange(newSubject, current.subject_template, 'Subject Template');

    const newSignature = data.signature !== undefined ? data.signature : (data.sender?.signature !== undefined ? data.sender.signature : current.signature);
    checkChange(newSignature, current.signature, 'Email Signature');

    const newRetries = data.retries !== undefined ? parseInt(data.retries, 10) : (data.sender?.retries !== undefined ? parseInt(data.sender.retries, 10) : current.retries);
    checkChange(newRetries, current.retries, 'Retry Attempts');

    const newBatchDelay = data.batchDelay !== undefined ? parseInt(data.batchDelay, 10) : (data.sender?.batchDelay !== undefined ? parseInt(data.sender.batchDelay, 10) : current.batch_delay);
    checkChange(newBatchDelay, current.batch_delay, 'Batch Delay');

    const newSandbox = data.sandboxMode !== undefined ? (data.sandboxMode ? 1 : 0) : (data.sender?.sandbox !== undefined ? (data.sender.sandbox ? 1 : 0) : current.sandbox_mode);
    checkChange(newSandbox, current.sandbox_mode, 'Test Mode');

    const newFallbackEnabled = data.fallbackEnabled !== undefined ? (data.fallbackEnabled ? 1 : 0) : current.fallback_enabled;
    checkChange(newFallbackEnabled, current.fallback_enabled, 'Automatic Fallback');

    checkChange(primaryProvider, current.active_provider, 'Primary Provider');

    // Secrets handling: empty or undefined retains existing secret
    let smtpPass = current.smtp_password;
    if (data.smtpPassword !== undefined && data.smtpPassword.trim() !== '') {
      smtpPass = data.smtpPassword.trim();
      changedLabels.push('SMTP password updated');
    }

    let resendKey = current.resend_api_key;
    if (data.resendApiKey !== undefined && data.resendApiKey.trim() !== '') {
      resendKey = data.resendApiKey.trim();
      changedLabels.push('Resend API key updated');
    }

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
        primaryProvider,
        newFallbackEnabled,
        fallbackOrder,
        newHost,
        newPort,
        newEncryption,
        newUsername,
        smtpPass,
        newPool,
        newTimeout,
        resendKey,
        newResendDomain,
        newResendTag,
        newFromName,
        newFromEmail,
        newReplyTo,
        newSubject,
        newSignature,
        newRetries,
        newBatchDelay,
        newSandbox,
      ]
    );

    // Record audit log entry if changes were made
    if (changedLabels.length > 0) {
      const summary = `Updated ${changedLabels.join(', ')}`;
      await db.query(
        `INSERT INTO email_config_logs (id, updated_by, changed_fields, summary, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [uuidv4(), updatedBy, JSON.stringify(changedLabels), summary]
      );
      logger.info('Email configuration updated', { updatedBy, summary });
    }

    return this.getSettings();
  }

  async getLogs(limit = 25) {
    await this.ensureTables();
    return db.query(`SELECT * FROM email_config_logs ORDER BY created_at DESC LIMIT ?`, [limit]);
  }
}

export const emailSettingsRepository = new EmailSettingsRepository();
export default emailSettingsRepository;
