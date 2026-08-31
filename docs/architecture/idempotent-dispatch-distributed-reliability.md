# APFRS — Distributed Systems Reliability & Idempotent Dispatch Architecture

## 1. System Delivery Guarantees

> [!IMPORTANT]
> **Delivery Contract**: APFRS provides **at-least-once processing** with **application-level deduplication, atomic compare-and-swap state transitions, and database-enforced idempotency**.
> 
> Because external email providers (SMTP servers, Resend API) operate outside our transactional database boundary, physical "exactly-once email delivery" across an uncoordinated network is theoretically impossible. APFRS guarantees that within the system boundary, duplicate HTTP submissions, worker restarts, and concurrent retries never spawn duplicate jobs or corrupt batch status.

---

## 2. Distributed State Machine & Atomic Invariants

### 2.1 `attendance_records` State Transitions

```
                 ┌────────────────────────────────────────────────────────┐
                 │                                                        │
                 ▼                                                        │
         ┌───────────────┐                                                │
         │    QUEUED     │                                                │
         └───────┬───────┘                                                │
                 │                                                        │
                 │ claim (CAS: status='queued' AND attempts < MAX)        │
                 ▼                                                        │
         ┌───────────────┐                                                │
         │  PROCESSING   │                                                │
         └───┬───────────┬┘                                               │
             │           │                                                │
  SMTP/Resend│           │ SMTP/Resend                                    │
      Success│           │ Failure                                        │
             ▼           ▼                                                │
     ┌───────────┐   ┌───────────┐                                        │
     │   SENT    │   │  FAILED   │                                        │
     └───────────┘   └───┬───────┘                                        │
                         │                                                │
                         │ retryItem (attempts < MAX)                     │
                         └────────────────────────────────────────────────┘
```

### 2.2 Transition Table

| Current State | Event | Next State | Condition / Invariant | Atomic Database Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| `queued` | Worker Claim | `processing` | `status = 'queued' AND attempts < MAX_ATTEMPTS` | `UPDATE ... SET status='processing', attempts=attempts+1 WHERE id=? AND status='queued' AND attempts < ?` (`affectedRows === 1`) |
| `processing` | Email Sent | `sent` | Worker owns lease | `UPDATE ... SET status='sent', provider=?, message_id=?, sent_at=NOW() WHERE id=? AND status='processing'` |
| `processing` | Email Failed | `failed` | Worker owns lease | `UPDATE ... SET status='failed', error_message=? WHERE id=? AND status='processing'` |
| `processing` | Lease Expired (Crash) | `queued` | `updated_at < NOW() - INTERVAL config.timeout SECOND` | `UPDATE ... SET status='queued' WHERE status='processing' AND updated_at < ...` |
| `failed` | Manual Item Retry | `queued` | `attempts < MAX_ATTEMPTS` | `UPDATE ... SET status='queued' WHERE id=? AND status='failed' AND attempts < ?` |
| `sent` | Any Retry | *Rejected* | Terminal immutable state | Refuses transition without explicit `forceResend` |

---

## 3. Transaction Boundary & Outbox Elimination

In traditional architectures where message brokers (e.g. RabbitMQ/Kafka) live outside MySQL, an Outbox table is required to bridge the dual-write problem.

In APFRS, the **Job Queue is persisted natively in MySQL (`jobs` table)**. This allows APFRS to execute the entire batch creation inside a **Single Atomic MySQL Transaction**:

```
BEGIN TRANSACTION
  1. Insert into `attendance_batches`
  2. Bulk insert into `attendance_records` (all `queued`)
  3. Insert into `jobs` (payload, `dispatch_attendance_batch`)
  4. Insert into `idempotency_keys` (request_hash, response_json, batch_id)
COMMIT
```

**Transactional Invariant**:
- If any step fails or the backend crashes before commit, 0 records and 0 jobs exist.
- Once committed, the background worker is guaranteed to find both the job and all child records in MySQL.

---

## 4. Idempotency Key Semantics

### Client Interface:
- Header: `Idempotency-Key: <UUID | Unique String>`
- Or JSON field: `"idempotencyKey": "<UUID | Unique String>"`

### Backend Validation Flow:
1. Canonical request hash generated: `SHA256(canonical JSON { month, year, facultyIds, forceResend })`.
2. Check `idempotency_keys` table:
   - **Matching Key + Matching Hash**: Returns original cached HTTP 202 response with original `batchId`. No second batch created. No duplicate jobs enqueued.
   - **Matching Key + Different Hash**: Rejects with HTTP 409 Conflict (`Idempotency key reused with a different request payload`).
   - **New Key**: Executes transaction and stores cached response for 24 hours.

---

## 5. Concurrency Race Mitigation Matrix

| Potential Race Condition | Root Vulnerability | APFRS Mitigation |
| :--- | :--- | :--- |
| **Two workers claim same record** | Multiple SELECTs before non-atomic UPDATE | Single atomic CAS query (`status = 'queued'`). InnoDB row-lock guarantees exactly one worker gets `affectedRows === 1`. |
| **Rapid double-click on Dispatch** | Concurrent HTTP POST requests | `idempotency_keys` MySQL `UNIQUE KEY (idempotency_key)` blocks duplicate writes; subsequent calls receive cached response. |
| **Concurrent manual retry clicks** | Concurrent `POST /records/:id/retry` | Atomic CAS `WHERE status = 'failed' AND attempts < MAX`. Second click gets `affectedRows === 0` and returns 409 Conflict. |
| **Worker crash during SMTP send** | Orphaned `processing` records | Crash recovery runs on server startup and on periodic interval, resetting stale processing records (`updated_at > threshold`) back to `queued`. |
| **Max retry overshoot** | Unchecked retry loops | Invariant enforced in claim query: `attempts < MAX_ATTEMPTS`. Records reaching limit permanently transition to `failed`. |
