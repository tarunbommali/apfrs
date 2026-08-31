// backend/src/utils/crypto.js
import crypto from 'crypto';
import { config } from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for GCM
const PREFIX = 'enc:v1:';

function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY || config.jwt.secret || 'apfrs_default_encryption_key_2024';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive string using AES-256-GCM
 */
export function encryptSecret(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') return plaintext;
  if (plaintext.startsWith(PREFIX)) return plaintext; // Already encrypted

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    return plaintext;
  }
}

/**
 * Decrypts AES-256-GCM ciphertext. Returns plaintext or fallback if unencrypted.
 */
export function decryptSecret(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;
  if (!ciphertext.startsWith(PREFIX)) return ciphertext; // Return raw legacy plaintext

  try {
    const key = getEncryptionKey();
    const parts = ciphertext.slice(PREFIX.length).split(':');
    if (parts.length !== 3) return ciphertext;

    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return ciphertext;
  }
}

/**
 * Safely masks a secret string for UI presentation
 */
export function maskSecret(val) {
  if (!val || typeof val !== 'string' || val.trim().length === 0) return '';
  return '••••••••';
}
