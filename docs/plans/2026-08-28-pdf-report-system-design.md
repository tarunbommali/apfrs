# Design Doc: HTML-to-PDF Attendance Report and Email Dispatch System

**Date:** 2026-08-28  
**Topic:** HTML-to-PDF Report Generation and Email Dispatch Integration

---

## 1. Problem & Context
The current APFRS system sends text/HTML summaries via email and exports Excel spreadsheets. The administrators require a professional, formal two-page PDF report for each faculty member. This report needs to be available as a browser preview, individual PDF download, email attachment, and consolidated multi-faculty administrative export.

---

## 2. Requirements & Approved Decisions

1. **Single Canonical Report Data Structure:** Reuses database records loaded from `faculty_monthly_attendance`. Statistics and daily records are fetched directly from the database to ensure absolute consistency with the dashboard metrics.
2. **Single Shared HTML/CSS Template:** A printable A4 CSS page-break styled template is used for both browser previews (rendered via iframe or React shadow DOM) and backend PDF generation.
3. **HTML-to-PDF Generation:** Powered by a backend-integrated PDF engine. The engine compiles the template, populates the variables, and renders the PDF output.
4. **Consolidated PDF Generation:** Supports merging multiple faculty reports into a single file with page breaks separating faculty members, ordered deterministically by department and name.
5. **Durable Email Dispatch Integration:** The MySQL-backed background job queue reads generated PDF attachments and delivers them directly via the configured email provider (SMTP/Resend), preventing duplicate emails.
6. **Privacy Enforcement:** Faculty members can only download or preview their own report. The backend validates token identity (`req.user`) before serving individual reports.

---

## 3. Proposed Architecture & Data Flow

```
                      ┌──────────────────────┐
                      │    MySQL Database    │
                      │ (Monthly Attendance) │
                      └──────────┬───────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │  Report Data Builder │
                      │                      │
                      │   buildReportData    │
                      └──────────┬───────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │ HTML Report Template │
                      │                      │
                      │   (Print CSS A4)     │
                      └───────┬───────┬──────┘
                              │       │
                  ┌───────────┘       └─────────────┐
                  ▼                                 ▼
         ┌─────────────────┐              ┌─────────────────┐
         │ HTML Preview    │              │ HTML → PDF      │
         │ APFRS UI        │              │ (Puppeteer)     │
         └─────────────────┘              └────────┬────────┘
                                                   │
                                                   ▼
                                       ┌─────────────────────┐
                                       │  PDF Buffer/Output  │
                                       └──────────┬──────────┘
                                                  │
                                                  ▼
                                       ┌─────────────────────┐
                                       │ Email Dispatch      │
                                       │ Attachments Array   │
                                       └─────────────────────┘
```

### Components:

1. **`report.service.js` (NEW):**
   * Prepares canonical report data for a specific faculty member, month, and year.
   * Compiles HTML using a shared template (using mustache-like variable replacement).
   * Renders HTML to PDF buffer using `puppeteer`.
   * Combines multiple HTML bodies into a single PDF document for consolidated exports.
2. **`email.service.js` (MODIFY):**
   * Accept `attachments` in email payloads.
3. **`attendance.service.js` (MODIFY):**
   * During background job execution (`dispatch_attendance_batch`), call `reportService.generatePdf` for each faculty member, generating their individual PDF, and attaching it to the email payload.
4. **`admin.routes.js` & `faculty.routes.js` (MODIFY):**
   * Mount endpoints for previewing report HTML, downloading individual PDFs, and downloading consolidated administrative PDFs.
5. **Frontend Pages (MODIFY):**
   * Integrate Preview modal/component in Reports page and Dispatch cockpit.
   * Add options to download consolidated administrative PDFs.

---

## 4. PDF Rendering Library Selection

Since the project does not have a PDF library in the backend:
* **Selected Solution:** `puppeteer` (or `puppeteer-core` with system chrome).
* **Rationale:** It allows standard CSS (Flexbox, CSS variables, Google Fonts) to render exactly as it does in the browser. programmatic drawing (PDFKit) or obsolete engines (PhantomJS) fail to render complex layouts and fonts correctly, causing visual mismatches with the preview.

---

## 5. Verification Plan

* **Automated Tests:**
  * Build & Lint: `npm run lint` and `npm run build`.
* **Manual Verification:**
  * Verify that previewing a report displays the correct metrics, matching the dashboard.
  * Verify that downloading an individual PDF yields a beautiful 2-page document.
  * Verify that consolidated PDF download places each faculty member on a new page.
  * Verify that email delivery attaches the correct individual PDF.
