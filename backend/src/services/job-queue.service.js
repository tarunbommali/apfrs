// backend/src/services/job-queue.service.js
//
// Durable job queue backed by MySQL with transactional atomic claiming,
// stale job lease recovery, and exponential retry back-off.

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
    this._concurrencyLimit = 3;
    this._activeJobs = 0;
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
   * @param {number} [pollMs=3000] - Poll interval in milliseconds
   */
  async start(pollMs = 3000) {
    if (this._pollInterval) return;

    logger.info('Job queue worker started', { pollMs, concurrency: this._concurrencyLimit });
    this._pollInterval = setInterval(() => {
      this._tick().catch((err) =>
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

  /**
   * Reclaims jobs that were left in 'running' state if a worker instance crashed.
   */
  async _recoverStaleJobs() {
    try {
      await db.query(
        `UPDATE jobs
         SET status = 'queued',
             error = 'Worker lease expired / recovered after crash',
             run_after = NOW(),
             updated_at = NOW()
         WHERE status = 'running'
           AND updated_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`
      );
    } catch (err) {
      logger.warn('Stale job recovery warning:', { error: err.message });
    }
  }

  /**
   * Claim and execute jobs atomically inside a transaction.
   */
  async _tick() {
    if (this._activeJobs >= this._concurrencyLimit) return;

    // Periodically recover stale jobs from dead workers
    await this._recoverStaleJobs();

    while (this._activeJobs < this._concurrencyLimit) {
      let claimedJob = null;

      try {
        // Atomic Claiming: SELECT ... FOR UPDATE SKIP LOCKED + UPDATE within the same transaction connection
        await db.transaction(async (conn) => {
          const [rows] = await conn.query(
            `SELECT * FROM jobs
             WHERE status = 'queued' AND run_after <= NOW()
             ORDER BY created_at ASC
             LIMIT 1
             FOR UPDATE SKIP LOCKED`
          );

          if (rows.length === 0) return;

          const job = rows[0];
          await conn.query(
            `UPDATE jobs
             SET status = 'running',
                 started_at = NOW(),
                 attempts = attempts + 1,
                 updated_at = NOW()
             WHERE id = ?`,
            [job.id]
          );

          claimedJob = { ...job, attempts: job.attempts + 1 };
        });
      } catch (err) {
        logger.error('Failed to atomically claim job:', { error: err.message });
        break;
      }

      if (!claimedJob) break; // No more queued jobs ready

      this._activeJobs++;
      this._executeJob(claimedJob).finally(() => {
        this._activeJobs--;
      });
    }
  }

  /**
   * Executes handler outside transaction and writes final job status.
   */
  async _executeJob(job) {
    logger.info('Job started execution', { jobId: job.id, type: job.type, attempt: job.attempts });

    const handler = this._handlers.get(job.type);
    if (!handler) {
      await db.query(
        `UPDATE jobs SET status = 'failed', error = ?, done_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [`No handler registered for type '${job.type}'`, job.id]
      );
      logger.error('Job failed: no handler registered', { jobId: job.id, type: job.type });
      return;
    }

    try {
      const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
      await handler(payload);

      await db.query(
        `UPDATE jobs SET status = 'done', done_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [job.id]
      );
      logger.info('Job completed successfully', { jobId: job.id, type: job.type });
    } catch (err) {
      const maxAttempts = job.max_attempts || 3;

      if (job.attempts >= maxAttempts) {
        await db.query(
          `UPDATE jobs SET status = 'failed', error = ?, done_at = NOW(), updated_at = NOW() WHERE id = ?`,
          [err.message, job.id]
        );
        logger.error('Job permanently failed after maximum attempts', {
          jobId: job.id,
          type: job.type,
          attempts: job.attempts,
          error: err.message,
        });
      } else {
        // Exponential back-off delay
        const delaySec = RETRY_DELAYS_SECONDS[job.attempts - 1] ?? 1800;
        await db.query(
          `UPDATE jobs
           SET status = 'queued',
               error = ?,
               run_after = DATE_ADD(NOW(), INTERVAL ? SECOND),
               updated_at = NOW()
           WHERE id = ?`,
          [err.message, delaySec, job.id]
        );
        logger.warn('Job re-queued for retry with backoff', {
          jobId: job.id,
          type: job.type,
          attempt: job.attempts,
          retryInSec: delaySec,
        });
      }
    }
  }
}

export const jobQueueService = new JobQueueService();
export default jobQueueService;
