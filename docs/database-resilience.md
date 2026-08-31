# APFRS — Database Resilience & Reliability Architecture

## 1. Connection Pool Architecture & Sizing Model

### 1.1 Mathematical Sizing Formula
To prevent database connection starvation and pool exhaustion while respecting MySQL server capacity:

$$\text{Max Possible Database Connections} = (N_{\text{API Instances}} \times S_{\text{API Pool}}) + (N_{\text{Worker Instances}} \times S_{\text{Worker Pool}}) + S_{\text{Admin Headroom}}$$

- **Current Production Configuration**:
  - `DB_POOL_SIZE`: 10 connections per Node.js process (Configurable via `.env`).
  - `queueLimit`: 0 (Unlimited queueing with bounded HTTP timeouts).
  - `waitForConnections`: true.
  - `enableKeepAlive`: true (prevents TCP half-open socket leaks).
  - `connectTimeout`: 10,000ms.
- **MySQL Server Headroom**: Default `max_connections = 151` on MySQL 8.0. With 2 API replicas and 1 worker process:
  $$2 \times 10 + 1 \times 5 + 10 = 35 \text{ connections} \ll 151 \text{ max\_connections}$$

### 1.2 Connection Lifecycle & Leak Elimination
Every interaction through `db.query(sql, params)` or `db.transaction(callback)` executes in a strict `try ... finally` block:
```javascript
const connection = await this.getConnection();
try {
  const [rows] = await connection.execute(sql, params);
  return rows;
} finally {
  connection.release(); // Guarantees release even upon fatal errors
}
```

---

## 2. Transaction Boundaries & Concurrency Invariants

### 2.1 Atomic Batch Creation
Batch creation, attendance item insertion, background job registration, and idempotency key persistence execute inside a single MySQL transaction (`db.transaction`).

### 2.2 Atomic Record Claiming (CAS)
Worker race conditions are eliminated using atomic row-level compare-and-swap:
```sql
UPDATE attendance_records
SET status = 'processing', attempts = attempts + 1, updated_at = NOW()
WHERE id = ? AND status = 'queued' AND attempts < ?;
```
If `affectedRows === 1`, the worker owns the record. If `0`, another worker or recovery job claimed it.

---

## 3. Slow Query Detection & Observability

- **Threshold**: Governed by `DB_SLOW_QUERY_MS` (default 500ms).
- **Security / PII Redaction**: Query duration is measured without serializing raw query parameters (protecting password hashes, JWTs, and email contents from logs).
- **Pool Metrics**: Live pool health is monitored via `db.getConnectionStatus()`, exposing `activeConnections`, `freeConnections`, and `waitingRequests`.
