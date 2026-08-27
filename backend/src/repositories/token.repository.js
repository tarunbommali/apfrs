// backend/src/repositories/token.repository.js
import db from '../config/database.js';

class TokenRepository {
  // ── Token Blacklist ─────────────────────────────────────────────────────────

  async addToBlacklist(token, userId, expiresInSeconds = 86400) {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const sql = `
      INSERT INTO token_blacklist (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    await db.query(sql, [token, userId || null, expiresAt]);
  }

  async isBlacklisted(token) {
    if (!token) return false;
    const sql = `SELECT 1 FROM token_blacklist WHERE token = ? AND expires_at > NOW() LIMIT 1`;
    const rows = await db.query(sql, [token]);
    return rows.length > 0;
  }

  // ── Login Attempts (fully DB-backed) ───────────────────────────────────────
  //
  // Previously these methods wrote only to an in-process Map while
  // getLoginAttempts() read from MySQL — making account lockout completely
  // ineffective whenever the server was DB-connected. All three methods now
  // operate exclusively on the login_attempts table.

  async getLoginAttempts(email) {
    const key = email.toLowerCase().trim();
    const sql = `
      SELECT
        attempt_count                               AS count,
        UNIX_TIMESTAMP(locked_until) * 1000         AS lockedUntil,
        last_attempt_at
      FROM login_attempts
      WHERE email = ?
      ORDER BY last_attempt_at DESC
      LIMIT 1
    `;
    const rows = await db.query(sql, [key]);
    if (rows.length === 0) return null;
    return {
      count:       rows[0].count,
      lockedUntil: rows[0].lockedUntil ? Number(rows[0].lockedUntil) : null,
    };
  }

  async incrementLoginAttempts(email) {
    const key = email.toLowerCase().trim();
    const lockThreshold = 5;

    // Atomic upsert: insert on first attempt, increment on subsequent ones.
    // Sets locked_until to 15 minutes from now once threshold is hit.
    const sql = `
      INSERT INTO login_attempts (email, attempt_count, last_attempt_at, locked_until)
      VALUES (?, 1, NOW(), NULL)
      ON DUPLICATE KEY UPDATE
        attempt_count    = attempt_count + 1,
        last_attempt_at  = NOW(),
        locked_until     = IF(
          attempt_count + 1 >= ?,
          DATE_ADD(NOW(), INTERVAL 15 MINUTE),
          NULL
        )
    `;
    await db.query(sql, [key, lockThreshold]);
    return this.getLoginAttempts(email);
  }

  async resetLoginAttempts(email) {
    const key = email.toLowerCase().trim();
    await db.query(`DELETE FROM login_attempts WHERE email = ?`, [key]);
  }
}

export const tokenRepository = new TokenRepository();
export default tokenRepository;
