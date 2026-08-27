// backend/src/services/job-queue.service.js
//
// Lightweight in-process durable job queue backed by MySQL.
//
// Why this instead of fire-and-forget:
//   - Jobs survive server crashes and restarts (persisted in the `jobs` table)
//   - Failed jobs are retried up to max_attempts times with exponential back-off
//   - SELECT ... FOR UPDATE SKIP LOCKED prevents double-processing when multiple
//     instances run (safe for horizontal scale within MySQL's capabilities)
//
// Usage:
//   jobQueueService.register('my_type', async (payload) => { ... });
//   await jobQueueService.enqueue('my_type', { ...data });
//   await jobQueueService.start();   // called once in server.js after DB connects

import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { logger } from '../utils/logger.js';

/** Exponential back-off delay in seconds: 30s, 5m, 30m */
const RETRY_DELAYS_SECONDS = [30, 300, 1800];

class JobQueueService {
  constructor() {
    /** @type {Map<string, (payload: unknown) => Promise<void>>} */
    this._handlers = new Map();
    this._pollInterval = null;
    this._running = false;
  }

  /**
   * Register a handler for a job type.
   * @param {string} type - Job type identifier
   * @param {(payload: unknown) => Promise<void>} handler - Async handler
   */
  register(type, handler) {
    this._handlers.set(type, handler);
  }

  /**
   * Persist a job to MySQL and return immediately.
   * @param {string} type
   * @param {unknown} payload - Must be JSON-serialisable
   * @param {number} [maxAttempts=3]
   */
  async enqueue(type, payload, maxAttempts = 3) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO jobs (id, type, payload, status, attempts, max_attempts, run_after, created_at, updated_at)
       VALUES (?, ?, ?, 'queued', 0, ?, NOW(), NOW(), NOW())`,
      [id, type, JSON.stringify(payload), maxAttempts]
    );
    logger.info('Job enqueued', { jobId: id, type });
    return id;
  }

  /**
   * Start the polling loop. Should be called once after DB connects.
   * @param {number} [pollMs=5000] - Poll interval in milliseconds
   */
  async start(pollMs = 5000) {
    if (this._pollInterval) return; // already running

    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS jobs (
          id           VARCHAR(50)  NOT NULL PRIMARY KEY,
          type         VARCHAR(100) NOT NULL,
          payload      JSON         NOT NULL,
          status       ENUM('queued', 'running', 'done', 'failed') NOT NULL DEFAULT 'queued',
          attempts     INT          NOT NULL DEFAULT 0,
          max_attempts INT          NOT NULL DEFAULT 3,
          run_after    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
          started_at   TIMESTAMP    NULL,
          done_at      TIMESTAMP    NULL,
          error        TEXT         NULL,
          created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_status_run_after (status, run_after),
          INDEX idx_type (type),
          INDEX idx_created_at (created_at)
        )
      `);
    } catch (err) {
      logger.warn('Job table check warning:', err.message);
    }

    logger.info('Job queue worker started', { pollMs });
    this._pollInterval = setInterval(() => {
      if (!this._running) this._tick().catch((err) =>
        logger.error('Job queue tick error', { error: err.message })
      );
    }, pollMs);
  }

  stop() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
      logger.info('Job queue worker stopped');
    }
  }

  /** Claim and execute one queued job per tick. */
  async _tick() {
    this._running = true;
    try {
      // Claim one job atomically — FOR UPDATE SKIP LOCKED prevents double-claiming
      // when multiple instances run against the same DB.
      const rows = await db.query(
        `SELECT * FROM jobs
         WHERE status = 'queued' AND run_after <= NOW()
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`,
        []
      );

      if (rows.length === 0) return;

      const job = rows[0];

      await db.query(
        `UPDATE jobs SET status = 'running', started_at = NOW(), attempts = attempts + 1, updated_at = NOW() WHERE id = ?`,
        [job.id]
      );

      logger.info('Job started', { jobId: job.id, type: job.type, attempt: job.attempts + 1 });

      const handler = this._handlers.get(job.type);
      if (!handler) {
        await db.query(
          `UPDATE jobs SET status = 'failed', error = ?, done_at = NOW(), updated_at = NOW() WHERE id = ?`,
          [`No handler registered for type '${job.type}'`, job.id]
        );
        logger.error('Job failed: no handler', { jobId: job.id, type: job.type });
        return;
      }

      try {
        const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
        await handler(payload);

        await db.query(
          `UPDATE jobs SET status = 'done', done_at = NOW(), updated_at = NOW() WHERE id = ?`,
          [job.id]
        );
        logger.info('Job completed', { jobId: job.id, type: job.type });
      } catch (err) {
        const nextAttempt = job.attempts + 1;
        const maxAttempts = job.max_attempts || 3;

        if (nextAttempt >= maxAttempts) {
          await db.query(
            `UPDATE jobs SET status = 'failed', error = ?, done_at = NOW(), updated_at = NOW() WHERE id = ?`,
            [err.message, job.id]
          );
          logger.error('Job permanently failed', {
            jobId: job.id, type: job.type, attempts: nextAttempt, error: err.message,
          });
        } else {
          // Exponential back-off: delay grows with each retry
          const delaySec = RETRY_DELAYS_SECONDS[nextAttempt - 1] ?? 1800;
          await db.query(
            `UPDATE jobs
             SET status = 'queued', error = ?, run_after = DATE_ADD(NOW(), INTERVAL ? SECOND), updated_at = NOW()
             WHERE id = ?`,
            [err.message, delaySec, job.id]
          );
          logger.warn('Job re-queued for retry', {
            jobId: job.id, type: job.type, attempt: nextAttempt, retryInSec: delaySec,
          });
        }
      }
    } finally {
      this._running = false;
    }
  }
}

export const jobQueueService = new JobQueueService();
export default jobQueueService;
