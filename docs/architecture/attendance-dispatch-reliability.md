# APFRS Attendance Dispatch Reliability Architecture & State Machine

## 1. Overview & Delivery Semantics
The Attendance and Faculty Reporting System (APFRS) operates under an **at-least-once durable job processing architecture with application-level deduplication and atomic state transitions**.

Because external SMTP mail transfer agents and HTTP APIs (such as Resend) can experience network partitions after accepting an email message but before the confirmation ACK is received, absolute external *exactly-once* network delivery is impossible across distributed physical systems. To prevent duplicate emails, APFRS enforces:
1. **Durable MySQL Job Queueing** (`jobs` table with `FOR UPDATE SKIP LOCKED`).
2. **Atomic Compare-And-Swap Database State Transitions** on `attendance_records`.
3. **Application-Level Idempotency Keys** (monthly/annual faculty uniqueness lookup before transmission).
4. **Bounded Exponential Backoff Retries** with hard-coded max attempt ceiling ($N = 3$).

---

## 2. Finite State Machine (FSM)

### Attendance Record State Machine
```
   ┌─────────┐
   │ queued  │ ◄─────────────────────────┐
   └────┬────┘                           │ (manual retry / crash recovery
        │ (atomic claim:                 │  if attempts < 3)
        │  WHERE status = 'queued'       │
        │  AND attempts < 3)             │
        ▼                                │
   ┌─────────────┐                       │
   │ processing  │ ──────────────────────┘
   └────┬────┬───┘   (provider error / PDF error / crash with attempts >= 3)
        │    │
(email  │    └───────────────────────────┐
sent ok)│                                │
        ▼                                ▼
   ┌─────────┐                     ┌──────────┐
   │  sent   │                     │  failed  │
   └─────────┘                     └──────────┘
(Terminal State)             (Terminal if attempts >= 3)
```

### Attendance Batch Derived States
| Batch State | Definition / Invariant | Completed At |
| :--- | :--- | :--- |
| `pending` | `total === 0` OR `queued === total` | `NULL` |
| `processing` | `processing > 0` OR (`sent + failed > 0` AND `sent + failed < total`) | `NULL` |
| `completed` | `sent === total` AND `total > 0` | Timestamp |
| `partial_failed` | `sent + failed === total` AND `sent > 0` AND `failed > 0` | Timestamp |
| `failed` | `failed === total` AND `total > 0` | Timestamp |

---

## 3. Concurrency & Queue Processing Model

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant Controller as AdminController
    participant Service as AttendanceService
    participant DB as MySQL DB
    participant Queue as JobQueueService
    participant Worker as Background Worker
    participant Provider as SMTP / Resend

    Admin->>Controller: POST /api/admin/attendance/send
    Controller->>Service: sendAttendance()
    Service->>DB: INSERT attendance_batches (pending)
    Service->>DB: INSERT attendance_records (queued, attempts=0)
    Service->>Queue: enqueue('dispatch_attendance_batch')
    Queue->>DB: INSERT INTO jobs (queued)
    Controller-->>Admin: 202 Accepted { batchId, statusUrl }

    loop Queue Polling Loop (every 3s)
        Worker->>DB: SELECT ... FOR UPDATE SKIP LOCKED
        Worker->>DB: UPDATE jobs SET status='running', attempts=attempts+1
        Worker->>Service: dispatchBatch(batchId)
        
        loop For each record in batch
            Service->>DB: UPDATE attendance_records SET status='processing', attempts=attempts+1 WHERE id=? AND status='queued' AND attempts < 3
            alt Atomic Claim Succeeded (affectedRows == 1)
                Service->>Provider: Send Email (bounded timeout)
                alt Delivery Success
                    Service->>DB: UPDATE attendance_records SET status='sent', provider=?, message_id=? WHERE id=? AND status='processing'
                else Delivery Failure
                    Service->>DB: UPDATE attendance_records SET status='failed', error_message=? WHERE id=? AND status='processing'
                end
                Service->>DB: recalculateBatchStatus(batchId)
            else Already Claimed or Max Attempts
                Service->>Service: Skip record (no duplicate email)
            end
        end
        Worker->>DB: UPDATE jobs SET status='done'
    end
```

---

## 4. Failure & Recovery Protocols

### 1. Worker Crash During Email Sending
- **Symptom**: Process dies while a record is in `status = 'processing'`.
- **Mitigation**: On server startup or lease expiry tick, the recovery routine executes:
  ```sql
  UPDATE attendance_records
  SET status = 'queued', error_message = 'Reset after server restart / crash recovery', updated_at = NOW()
  WHERE status = 'processing' AND attempts < 3 AND updated_at < DATE_SUB(NOW(), INTERVAL ? SECOND);
  ```
  Items exceeding max attempts are marked `status = 'failed'`.

### 2. Manual Item Retry (`POST /api/admin/attendance/records/:recordId/retry`)
- **Guardrails**:
  - Enforces `attempts < 3`.
  - Rejects if record is already `sent` (400) or currently `processing` (409).
  - Idempotently succeeds without duplicate queue spam if already `queued`.
  - Transmits `targetRecordId` to prevent full batch re-execution.

### 3. External Network Latency / Provider Hangs
- **Guardrails**:
  - Resend HTTP calls bound by `AbortSignal.timeout(timeoutMs)`.
  - SMTP socket, greeting, and connection timeouts enforced.
