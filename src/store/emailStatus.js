/**
 * Email Status Store - Manages email status persistence in localStorage
 * 
 * Schema:
 * {
 *   "email@example.com": {
 *     month: "2025-01",
 *     status: "sent" | "failed" | "pending",
 *     timestamp: 1735600000000,
 *     error: "Error message if failed",
 *     messageId: "Email message ID if sent",
 *     retryCount: 0
 *   }
 * }
 */

const EMAIL_STATUS_KEY = 'apfrs_email_status';

// Check if we're in browser
const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const getStorage = () => (isBrowser() ? window.localStorage : null);

// Dispatch custom event for status updates
const notifyStatusChange = () => {
  if (isBrowser() && typeof window?.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('email-status-updated'));
  }
};

/**
 * Get all email statuses from storage
 * @returns {Object} Email status map
 */
export const getEmailStatusStore = () => {
  const storage = getStorage();
  if (!storage) return {};
  
  try {
    const data = storage.getItem(EMAIL_STATUS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error reading email status store:', error);
    return {};
  }
};

/**
 * Save the entire status store
 * @param {Object} store - The complete status store
 */
const saveStore = (store) => {
  const storage = getStorage();
  if (!storage) return;
  
  try {
    storage.setItem(EMAIL_STATUS_KEY, JSON.stringify(store));
    notifyStatusChange();
  } catch (error) {
    console.error('Error saving email status store:', error);
  }
};

/**
 * Get email status for a specific email address
 * @param {string} email - Email address
 * @returns {Object|null} Status data or null
 */
export const getEmailStatus = (email) => {
  if (!email) return null;
  const store = getEmailStatusStore();
  return store[email.toLowerCase()] || null;
};

/**
 * Update email status
 * @param {string} email - Email address
 * @param {Object} statusData - Status data to update
 */
export const updateEmailStatus = (email, statusData) => {
  if (!email) return;
  
  const store = getEmailStatusStore();
  const key = email.toLowerCase();
  
  store[key] = {
    ...store[key],
    ...statusData,
    timestamp: Date.now(),
    updatedAt: new Date().toISOString()
  };
  
  saveStore(store);
  return store[key];
};

/**
 * Set email status to sent
 * @param {string} email - Email address
 * @param {string} month - Month key (YYYY-MM)
 * @param {Object} options - Additional options (messageId, etc.)
 */
export const setEmailSent = (email, month, options = {}) => {
  return updateEmailStatus(email, {
    month,
    status: 'sent',
    error: null,
    messageId: options.messageId || null,
    sentAt: new Date().toISOString(),
    retryCount: 0
  });
};

/**
 * Set email status to failed
 * @param {string} email - Email address
 * @param {string} month - Month key (YYYY-MM)
 * @param {string} error - Error message
 */
export const setEmailFailed = (email, month, error) => {
  const current = getEmailStatus(email);
  return updateEmailStatus(email, {
    month,
    status: 'failed',
    error: error || 'Unknown error',
    retryCount: (current?.retryCount || 0) + 1
  });
};

/**
 * Set email status to pending
 * @param {string} email - Email address
 * @param {string} month - Month key (YYYY-MM)
 */
export const setEmailPending = (email, month) => {
  return updateEmailStatus(email, {
    month,
    status: 'pending',
    error: null
  });
};

/**
 * Check if email was sent for a specific month
 * @param {string} email - Email address
 * @param {string} month - Month key (YYYY-MM)
 * @returns {boolean}
 */
export const wasEmailSent = (email, month) => {
  const status = getEmailStatus(email);
  return status?.status === 'sent' && status?.month === month;
};

/**
 * Get failed emails for retry
 * @param {string} month - Month key (YYYY-MM)
 * @returns {Array} List of failed email addresses
 */
export const getFailedEmails = (month) => {
  const store = getEmailStatusStore();
  return Object.entries(store)
    .filter(([_, data]) => data.status === 'failed' && data.month === month)
    .map(([email, data]) => ({ email, ...data }));
};

/**
 * Get pending emails
 * @param {string} month - Month key (YYYY-MM)
 * @returns {Array} List of pending email addresses
 */
export const getPendingEmails = (month) => {
  const store = getEmailStatusStore();
  return Object.entries(store)
    .filter(([_, data]) => data.status === 'pending' && data.month === month)
    .map(([email, data]) => ({ email, ...data }));
};

/**
 * Clear status for a specific email
 * @param {string} email - Email address
 */
export const clearEmailStatus = (email) => {
  if (!email) return;
  
  const store = getEmailStatusStore();
  delete store[email.toLowerCase()];
  saveStore(store);
};

/**
 * Clear all email statuses
 */
export const clearEmailStatusStore = () => {
  const storage = getStorage();
  if (!storage) return;
  
  storage.removeItem(EMAIL_STATUS_KEY);
  notifyStatusChange();
};

/**
 * Get summary statistics for a month
 * @param {string} month - Month key (YYYY-MM)
 * @returns {Object} Summary stats
 */
export const getMonthSummary = (month) => {
  const store = getEmailStatusStore();
  const monthEntries = Object.entries(store).filter(([_, data]) => data.month === month);
  
  return {
    total: monthEntries.length,
    sent: monthEntries.filter(([_, d]) => d.status === 'sent').length,
    failed: monthEntries.filter(([_, d]) => d.status === 'failed').length,
    pending: monthEntries.filter(([_, d]) => d.status === 'pending').length
  };
};

/**
 * Bulk update statuses
 * @param {Array} updates - Array of { email, status, month, error? }
 */
export const bulkUpdateStatus = (updates) => {
  if (!Array.isArray(updates) || updates.length === 0) return;
  
  const store = getEmailStatusStore();
  
  updates.forEach(({ email, status, month, error, messageId }) => {
    if (!email) return;
    
    const key = email.toLowerCase();
    const current = store[key] || {};
    
    store[key] = {
      ...current,
      month,
      status,
      error: error || null,
      messageId: messageId || null,
      timestamp: Date.now(),
      updatedAt: new Date().toISOString(),
      retryCount: status === 'failed' ? (current.retryCount || 0) + 1 : 0
    };
  });
  
  saveStore(store);
};

export default {
  getEmailStatusStore,
  getEmailStatus,
  updateEmailStatus,
  setEmailSent,
  setEmailFailed,
  setEmailPending,
  wasEmailSent,
  getFailedEmails,
  getPendingEmails,
  clearEmailStatus,
  clearEmailStatusStore,
  getMonthSummary,
  bulkUpdateStatus
};
