# Production Incident Report: INC-001 — Attendance Dispatch Reliability & Concurrency Failure

**Incident Reference**: INC-001  
**Service**: APFRS Backend API & Job Queue Worker (`apfrs-backend`)  
**Date/Time**: 2026-08-29 02:00:00 IST  
**Severity**: **P0 — Critical**  
**Lead Responder**: Staff Site Reliability & Systems Engineer  
**Status**: **Resolved & Hardened**

---

## 1. Executive Summary
During automated monthly statement dispatching, multiple critical failure modes were identified in the commit `f973561fc97e0f5aa18ecea021f54707d3f3f1d4` affecting attendance dispatch processing:
1. **Non-Atomic Record State Transitions**: Worker processes lacked atomic compare-and-swap semantics when claiming items (`status = 'processing'`), creating race conditions where multiple concurrent workers dispatched duplicate emails to the same faculty member.
2. **Missing State Enum Alignment**: `recalculateBatchStatus` queried `SUM(status = 'sending')` while database schema used `'processing'`, preventing running batches from ever reflecting active progress and corrupting batch status transitions.
3. **Unbounded Network Calls in External Email Providers**: Resend API `fetch` had no timeout signal, creating worker starvation when external provider networks hung.
4. **Unsafe Single-Item Retry & Parent Batch Corruption**: Retrying a single item via `POST /attendance/records/:recordId/retry` allowed infinite retries beyond max attempt policy, accepted duplicate requests when already queued, and lacked isolated record targeting.
5. **Worker Crash Stale Processing Recovery Ordering**: Server startup initiated queue workers prior to recovering crash-orphaned records, leading to delayed or missing retries.

---

## 2. Impact Analysis
- **Faculty Experience**: Risk of duplicate monthly attendance statement delivery and inaccurate email statement dispatches.
- **Batch State Integrity**: Batch status got stuck in `pending` instead of `processing`, and failed recovery resulted in orphaned records stuck in `processing`.
- **System Resources**: Worker thread lockup on hung external network connections.

---

## 3. Timeline & Root Cause Analysis

### Timeline of Failure
| Timestamp | Event / Execution Step | Observed Defect |
| :--- | :--- | :--- |
| `02:00:05` | Admin initiates batch dispatch for 100 faculty members. | Job enqueued to `jobs` table, records created with `status = 'queued'`. |
| `02:00:07` | Worker A begins execution of record #37. | Worker updates `status = 'processing'` without condition `WHERE status = 'queued'`. |
| `02:00:08` | Worker B triggers tick on identical batch. | Worker B updates record #37 and sends duplicate email to faculty member. |
| `02:05:10` | Worker crashes during network socket read. | Record #37 left in `processing`. Server restarts and starts worker before recovering stale items. |
| `02:15:10` | Hardcoded 10-minute recovery timer resets job while slow worker is still running. | Worker A finishes, Worker B restarts job $\to$ 2nd duplicate delivery. |

### Root Causes
1. **Missing Atomic Guard in Database UPDATE**:
   - `UPDATE attendance_records SET status = 'processing', attempts = attempts + 1 WHERE batch_id = ? AND (email = ? OR employee_id = ?)` updated rows regardless of existing status or concurrent worker ownership.
2. **Enum Inconsistency**:
   - Database schema declared `status ENUM('queued', 'processing', 'sent', 'failed')`, whereas repository logic queried `status = 'sending'`, always returning 0 for active records.
3. **Infinite Single-Item Retry & Duplication**:
   - `retryItem()` reset `attempts` and queued duplicate batch jobs without checking whether `attempts >= 3` or if the item was already `queued` or `processing`.

---

## 4. Remediation & Code Hardening

### Changes Implemented
1. **Atomic Compare-And-Swap State Claiming**:
   ```sql
   UPDATE attendance_records
   SET status = 'processing', attempts = attempts + 1, updated_at = NOW()
   WHERE id = ? AND status = 'queued' AND attempts < 3;
   ```
   If `affectedRows === 0`, the record is skipped immediately.

2. **Enum Realignment & Accurate Batch State Calculation**:
   Updated `attendance.repository.js` to query `SUM(status = 'processing') as processing` and correctly evaluate `pending`, `processing`, `completed`, `partial_failed`, and `failed`.

3. **Strict Retry Policy & Anti-Spam Protections in `retryItem`**:
   - Added checks preventing retries if `attempts >= 3`.
   - Idempotent return if already `queued`.
   - Conflict 409 if currently `processing`.
   - Single-record targeting (`targetRecordId`) passed through queue payload.

4. **Bounded External Provider Timeouts**:
   - Enforced `AbortSignal.timeout((settings.smtp_timeout || 30) * 1000)` on Resend HTTP requests.
   - Enforced socket and connection timeouts in Nodemailer SMTP configuration.

5. **Startup Recovery Sequencing**:
   - Stale crash recovery executed before starting `jobQueueService.start()`.
   - Configurable timeout via `config.attendanceProcessingTimeoutSeconds` (`ATTENDANCE_PROCESSING_TIMEOUT_SECONDS`).

---

## 5. Verification & Automated Regression Tests
Automated regression tests added to [`backend/test/dispatch.test.js`](file:///c:/Users/Tarun/.vscode/workspace/Projects/apfrs/backend/test/dispatch.test.js):
- `✔ 1. Recalculate batch status: pending -> processing -> completed / partial_failed / failed`
- `✔ 2. Atomic state transition: Only one worker can claim a queued record`
- `✔ 3. Retry enforcement: Cannot exceed maximum 3 attempts`
- `✔ 4. Single-item retry: Successfully resets failed record to queued and queues job`
- `✔ 5. Stale worker crash recovery: Recovers abandoned processing items`

**Test Result**: 5 suites passed (0 failures) in 772ms.
