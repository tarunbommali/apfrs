const SMTP_CONFIGS_KEY = 'smtpConfigs';
const SMTP_ACTIVE_CONFIG_KEY = 'smtpActiveConfigId';
const LEGACY_SMTP_KEY = 'smtpConfig';
const DEFAULT_SUBJECT = 'APFRS Attendance Report';
const DEFAULT_FROM_NAME = 'APFRS Reports';

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const getStorage = () => (isBrowser() ? window.localStorage : null);

const createConfigId = () => `smtp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const notifyConfigChange = () => {
  if (isBrowser() && typeof window?.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('smtp-config-updated'));
  }
};

const parseBoolean = (value, fallback) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  }
  return fallback;
};

const sanitizeString = (value, fallback = '') => {
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  return trimmed || fallback;
};

const hydrateConfig = (config = {}) => {
  const now = new Date().toISOString();
  const port = sanitizeString(config.port, '587');
  const secureValue = parseBoolean(config.secure, undefined);

  return {
    id: config.id || createConfigId(),
    name: sanitizeString(config.name || config.label, 'SMTP Account'),
    provider: config.provider || 'custom',
    host: sanitizeString(config.host),
    port,
    secure: secureValue !== undefined ? secureValue : port === '465',
    security: config.security || '',
    user: sanitizeString(config.user),
    pass: config.pass || '',
    subject: config.subject || DEFAULT_SUBJECT,
    testRecipient: config.testRecipient || config.user || '',
    fromName: config.fromName || DEFAULT_FROM_NAME,
    notes: config.notes || '',
    createdAt: config.createdAt || now,
    updatedAt: config.updatedAt || now,
    isActive: !!config.isActive,
    isDisabled: !!config.isDisabled,
  };
};

const migrateLegacyConfig = () => {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const legacyRaw = storage.getItem(LEGACY_SMTP_KEY);
    if (!legacyRaw) return [];
    const legacy = JSON.parse(legacyRaw);
    if (legacy && legacy.host) {
      const migrated = hydrateConfig({ ...legacy, id: createConfigId(), isActive: true });
      storage.setItem(SMTP_CONFIGS_KEY, JSON.stringify([migrated]));
      storage.setItem(SMTP_ACTIVE_CONFIG_KEY, migrated.id);
      storage.removeItem(LEGACY_SMTP_KEY);
      return [migrated];
    }
  } catch (error) {
    console.error('Failed to migrate legacy SMTP configuration:', error);
  }
  return [];
};

const readConfigs = () => {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(SMTP_CONFIGS_KEY);
    if (!raw) return migrateLegacyConfig();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(hydrateConfig);
  } catch (error) {
    console.error('Unable to parse SMTP configurations:', error);
    return migrateLegacyConfig();
  }
};

const writeConfigs = (configs) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(SMTP_CONFIGS_KEY, JSON.stringify(configs));
};

const persistState = (configs, activeId) => {
  const storage = getStorage();
  if (!storage) return;
  writeConfigs(configs);
  if (activeId) {
    storage.setItem(SMTP_ACTIVE_CONFIG_KEY, activeId);
  } else {
    storage.removeItem(SMTP_ACTIVE_CONFIG_KEY);
  }
  notifyConfigChange();
};

const resolveState = () => {
  const storage = getStorage();
  if (!storage) {
    return { configs: [], activeConfig: null, activeId: null };
  }

  let configs = readConfigs();
  if (!configs.length) {
    configs = migrateLegacyConfig();
  }

  let activeId = storage.getItem(SMTP_ACTIVE_CONFIG_KEY);
  let activeConfig = configs.find((cfg) => cfg.id === activeId && !cfg.isDisabled);

  if (!activeConfig && configs.length) {
    activeConfig = configs.find((cfg) => !cfg.isDisabled) || configs[0];
    activeId = activeConfig ? activeConfig.id : null;
    if (activeId) {
      storage.setItem(SMTP_ACTIVE_CONFIG_KEY, activeId);
    } else {
      storage.removeItem(SMTP_ACTIVE_CONFIG_KEY);
    }
  }

  configs = configs.map((cfg) => ({ ...cfg, isActive: cfg.id === activeId }));

  return { configs, activeConfig: activeConfig || null, activeId: activeId || null };
};

export const listSMTPConfigs = () => {
  const { configs } = resolveState();
  return configs;
};

export const getActiveSMTPConfig = () => {
  const { activeConfig } = resolveState();
  return activeConfig;
};

export const saveSMTPConfigEntry = (config) => {
  const { configs, activeId } = resolveState();
  const now = new Date().toISOString();
  let nextActiveId = activeId;
  let updatedConfigs = configs.slice();
  let savedConfig = null;

  if (config.id) {
    updatedConfigs = configs.map((cfg) => {
      if (cfg.id === config.id) {
        savedConfig = hydrateConfig({ ...cfg, ...config, updatedAt: now, createdAt: cfg.createdAt });
        return savedConfig;
      }
      return cfg;
    });
  } else {
    savedConfig = hydrateConfig({ ...config, id: createConfigId(), createdAt: now, updatedAt: now });
    updatedConfigs = [...configs, savedConfig];
  }

  if (!updatedConfigs.length) {
    nextActiveId = null;
  }

  if (!nextActiveId || config.isActive || !configs.length) {
    nextActiveId = savedConfig?.id || updatedConfigs[0]?.id || null;
  }

  updatedConfigs = updatedConfigs.map((cfg) => ({
    ...cfg,
    isActive: cfg.id === nextActiveId,
  }));

  persistState(updatedConfigs, nextActiveId);
  return savedConfig;
};

export const deleteSMTPConfigEntry = (id) => {
  const { configs, activeId } = resolveState();
  const filtered = configs.filter((cfg) => cfg.id !== id);
  let nextActiveId = activeId;

  if (activeId === id) {
    nextActiveId = filtered.find((cfg) => !cfg.isDisabled)?.id || filtered[0]?.id || null;
  }

  const updated = filtered.map((cfg) => ({ ...cfg, isActive: cfg.id === nextActiveId }));
  persistState(updated, nextActiveId);
  return updated;
};

export const setActiveSMTPConfig = (id) => {
  const { configs } = resolveState();
  const target = configs.find((cfg) => cfg.id === id && !cfg.isDisabled);
  if (!target) return null;
  const updated = configs.map((cfg) => ({ ...cfg, isActive: cfg.id === id }));
  persistState(updated, id);
  return target;
};

export const toggleSMTPConfigStatus = (id, disabled) => {
  const { configs, activeId } = resolveState();
  let nextActiveId = activeId;

  const updated = configs.map((cfg) => {
    if (cfg.id === id) {
      const nextCfg = { ...cfg, isDisabled: disabled, updatedAt: new Date().toISOString() };
      if (disabled && cfg.isActive) {
        nextActiveId = null;
      }
      return nextCfg;
    }
    return cfg;
  });

  if (!nextActiveId) {
    const fallback = updated.find((cfg) => !cfg.isDisabled);
    nextActiveId = fallback ? fallback.id : null;
  }

  const normalized = updated.map((cfg) => ({ ...cfg, isActive: cfg.id === nextActiveId }));
  persistState(normalized, nextActiveId);
  return normalized.find((cfg) => cfg.id === id) || null;
};

export const clearSMTPConfigs = () => {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(SMTP_CONFIGS_KEY);
  storage.removeItem(SMTP_ACTIVE_CONFIG_KEY);
  notifyConfigChange();
};

// Utility functions for backward compatibility
export const getSMTPConfig = () => {
  return getActiveSMTPConfig();
};

export const validateSMTPConfig = (config) => {
  if (!config) {
    return { isValid: false, error: 'No SMTP configuration provided' };
  }

  const requiredFields = ['host', 'port', 'user', 'pass'];
  const missingFields = requiredFields.filter(field => !config[field]);

  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    };
  }

  // Validate port number
  const port = parseInt(config.port, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    return { isValid: false, error: 'Invalid port number' };
  }

  // Validate email format for user
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(config.user)) {
    return { isValid: false, error: 'Invalid email address format for user' };
  }

  return { isValid: true };
};

export const createSMTPEmailPayload = (config, emailData) => {
  const { recipients, subject, body, isHtml = true, attachments = [] } = emailData;

  return {
    config: {
      host: config.host,
      port: parseInt(config.port, 10),
      secure: config.secure === true || config.port === '465',
      auth: {
        user: config.user,
        pass: config.pass
      },
      companyName: config.fromName || 'APFRS',
      systemName: config.fromName || 'Attendance System'
    },
    emailData: {
      from: {
        name: config.fromName || 'APFRS Reports',
        address: config.user
      },
      to: recipients.map(r => typeof r === 'string' ? r : r.email),
      subject: subject || config.subject || 'APFRS Attendance Report',
      html: isHtml ? body : undefined,
      text: !isHtml ? body : undefined,
      attachments: attachments
    }
  };
};

