// backend/src/repositories/idempotency.repository.js
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { logger } from '../utils/logger.js';

class IdempotencyRepository {
  async ensureTable() {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS idempotency_keys (
          id VARCHAR(50) PRIMARY KEY,
          idempotency_key VARCHAR(255) UNIQUE NOT NULL,
          request_path VARCHAR(255) NOT NULL,
          request_hash VARCHAR(64) NOT NULL,
          response_code INT NOT NULL DEFAULT 200,
          response_body JSON NOT NULL,
          batch_id VARCHAR(50) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          INDEX idx_key (idempotency_key),
          INDEX idx_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } catch (err) {
      logger.warn('Idempotency table creation warning:', { error: err.message });
    }
  }

  async get(idempotencyKey) {
    await this.ensureTable();
    const rows = await db.query(
      `SELECT * FROM idempotency_keys 
       WHERE idempotency_key = ? AND expires_at > NOW() 
       LIMIT 1`,
      [idempotencyKey]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    let parsedBody = row.response_body;
    if (typeof parsedBody === 'string') {
      try {
        parsedBody = JSON.parse(parsedBody);
      } catch (e) {
        // keep string
      }
    }

    return {
      id: row.id,
      idempotencyKey: row.idempotency_key,
      requestPath: row.request_path,
      requestHash: row.request_hash,
      responseCode: row.response_code,
      responseBody: parsedBody,
      batchId: row.batch_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  async save(data, conn = db) {
    await this.ensureTable();
    const { idempotencyKey, requestPath, requestHash, responseCode, responseBody, batchId, ttlHours = 24 } = data;
    const id = uuidv4();

    await conn.query(
      `INSERT INTO idempotency_keys (
        id, idempotency_key, request_path, request_hash, response_code, response_body, batch_id, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))
      ON DUPLICATE KEY UPDATE
        response_code = VALUES(response_code),
        response_body = VALUES(response_body),
        expires_at = VALUES(expires_at)`,
      [
        id,
        idempotencyKey,
        requestPath || '/api/admin/attendance/send',
        requestHash,
        responseCode || 200,
        JSON.stringify(responseBody),
        batchId || null,
        ttlHours,
      ]
    );

    return { id, idempotencyKey };
  }
}

export const idempotencyRepository = new IdempotencyRepository();
export default idempotencyRepository;
