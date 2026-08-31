# APFRS — Database Scaling & Architecture Strategy

## 1. Workload Characterization

- **Read vs. Write Ratio**: ~85% Reads (Dashboard analytics, faculty profile lookups, monthly report generation, attendance checks) / 15% Writes (Batch creation, status updates, login tracking, token blacklisting).
- **Peak Write Bursts**: Monthly statement generation (1,000 to 5,000 email dispatches queued concurrently).

---

## 2. Horizontal & Vertical Scaling Path

```
                    ┌─────────────────────────┐
                    │    APFRS API / Web      │
                    │   (Stateless Pods)      │
                    └────────────┬────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   │                           │
                   ▼                           ▼
        ┌─────────────────────┐     ┌─────────────────────┐
        │   Primary MySQL     │     │  Read Replica MySQL │
        │   (All Writes &     │     │  (Reports, Exports, │
        │  Transactional Reads│───► │  Dashboard History) │
        └─────────────────────┘     └─────────────────────┘
```

### 2.1 Recommendation: Single Primary with Index Optimization
- **Current Evidence**: With composite indexes and N+1 query elimination, a single MySQL 8.0 instance (2 vCPU, 4GB RAM) easily supports 10,000+ faculty statements and >500 concurrent API requests with query latencies < 10ms.
- **Read Replica Trigger**: A read replica is justified only when monthly PDF batch reporting causes CPU saturation > 70% or replication delay exceeds SLA. Consistency-critical endpoints (Batch creation $\to$ immediate batch status) MUST always read from the Primary.
