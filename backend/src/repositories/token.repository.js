// backend/src/repositories/token.repository.js
import db from '../config/database.js';

class TokenRepository {
  constructor() {
    this.blacklist = new Set();
    this.loginAttempts = new Map();
  }

  async addToBlacklist(token, userId, expiresInSeconds = 86400) {
    if (db.isConnected) {
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
      const sql = `
        INSERT INTO token_blacklist (token, user_id, expires_at, created_at)
        VALUES (?, ?, ?, NOW())
      `;
      try {
        await db.query(sql, [token, userId || null, expiresAt]);
        return;
      } catch {
        // Fallback to memory
      }
    }

    if (token) this.blacklist.add(token);
  }

  async isBlacklisted(token) {
    if (!token) return false;

    if (db.isConnected) {
      const sql = `SELECT * FROM token_blacklist WHERE token = ? AND expires_at > NOW()`;
      try {
        const rows = await db.query(sql, [token]);
        return rows.length > 0;
      } catch {
        // Fallback to memory
      }
    }

    return this.blacklist.has(token);
  }

  async getLoginAttempts(email) {
    const key = email.toLowerCase().trim();

    if (db.isConnected) {
      const sql = `SELECT * FROM login_attempts WHERE email = ? ORDER BY last_attempt_at DESC LIMIT 1`;
      try {
        const rows = await db.query(sql, [key]);
        return rows[0] || null;
      } catch {
        // Fallback
      }
    }

    return this.loginAttempts.get(key) || null;
  }

  async incrementLoginAttempts(email) {
    const key = email.toLowerCase().trim();
    const current = this.loginAttempts.get(key) || { count: 0, lockedUntil: null };
    current.count += 1;

    if (current.count >= 5) {
      current.lockedUntil = Date.now() + 15 * 60 * 1000;
    }

    this.loginAttempts.set(key, current);
    return current;
  }

  async resetLoginAttempts(email) {
    const key = email.toLowerCase().trim();
    this.loginAttempts.delete(key);
  }
}

export const tokenRepository = new TokenRepository();
export default tokenRepository;
