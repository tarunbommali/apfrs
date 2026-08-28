# Design Doc: APFRS Production Import, Consolidation, and Report Pipeline

**Date:** 2026-08-28  
**Topic:** Transitioning to safe database transactions and modular import client orchestrations.

---

## 1. Problem & Context
The current APFRS biometric Excel parsing, calculations, and normalizations are located directly within the frontend route page component `/import` in `import.tsx`. Additionally, backend updates are not wrapped in database transactions, meaning a database query failure or unexpected disconnect during bulk insertion will leave the MySQL database in an inconsistent or partially populated state. 

---

## 2. Requirements & Approved Decisions
1. **Frontend Isolation:** Outsource Excel parser (`xlsx`) reading and validation loop out of the route page into a pure module (`excel-parser.ts`) and a reusable orchestration hook (`useAttendanceImport.ts`).
2. **Backend Transaction Atomicity:** Wrap backend deletion of old sheet records and bulk insertion of new records in a MySQL transaction block using `db.transaction(async (conn) => { ... })`.
3. **Single Canonical Calculation Source:** Zentralize calculation of working days, attendance percentages, present/absent counts, and daily record mappings on the backend server. Downstream views (Reports details, individual PDF rendering, email sending) fetch this pre-consolidated data from the database.

---

## 3. Component Architecture & Data Flow

```
                      RAW EXCEL FILE
                            │
                            ▼
                     Import UI Page
                            │
                            ▼
                 useAttendanceImport()
                  (Custom React Hook)
                            │
                  ┌─────────┴─────────┐
                  ▼                   ▼
             Excel Parser      Calendar Query
          (excel-parser.ts)   (Academic Calendar)
                  │                   │
                  └─────────┬─────────┘
                            ▼
                   UI Preview Overlay
                            │ (Confirmed)
                            ▼
                    POST /api/import
                            │
                            ▼
                    Backend Controller
                            │
                            ▼
                Attendance Service/Repository
                            │
                            ▼
                  [START TRANSACTION]
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
         Insert Sheet    Delete Old    Bulk Insert
          Metadata        Records        Records
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                   [COMMIT / ROLLBACK]
```

---

## 4. Proposed Changes

### Frontend
1. **`frontend/src/lib/import/excel-parser.ts` (NEW):**
   * Excel column index mappings and cell readers.
   * Period (month/year) auto-detection from filename.
   * `parseRawExcelSheet()` function returning raw row arrays.
2. **`frontend/src/lib/import/useAttendanceImport.ts` (NEW):**
   * Uses React state machine to track `idle`, `parsing`, `importing`, `success`, `error`.
   * Integrates the calendar holidays query.
   * Wraps the `useImportAttendance` mutation hook.
   * Exposes preview data and trigger methods.
3. **`frontend/src/routes/import.tsx` (MODIFY):**
   * Completely thin UI component containing form views, status indicators, preview lists, and file selectors.

### Backend
1. **`backend/src/repositories/monthly-attendance.repository.js` (MODIFY):**
   * Wrap operations inside `db.transaction()`.
   * Run all queries inside the transaction block on the connection instance parameter (`conn.query`).
