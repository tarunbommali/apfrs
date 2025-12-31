

/* eslint-disable no-unused-vars */

import { getActiveSMTPConfig } from './smtpConfigStore';

const ENV_SMTP_USER = import.meta.env.VITE_SMTP_USER || import.meta.env.VITE_SMTP_EMAIL || '';
const ENV_SMTP_PASS = import.meta.env.VITE_SMTP_PASS || import.meta.env.VITE_SMTP_PASSWORD || '';
const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME || 'APFRS';
const REPORT_SYSTEM_NAME = import.meta.env.VITE_REPORT_SYSTEM_NAME || 'Attendance System';

// Utility functions for SMTP config
const mask = (value = '') => {
  if (!value) return '';
  if (value.includes('@')) {
    const parts = value.split('@');
    const u = parts[0];
    return u.length <= 2 ? `**@${parts[1]}` : `${u.slice(0, 2)}***@${parts[1]}`;
  }
  return value.length <= 4 ? '****' : `${value.slice(0, 2)}***${value.slice(-1)}`;
};

// SMTP Configuration Management
export const getSMTPConfig = () => {
  try {
    const activeConfig = getActiveSMTPConfig();
    if (activeConfig && activeConfig.host) {
      console.log('📧 Using active SMTP config:', {
        host: activeConfig.host,
        port: activeConfig.port,
        user: mask(activeConfig.user),
        secure: activeConfig.secure,
        id: activeConfig.id,
      });
      return { ...activeConfig };
    }
  } catch (error) {
    console.error('❌ Error loading SMTP config from store:', error);
  }

  const envConfig = {
    id: 'env-smtp',
    host: import.meta.env.VITE_SMTP_HOST || '',
    port: import.meta.env.VITE_SMTP_PORT || '587',
    secure: import.meta.env.VITE_SMTP_SECURE !== 'false',
    user: ENV_SMTP_USER,
    pass: ENV_SMTP_PASS,
    subject: import.meta.env.VITE_SMTP_SUBJECT || `${COMPANY_NAME} Attendance Report`,
    testRecipient: import.meta.env.VITE_SMTP_TEST_RECIPIENT || ENV_SMTP_USER || '',
    fromName: `${COMPANY_NAME} Reports`,
    companyName: COMPANY_NAME,
    systemName: REPORT_SYSTEM_NAME
  };

  if (envConfig.host) {
    console.log('📧 Using environment SMTP config:', {
      host: envConfig.host,
      port: envConfig.port,
      user: mask(envConfig.user),
      secure: envConfig.secure,
      company: envConfig.companyName
    });
    return envConfig;
  }

  return null;
};

export const validateSMTPConfig = (config) => {
  if (!config) return { isValid: false, error: 'SMTP configuration is missing.' };

  const requiredFields = ['host', 'port', 'user', 'pass'];
  const missingFields = [];

  for (const field of requiredFields) {
    if (!config[field] || config[field].toString().trim() === '') {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: `Missing required SMTP fields: ${missingFields.join(', ')}`
    };
  }

  const port = parseInt(config.port);
  if (isNaN(port) || port < 1 || port > 65535) {
    return { isValid: false, error: `Invalid port number: ${config.port}` };
  }

  if (!config.user.includes('@')) {
    console.warn('⚠️ SMTP username may not be a valid email address');
  }

  return { isValid: true };
};

// Helper function to create SMTP email payload
export const createSMTPEmailPayload = (config, emailData) => {
  const companyName = config.companyName || COMPANY_NAME;
  const fromLabel = config.fromName || `${companyName} Reports`;
  const fromAddress = `"${fromLabel}" <${config.user}>`;
  const replyToAddress = config.user;
  const normalizedPort = Number(config.port) || 587;
  let resolvedSecurity = (config.security || '').toString().toLowerCase();

  if (!resolvedSecurity || resolvedSecurity === 'true' || resolvedSecurity === 'false') {
    resolvedSecurity = normalizedPort === 465 ? 'ssl' : 'tls';
  }

  const shouldUseSSL = resolvedSecurity === 'ssl';

  return {
    config: {
      host: config.host,
      port: normalizedPort,
      secure: shouldUseSSL,
      security: resolvedSecurity,
      email: config.user,
      user: config.user,
      password: config.pass,
      pass: config.pass,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      companyName,
    },
    emailData: {
      from: fromAddress,
      to: emailData.recipients.map(r => r.email),
      subject: emailData.subject,
      html: emailData.isHtml ? emailData.body : undefined,
      text: !emailData.isHtml ? emailData.body : undefined,
      replyTo: replyToAddress,
      attachments: emailData.attachments || [],
    },
  };
};

// Default SMTP configuration for development
export const getDefaultSMTPConfig = () => {
  return {
    id: 'default-smtp',
    host: '',
    port: '587',
    secure: false,
    user: '',
    pass: '',
    subject: `${COMPANY_NAME} Attendance Report`,
    testRecipient: '',
    fromName: `${COMPANY_NAME} Reports`,
    companyName: COMPANY_NAME,
    systemName: REPORT_SYSTEM_NAME
  };
};

// Parse SMTP configuration from environment variables
export const parseEnvSMTPConfig = () => {
  return {
    id: 'env-smtp',
    host: import.meta.env.VITE_SMTP_HOST || '',
    port: import.meta.env.VITE_SMTP_PORT || '587',
    secure: import.meta.env.VITE_SMTP_SECURE !== 'false',
    user: ENV_SMTP_USER,
    pass: ENV_SMTP_PASS,
    subject: import.meta.env.VITE_SMTP_SUBJECT || `${COMPANY_NAME} Attendance Report`,
    testRecipient: import.meta.env.VITE_SMTP_TEST_RECIPIENT || ENV_SMTP_USER || '',
    fromName: `${COMPANY_NAME} Reports`,
    companyName: COMPANY_NAME,
    systemName: REPORT_SYSTEM_NAME
  };
};

// Check if SMTP configuration is available
export const hasSMTPConfig = () => {
  const config = getSMTPConfig();
  return config !== null && config.host && config.user && config.pass;
};

// Log SMTP configuration (masked)
export const logSMTPConfig = (config) => {
  if (!config) {
    console.log('📧 No SMTP configuration available');
    return;
  }

  console.log('📧 SMTP Configuration:', {
    host: config.host,
    port: config.port,
    user: mask(config.user),
    secure: config.secure,
    company: config.companyName || 'N/A',
    fromName: config.fromName || 'N/A'
  });
};