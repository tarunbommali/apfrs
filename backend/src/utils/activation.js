// backend/src/utils/activation.js
//
// Cryptographic helpers for the one-time faculty activation flow.
//
// Why this instead of using cfms_id as the initial password:
//   - cfms_id values are known or discoverable by colleagues and admin staff.
//   - Using a known identifier as an authentication secret means the account is
//     effectively pre-compromised for any faculty whose cfms_id is known.
//   - The activation pattern (generate → hash → store hash → email raw token →
//     validate hash on first use) is the same pattern used for password-reset
//     flows in most production systems.

import crypto from 'crypto';

/**
 * Generate a 64-character hex activation token.
 * The raw token is emailed to the faculty member and NEVER stored.
 */
export function generateActivationToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a raw activation token for safe storage.
 * Only the hash is persisted; the raw token is single-use.
 */
export function hashActivationToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
