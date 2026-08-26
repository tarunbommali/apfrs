# APFRS — Frontend Documentation

> **A**ttendance & **P**ayroll **F**aculty **R**eporting **S**ystem  
> Frontend Design, Data-Flow & API Reference

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Directory Structure](#2-project-directory-structure)
3. [Application Bootstrap & Entry Point](#3-application-bootstrap--entry-point)
4. [Global State Architecture](#4-global-state-architecture)
   - 4.1 [AuthContext](#41-authcontext)
   - 4.2 [AttendanceContext](#42-attendancecontext)
   - 4.3 [LocalStorage Stores](#43-localstorage-stores)
5. [Routing Architecture](#5-routing-architecture)
6. [Data Flow Overview](#6-data-flow-overview)
   - 6.1 [Excel Upload → Attendance Data Flow](#61-excel-upload--attendance-data-flow)
   - 6.2 [Authentication Data Flow](#62-authentication-data-flow)
   - 6.3 [Email Sending Data Flow](#63-email-sending-data-flow)
7. [Pages Reference](#7-pages-reference)
8. [Component Design](#8-component-design)
   - 8.1 [Layout Components](#81-layout-components)
   - 8.2 [Shared / Common Components](#82-shared--common-components)
   - 8.3 [Report Components](#83-report-components)
   - 8.4 [UI Primitives](#84-ui-primitives)
9. [Core Modules (Business Logic)](#9-core-modules-business-logic)
10. [Utility Modules](#10-utility-modules)
11. [Backend API Reference](#11-backend-api-reference)
    - 11.1 [Auth Endpoints](#111-auth-endpoints)
    - 11.2 [Admin Endpoints](#112-admin-endpoints)
    - 11.3 [Faculty Endpoints](#113-faculty-endpoints)
    - 11.4 [Email Endpoints](#114-email-endpoints)
    - 11.5 [Health Endpoint](#115-health-endpoint)
    - 11.6 [Legacy Route Aliases](#116-legacy-route-aliases)
12. [Frontend API Service Layer](#12-frontend-api-service-layer)
13. [Environment Variables](#13-environment-variables)
14. [Build & Dev Configuration](#14-build--dev-configuration)

---

## 1. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | 19.x |
| Build Tool | Vite | 7.x |
| Routing | React Router DOM | 7.x |
| Styling | Tailwind CSS v4 | 4.x |
| Icons | Lucide React | 0.554.x |
| Charts | Recharts | 3.x |
| Excel Parsing | xlsx (SheetJS) | 0.18.x |
| PDF Generation | jsPDF + AutoTable | 3.x / 5.x |
| Date Handling | dayjs | 1.11.x |
| Notifications | React Toastify | 11.x |
| Calendar UI | react-calendar | 6.x |

---

## 2. Project Directory Structure

```
apfrs/
├── index.html                   # Vite HTML entry point
├── vite.config.js               # Vite + Tailwind + proxy config
├── package.json                 # Workspace dependencies
├── .env                         # Root environment variables
│
├── src/                         # Frontend source
│   ├── main.jsx                 # React DOM render root
│   ├── App.jsx                  # Route definitions + Provider wrappers
│   ├── index.css                # Global Tailwind + custom CSS
│   │
│   ├── api/
│   │   └── emailService.js      # Email API calls (local → external fallback)
│   │
│   ├── config/
│   │   ├── calendar.js          # Academic calendar config (holidays)
│   │   ├── constants.js         # App-wide constants (status codes, month names)
│   │   └── theme.js             # CSS design tokens / theme config
│   │
│   ├── contexts/
│   │   ├── AuthContext.jsx      # JWT auth state + login/logout/refresh
│   │   └── AttendanceContext.jsx# Uploaded attendance data + persistence
│   │
│   ├── store/
│   │   ├── smtpConfig.js        # SMTP config CRUD (localStorage-backed)
│   │   └── emailStatus.js       # Per-employee email delivery status store
│   │
│   ├── core/                    # Pure business-logic (no React)
│   │   ├── attendance/
│   │   │   ├── calculations.js  # Attendance % / summary computation
│   │   │   ├── processor.js     # Excel raw → structured employee records
│   │   │   ├── status.js        # Attendance status helpers
│   │   │   └── validators.js    # Data validation rules
│   │   ├── calendar/
│   │   │   ├── workingDays.js   # Holiday & working-day computation
│   │   │   └── dateUtils.js     # Duration parsing / time helpers
│   │   └── email/
│   │       ├── templates.js     # HTML email body generator
│   │       └── styles.js        # Inline CSS for email templates
│   │
│   ├── utils/
│   │   ├── storage.js           # localStorage helpers
│   │   ├── data/faculty.js      # Faculty data utilities / mappers
│   │   ├── email/               # Email utility helpers
│   │   ├── export/              # PDF / CSV export utilities
│   │   ├── helpers/             # Generic pure helper functions
│   │   └── report/              # Report generation (PDF base64)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── DashboardLayout.jsx  # Shell: sidebar + header + <main>
│   │   │   └── Sidebar.jsx          # Navigation sidebar (role-aware)
│   │   ├── report/
│   │   │   ├── EmailActions.jsx     # Email send controls
│   │   │   ├── FacultyTable.jsx     # Attendance data table
│   │   │   ├── ReportBody.jsx       # Report content wrapper
│   │   │   ├── ReportOverview.jsx   # Summary numbers strip
│   │   │   ├── StatsCards.jsx       # KPI stat card grid
│   │   │   └── SummaryHeader.jsx    # Report header section
│   │   ├── ui/
│   │   │   ├── Badge.jsx            # Status badge pill
│   │   │   ├── Button.jsx           # Button variants
│   │   │   ├── Card.jsx             # Card with header/body/footer
│   │   │   ├── Input.jsx            # Styled text input
│   │   │   ├── Label.jsx            # Form label
│   │   │   ├── Modal.jsx            # Dialog overlay
│   │   │   ├── Select.jsx           # Dropdown select
│   │   │   ├── StatCard.jsx         # KPI metric card
│   │   │   ├── StatusBanner.jsx     # Alert / banner strip
│   │   │   ├── Toggle.jsx           # Toggle switch
│   │   │   └── index.js             # Barrel export
│   │   ├── AttendanceSummary.jsx
│   │   ├── CalendarView.jsx
│   │   ├── EmployeeCard.jsx
│   │   ├── EmployeeHeader.jsx
│   │   ├── ErrorDisplay.jsx
│   │   ├── FileUpload.jsx
│   │   ├── Footer.jsx
│   │   ├── Header.jsx
│   │   ├── Instructions.jsx
│   │   ├── LoadingIndicator.jsx
│   │   ├── ManageCalendar.jsx
│   │   ├── MonthCalendar.jsx
│   │   ├── MoveToTop.jsx
│   │   └── ProtectedRoute.jsx
│   │
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── FacultyProfile.jsx
│   │   ├── ImportData.jsx
│   │   ├── Reports.jsx
│   │   ├── FacultySummary.jsx
│   │   ├── DetailedView.jsx
│   │   ├── WeeklyReport.jsx
│   │   ├── DepartmentReport.jsx
│   │   ├── DailyReport.jsx
│   │   ├── EmailPreview.jsx
│   │   ├── StatusDashboard.jsx
│   │   ├── ConsolidatedReport.jsx
│   │   ├── AcademicCalendar.jsx
│   │   ├── Administration.jsx
│   │   ├── ConfigureSMTP.jsx
│   │   └── PageLayout.jsx
│   │
│   ├── assets/                  # Static assets (images, SVGs)
│   └── styles/                  # Additional CSS files
│
└── backend/                     # Express.js backend
    ├── server.js                # Backend entry
    └── src/
        ├── server.js            # Express app factory
        ├── routes/              # API route definitions
        ├── controllers/         # Request handlers
        ├── services/            # Business-logic services
        ├── models/              # Data models (User, Attendance)
        ├── repositories/        # Data access layer
        ├── middleware/          # Auth, RBAC, rate-limiting, validation
        ├── validators/          # Request schemas
        ├── config/              # DB / env config
        └── utils/               # Server utility helpers
```

---

## 3. Application Bootstrap & Entry Point

### `src/main.jsx`

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

### `src/App.jsx` — Provider Tree & Route Definitions

The root component wraps the entire app in three context layers:

```
<AuthProvider>           ← JWT auth state (user, token, login, logout)
  <AttendanceProvider>   ← Excel data state (attendanceData, month, year)
    <Router>             ← BrowserRouter
      <AppContent />     ← Route definitions
    </Router>
  </AttendanceProvider>
</AuthProvider>
```

**`AttendanceGate`** — An inline guard component that:
- Shows a "Loading saved attendance data..." fallback while `AttendanceContext` hydrates from `localStorage`
- Redirects to `/` if no attendance data is currently loaded (`hasData === false`)

**`AppContent`** — Reads from `useAttendance()` to access `loading`, `error`, `handleFileUpload`, and `resetData` for global feedback display.

---

## 4. Global State Architecture

### 4.1 AuthContext

**File:** `src/contexts/AuthContext.jsx`

Manages JWT-based authentication. Persists session to `localStorage` under key `apfrs_auth`.

#### Exposed API via `useAuth()`

| Property / Method | Type | Description |
|---|---|---|
| `user` | `Object \| null` | `{ id, name, role, email, department }` |
| `token` | `string \| null` | JWT bearer token |
| `isLoading` | `boolean` | `true` while hydrating from localStorage on mount |
| `authError` | `string \| null` | Last authentication error |
| `isAuthenticated` | `boolean` | `true` when both `user` and `token` are present |
| `isAdmin` | `boolean` | `user.role === 'admin'` |
| `isFaculty` | `boolean` | `user.role === 'faculty'` |
| `login(email, password)` | `async fn` | Calls `POST /api/auth/login` |
| `logout()` | `async fn` | Calls `POST /api/auth/logout`, clears localStorage |
| `refreshUser()` | `async fn` | Re-fetches profile from `GET /api/auth/me` |
| `hasRole(role)` | `fn → boolean` | Checks `user.role` against the required role |
| `authHeaders()` | `fn → Object` | Returns `{ Content-Type, Authorization: Bearer <token> }` |

**Helper exports:**
- `getStoredAuth()` — reads parsed auth from localStorage
- `getAuthToken()` — returns token string or null (used by `emailService.js`)

#### Auth localStorage Schema

```json
{
  "apfrs_auth": {
    "user": { "id": "...", "name": "Dr. Smith", "role": "admin", "email": "smith@example.com" },
    "token": "eyJ..."
  }
}
```

#### Session Restoration Flow (on page reload)

```
AuthProvider mounts
  └─ useEffect: reads localStorage["apfrs_auth"]
       ├─ if { user, token } found → setUser / setToken
       └─ finally → setIsLoading(false)
```

---

### 4.2 AttendanceContext

**File:** `src/contexts/AttendanceContext.jsx`

Central data store for all processed attendance records. Persists across page refreshes via localStorage.

#### Exposed API via `useAttendance()`

| Property / Method | Type | Description |
|---|---|---|
| `attendanceData` | `Array<EmployeeRecord>` | All processed faculty records |
| `fileName` | `string` | Name of the uploaded Excel file |
| `selectedMonth` | `number (1–12)` | Active report month |
| `selectedYear` | `number` | Active report year |
| `customHolidays` | `Object` | `{ "month-day": "holiday" }` — user-defined overrides |
| `loading` | `boolean` | `true` while file is being processed |
| `error` | `string \| null` | Processing error message |
| `ready` | `boolean` | `true` after localStorage hydration completes |
| `hasData` | `boolean` | `attendanceData.length > 0` |
| `handleFileUpload(file, rawData, month, year)` | `async fn → boolean` | Processes Excel file via `core/attendance/processor.js` |
| `resetData()` | `fn` | Clears all state + localStorage |
| `toggleHoliday(monthIndex, day)` | `fn` | Adds/removes a custom holiday for calendar |

#### Attendance localStorage Keys

| Key | Value |
|---|---|
| `apfrsAttendanceReport` | JSON array of `EmployeeRecord[]` |
| `apfrsSelectedMonth` | Number string e.g. `"11"` |
| `apfrsSelectedYear` | Number string e.g. `"2025"` |
| `apfrsCustomHolidays` | JSON object `{ "11-15": "holiday" }` |

#### `EmployeeRecord` Shape

```js
{
  name: string,
  email: string,
  cfmsId: string,
  department: string,
  designation: string,
  attendance: [
    {
      date: string,
      status: 'P' | 'A' | 'L' | 'H' | 'HD' | 'Late',
      duration?: string   // "HH:MM:SS"
    }
  ]
}
```

---

### 4.3 LocalStorage Stores

#### SMTP Config Store — `src/store/smtpConfig.js`

Manages one or more SMTP email server profiles, persisted in localStorage.

**Storage Keys:**
- `smtpConfigs` — JSON array of SMTP config objects
- `smtpActiveConfigId` — ID of the currently active config
- `smtpConfig` *(legacy key)* — auto-migrated on first read

**Key Exported Functions:**

| Function | Description |
|---|---|
| `getSMTPConfig()` | Returns the active SMTP config |
| `listSMTPConfigs()` | Returns all saved configs |
| `saveSMTPConfigEntry(config)` | Create or update a config entry |
| `deleteSMTPConfigEntry(id)` | Remove a config by ID |
| `setActiveSMTPConfig(id)` | Switch the active config |
| `toggleSMTPConfigStatus(id, disabled)` | Enable / disable a config |
| `validateSMTPConfig(config)` | Returns `{ isValid, error }` |
| `createSMTPEmailPayload(config, emailData)` | Builds the full API request payload |
| `getEnvironmentSMTPConfig()` | Returns SMTP from Vite env vars (if set) |
| `clearSMTPConfigs()` | Wipes all configs from storage |

**SMTP Config Object Schema:**

```js
{
  id: string,          name: string,      provider: string,
  host: string,        port: string,      secure: boolean,
  security: string,    user: string,      pass: string,
  subject: string,     fromName: string,  testRecipient: string,
  notes: string,       isActive: boolean, isDisabled: boolean,
  createdAt: ISOString, updatedAt: ISOString
}
```

**Environment Variable Fallback:**  
If `VITE_SMTP_HOST`, `VITE_SMTP_USER`, and `VITE_SMTP_PASS` are all set, an `env_smtp_config` entry is automatically injected as the default active config.

**Events:** Dispatches `smtp-config-updated` CustomEvent on every write.

---

#### Email Status Store — `src/store/emailStatus.js`

Tracks per-employee email delivery status per month.

**Storage Key:** `apfrs_email_status`

**Status Schema:**

```js
{
  "email@example.com": {
    month: "2025-11",
    status: "sent" | "failed" | "pending",
    timestamp: number,
    updatedAt: ISOString,
    error: string | null,
    messageId: string | null,
    retryCount: number
  }
}
```

**Key Exported Functions:**

| Function | Description |
|---|---|
| `getEmailStatus(email)` | Get status record for one email |
| `setEmailSent(email, month, opts)` | Mark as sent (stores `messageId`) |
| `setEmailFailed(email, month, error)` | Mark as failed, increments `retryCount` |
| `setEmailPending(email, month)` | Mark as pending |
| `wasEmailSent(email, month)` | Boolean check for sent status |
| `getFailedEmails(month)` | Array of failed records for a month |
| `getPendingEmails(month)` | Array of pending records for a month |
| `getMonthSummary(month)` | `{ total, sent, failed, pending }` |
| `bulkUpdateStatus(updates[])` | Batch status update |
| `clearEmailStatus(email)` | Clear one entry |
| `clearEmailStatusStore()` | Wipe all entries |

**Events:** Dispatches `email-status-updated` CustomEvent on every write (consumed by `StatusDashboard`).

---

## 5. Routing Architecture

All routes are defined in `src/App.jsx`.

### Complete Route Map

| Path | Component | Guard | Layout |
|---|---|---|---|
| `/login` | `LoginPage` | Public | None |
| `/faculty-profile` | `FacultyProfile` | `ProtectedRoute(faculty)` | None |
| `/admin-dashboard` | `AdminDashboard` | `ProtectedRoute(admin)` | None |
| `/` | `HomePage` | None | `DashboardLayout` |
| `/import` | `ImportData` | `ProtectedRoute(admin)` | `DashboardLayout` |
| `/reports` | `Reports` | `AttendanceGate` | `DashboardLayout` |
| `/summary/:year/:month` | `Reports` | `AttendanceGate` | `DashboardLayout` |
| `/summary` | Redirect → `/reports?tab=monthly` | `AttendanceGate` | `DashboardLayout` |
| `/weekly/:year/:month/:week` | `Reports` | `AttendanceGate` | `DashboardLayout` |
| `/weekly` | Redirect → `/reports?tab=weekly` | `AttendanceGate` | `DashboardLayout` |
| `/department` | Redirect → `/reports?tab=department` | `AttendanceGate` | `DashboardLayout` |
| `/daily/:year/:month/:day` | `Reports` | `AttendanceGate` | `DashboardLayout` |
| `/daily` | Redirect → `/reports?tab=daily` | `AttendanceGate` | `DashboardLayout` |
| `/detailed` | `DetailedView` | `AttendanceGate` | `DashboardLayout` |
| `/email-preview` | `EmailPreview` | `ProtectedRoute(admin)` + `AttendanceGate` | `DashboardLayout` |
| `/status-dashboard` | `StatusDashboard` | `ProtectedRoute(admin)` + `AttendanceGate` | `DashboardLayout` |
| `/consolidated` | `ConsolidatedReport` | `ProtectedRoute(admin)` + `AttendanceGate` | `DashboardLayout` |
| `/calendar` | `AcademicCalendar` | None | `DashboardLayout` |
| `/admin` | `Administration` | `ProtectedRoute(admin)` | `DashboardLayout` |
| `*` | Redirect → `/` | — | — |

### Route Guards

**`ProtectedRoute`** (`src/components/ProtectedRoute.jsx`)

```
Props: children, role ('admin' | 'faculty'), redirectTo (default: '/login')

isLoading === true
  └─ Render fullscreen spinner ("Verifying session…")

!isAuthenticated
  └─ <Navigate to="/login" state={{ from: location }} replace />

role && !hasRole(role)
  └─ <Navigate to={admin ? '/admin-dashboard' : '/faculty-profile'} replace />

else → render children
```

**`AttendanceGate`** (inline in `App.jsx`)

```
!ready
  └─ Render "Loading saved attendance data..." fallback

!hasData
  └─ <Navigate to="/" replace />

else → render children
```

---

## 6. Data Flow Overview

### 6.1 Excel Upload → Attendance Data Flow

```
User selects / drops .xlsx file
        │
        ▼
FileUpload.jsx
  FileReader.readAsArrayBuffer()
        │
        ▼
XLSX.read(buffer) → rawSheetData  [SheetJS]
        │
        ▼
AttendanceContext.handleFileUpload(file, rawData, month, year)
        │
        ▼
core/attendance/processor.js → handleExcelUpload(rawData, fileName, month, year)
  ├─ Detects header row
  ├─ Maps columns: Name, CFMS ID, Email, Department, Designation, date columns
  ├─ Normalizes status codes:  P / A / L / H / HD / Late
  └─ Returns Array<EmployeeRecord>
        │
        ▼
AttendanceContext state update:
  setAttendanceData(processedData)
  setSelectedMonth(month)
  setSelectedYear(year)
        │
        ▼
localStorage persisted:
  apfrsAttendanceReport  ← JSON array
  apfrsSelectedMonth     ← "11"
  apfrsSelectedYear      ← "2025"
        │
        ▼
AttendanceGate.hasData = true → Report routes become accessible
        │
        ▼
Report pages call:
  core/attendance/calculations.js → calculateSummary(employee, month, year)
    ├─ Gets holiday list from config/calendar.js
    ├─ Computes presentDays, absentDays, leaveDays, totalHours
    └─ Returns SummaryObject { attendancePercentage, workingDays, holidays, … }
        │
        ▼
Recharts charts + FacultyTable render report data
```

---

### 6.2 Authentication Data Flow

```
User submits LoginPage form (email, password)
        │
        ▼
AuthContext.login(email, password)
        │
        ▼
POST http://localhost:8001/api/auth/login
  Body: { email, password }
        │
   ┌────┴──────────────┐
success               error
   │                     │
data.token            setAuthError(msg)
data.user             return { success: false }
   │
   ▼
persistAuth(user, token)
  localStorage["apfrs_auth"] = { user, token }
  setUser(user) / setToken(token)
   │
   ▼
ProtectedRoute renders children
Sidebar shows role-based navigation (Admin Portal / Faculty Portal)
DashboardLayout shows user avatar with role badge
```

---

### 6.3 Email Sending Data Flow

```
Admin triggers send (EmailPreview / ConsolidatedReport / FacultySummary)
        │
        ▼
src/api/emailService.js → sendIndividualReport(employee, config, month, year)
        │
   ┌────┴────────────────────────────────┐
   │                                     │
   ▼                                     ▼
calculateSummary(employee, month, year)  getSMTPConfig()
  → SummaryObject                          → SMTP config { host, port, user, pass }
        │                                     │
        └──────────────┬──────────────────────┘
                       │
                       ▼
             generateEmailHTML(employee, summary, config, periodLabel)
               core/email/templates.js → HTML string
                       │
                       ▼
             generatePDFBase64({ employee, summary, month, year })
               utils/report/index.js → jsPDF → base64 string
                       │
                       ▼
             setEmailPending(email, periodKey)
               store/emailStatus.js → localStorage
                       │
                       ▼
             sendEmail(payload, config)
               │
          Try: POST http://localhost:8001/api/send-email
               │
          ┌────┴────────────────────────────┐
        OK (2xx)                     Failed / Timeout
          │                                 │
        return response        Fallback: POST https://api.apfrs.jntugv.in/api/send-email
                                            │
                                    OK → return response
                                    Fail → throw error
                       │
                       ▼
           ┌───────────┴───────────┐
         Success                 Error
           │                       │
setEmailSent(email, periodKey)  setEmailFailed(email, periodKey, error.message)
           │
           ▼
StatusDashboard re-reads status via "email-status-updated" window event
```

**Retry strategy:** Up to 2 retries with exponential backoff (800 ms base) + ±200 ms jitter. Only retries on HTTP 5xx or `AbortError` (timeout). 4xx errors are NOT retried.

---

## 7. Pages Reference

### `HomePage` — `/`

**File:** `src/pages/HomePage.jsx` (6.9 KB)

Landing page. Always accessible (no auth guard).

**Renders:**
- Welcome banner with app branding
- `FileUpload` component (drag-drop Excel uploader)
- `Instructions` panel
- Quick-navigate cards to reports (visible only if `hasData === true`)

---

### `LoginPage` — `/login`

**File:** `src/pages/LoginPage.jsx` (18.7 KB)

Full-screen login form. Rendered **outside** `DashboardLayout`.

**Behaviour:**
- Calls `AuthContext.login(email, password)`
- On success → redirects to `state.from` (preserved URL) or role-appropriate home
- Displays `authError` inline below the form fields

---

### `AdminDashboard` — `/admin-dashboard`

**File:** `src/pages/AdminDashboard.jsx` (24.7 KB)

Admin-only portal. Rendered **outside** `DashboardLayout`.

**API calls:**
- `GET /api/admin/faculty` — faculty list
- `GET /api/admin/stats` — platform stats
- `POST/PUT/DELETE /api/admin/faculty` — faculty CRUD
- `GET /api/admin/attendance/batches` — email batch history

---

### `FacultyProfile` — `/faculty-profile`

**File:** `src/pages/FacultyProfile.jsx` (9.3 KB)

Faculty-only portal. Rendered **outside** `DashboardLayout`.

**API calls:**
- `GET /api/faculty/profile` — own profile
- `GET /api/faculty/attendance` — own attendance records
- `GET /api/faculty/department` — department stats

---

### `ImportData` — `/import`

**File:** `src/pages/ImportData.jsx` (9.4 KB)

Admin-only. Wraps `FileUpload` with additional controls:
- Month & year selectors
- Calls `AttendanceContext.handleFileUpload()`
- Shows processing status and validation errors

---

### `Reports` — `/reports`

**File:** `src/pages/Reports.jsx` (62 KB — largest page)

Tabbed report hub. Active tab driven by `?tab=` query param or URL pattern.

| Tab Query | Route Pattern | Content |
|---|---|---|
| `monthly` (default) | `/reports` | Monthly faculty summary |
| `weekly` | `/weekly/:year/:month/:week` | Weekly breakdown |
| `department` | `/department` | Department-grouped view |
| `daily` | `/daily/:year/:month/:day` | Single-day snapshot |

Uses `useAttendance()` for data, `calculateSummary()` for per-faculty metrics, Recharts for charts.

---

### `FacultySummary` — (sub-component used in Reports)

**File:** `src/pages/FacultySummary.jsx` (14.7 KB)

Monthly summary table:
- Iterates `attendanceData`, calls `calculateSummary()` per employee
- Renders `FacultyTable`, `StatsCards`, `SummaryHeader`
- Email send button (admin only) calls `sendIndividualReport()`

---

### `DetailedView` — `/detailed`

**File:** `src/pages/DetailedView.jsx` (7.4 KB)

Day-by-day attendance grid per faculty. Shows status codes with colour-coded cells.

---

### `WeeklyReport` — (tab in Reports)

**File:** `src/pages/WeeklyReport.jsx` (18.2 KB)

Weekly breakdown by selected week number within the month.

---

### `DepartmentReport` — (tab in Reports)

**File:** `src/pages/DepartmentReport.jsx` (20.7 KB)

Attendance grouped by department. Bar/pie charts via Recharts.

---

### `DailyReport` — (tab in Reports)

**File:** `src/pages/DailyReport.jsx` (21.6 KB)

Single-day snapshot showing present / absent / leave counts by department.

---

### `ConsolidatedReport` — `/consolidated`

**File:** `src/pages/ConsolidatedReport.jsx` (21 KB) — Admin only.

Multi-faculty bulk email dispatcher:
- Shows overall attendance stats
- Allows recipient selection with checkboxes
- Calls `sendIndividualReport()` sequentially with live progress bar
- Reads `emailStatus` store to show sent / failed / pending badges per faculty

---

### `StatusDashboard` — `/status-dashboard`

**File:** `src/pages/StatusDashboard.jsx` (24.5 KB) — Admin only.

Real-time email delivery status board:
- Listens to `email-status-updated` window CustomEvent for live updates
- Displays per-employee status badge (sent / failed / pending)
- Retry button for failed sends
- Fetches batch history from `GET /api/admin/attendance/batches`

---

### `EmailPreview` — `/email-preview`

**File:** `src/pages/EmailPreview.jsx` (10.7 KB) — Admin only.

Live HTML preview of the attendance email template:
- Faculty selector dropdown
- Renders `generateEmailHTML()` output in a sandboxed `<iframe>`
- Test send to SMTP `testRecipient` address

---

### `AcademicCalendar` — `/calendar`

**File:** `src/pages/AcademicCalendar.jsx` (1 KB) — Public.

Thin wrapper that renders the `ManageCalendar` component for viewing and editing the academic calendar.

---

### `Administration` — `/admin`

**File:** `src/pages/Administration.jsx` — Admin only.

Renders `ConfigureSMTP` for complete email server management.

---

### `ConfigureSMTP` — (rendered inside Administration)

**File:** `src/pages/ConfigureSMTP.jsx` (25 KB) — Admin only.

Full SMTP configuration manager:
- List, add, edit, delete SMTP profiles
- Switch the active SMTP config
- Test connection via `testSMTPConnection()` → `POST /api/test-smtp`
- All data read/written through `store/smtpConfig.js`

---

## 8. Component Design

### 8.1 Layout Components

#### `DashboardLayout` — `src/components/layout/DashboardLayout.jsx`

Shell for all non-auth pages.

```
┌─────────────────────────────────────────────┐
│  Sidebar (sticky, 288px wide on lg)         │
│  ┌───────────────────────────────────────┐  │
│  │ Brand Logo + "APFRS" wordmark         │  │
│  │ Role label (Admin Portal / Faculty /  │  │
│  │            Attendance System)         │  │
│  │                                       │  │
│  │ Nav Section: Role Portal              │  │
│  │ Nav Section: Main                     │  │
│  │ Nav Section: Reports                  │  │
│  │ Nav Section: Communication (admin)    │  │
│  │ Nav Section: Configuration            │  │
│  │                                       │  │
│  │ Auth Footer (user card + logout)      │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Main Column (flex-1)                       │
│  ┌──────────────────────────────────────┐   │
│  │ Sticky Header Bar                    │   │
│  │  [Menu icon]  APFRS  [User Avatar]   │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ <main>  max-w-7xl  p-4/6/8           │   │
│  │   {children}                         │   │
│  │   <MoveToTop />                      │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Props:** `children: ReactNode`

**Reads from context:**
- `useAttendance()` → `hasData` (passed to Sidebar to disable/enable nav items)
- `useAuth()` → `isAuthenticated`, `user`, `isAdmin`

**Mobile behaviour:** Sidebar is hidden off-screen on `< lg`. Menu icon in the header opens it as a slide-over drawer with a dark backdrop overlay.

---

#### `Sidebar` — `src/components/layout/Sidebar.jsx`

**Props:** `isOpen: boolean`, `onClose: fn`, `hasData: boolean`

**Navigation Sections & Visibility:**

| Section | Items | Condition |
|---|---|---|
| Role Portal | Admin Dashboard | `isAuthenticated && isAdmin` |
| Role Portal | My Profile | `isAuthenticated && isFaculty` |
| Main | Home | Always |
| Main | Import Data | `!isAuthenticated \|\| isAdmin` |
| Reports | Attendance Reports | Always; `disabled={!hasData}` |
| Reports | Detailed View | Always; `disabled={!hasData}` |
| Communication | Status Dashboard | `!isAuthenticated \|\| isAdmin`; `disabled={!hasData}` |
| Communication | Consolidated Report | `!isAuthenticated \|\| isAdmin`; `disabled={!hasData}` |
| Communication | Email Template | `!isAuthenticated \|\| isAdmin`; `disabled={!hasData}` |
| Configuration | Academic Calendar | Always |
| Configuration | Email Configuration | `!isAuthenticated \|\| isAdmin` |
| Auth Footer | User info + Sign Out | `isAuthenticated` |
| Auth Footer | Sign In button | `!isAuthenticated` |

---

### 8.2 Shared / Common Components

| Component | File | Key Props | Purpose |
|---|---|---|---|
| `ProtectedRoute` | `ProtectedRoute.jsx` | `children, role, redirectTo` | Auth / RBAC route guard |
| `FileUpload` | `FileUpload.jsx` | `onUpload, loading` | Drag-drop + click Excel uploader (14 KB) |
| `CalendarView` | `CalendarView.jsx` | `month, year, attendance` | Interactive monthly attendance calendar |
| `MonthCalendar` | `MonthCalendar.jsx` | `month, year, onDayClick` | Month grid for holiday management |
| `ManageCalendar` | `ManageCalendar.jsx` | — | Full academic calendar admin (13.8 KB) |
| `AttendanceSummary` | `AttendanceSummary.jsx` | `summary` | Mini attendance stats block |
| `EmployeeCard` | `EmployeeCard.jsx` | `employee` | Compact faculty info card |
| `EmployeeHeader` | `EmployeeHeader.jsx` | `employee, summary` | Full faculty detail header (4.8 KB) |
| `ErrorDisplay` | `ErrorDisplay.jsx` | `error: string` | Styled error alert block |
| `LoadingIndicator` | `LoadingIndicator.jsx` | — | Fullscreen spinner overlay |
| `MoveToTop` | `MoveToTop.jsx` | — | Floating scroll-to-top button |
| `Instructions` | `Instructions.jsx` | — | Static usage instructions panel |
| `Header` | `Header.jsx` | — | Legacy standalone header (12.8 KB) |
| `Footer` | `Footer.jsx` | — | Page footer |

---

### 8.3 Report Components

Located in `src/components/report/`

| Component | Key Props | Purpose |
|---|---|---|
| `FacultyTable` | `data[], month, year, onEmailSend` | Sortable / filterable attendance table with status badges and row actions |
| `StatsCards` | `overallStats` | Grid of KPI metric cards (total, present, absent, percentage) |
| `SummaryHeader` | `month, year, fileName, totalFaculty` | Report title and period header bar |
| `ReportOverview` | `stats` | Compact summary numbers strip |
| `ReportBody` | `children` | Wrapper with consistent padding |
| `EmailActions` | `employees[], config, month, year` | Send / bulk-send controls with real-time progress indicator |

---

### 8.4 UI Primitives

Located in `src/components/ui/` — all exported via `index.js`.

| Component | Key Props | Description |
|---|---|---|
| `Card` | `className, children` | Rounded white card; sub-components: `CardHeader`, `CardBody`, `CardFooter`, `CardTitle`, `CardDescription` |
| `Button` | `variant, size, disabled, onClick` | Variants: `primary`, `secondary`, `danger`, `ghost` |
| `Input` | `type, value, onChange, placeholder` | Styled `<input>` with consistent focus ring |
| `Select` | `value, onChange, options[]` | Styled `<select>` dropdown |
| `Badge` | `variant, children` | Status pill — variants: `success`, `error`, `warning`, `info`, `neutral` |
| `Modal` | `isOpen, onClose, title, children` | Portal overlay dialog |
| `StatCard` | `label, value, icon, color, change` | KPI card with optional trend indicator |
| `StatusBanner` | `type, message` | Full-width alert strip |
| `Toggle` | `checked, onChange, label` | Accessible toggle switch |
| `Label` | `htmlFor, children` | Form field label |

---

## 9. Core Modules (Business Logic)

All modules in `src/core/` are pure JavaScript — no React, no side effects.

### `core/attendance/processor.js`

**Main export:** `handleExcelUpload(rawData, fileName, month, year) → EmployeeRecord[]`

Processing steps:
1. Receives SheetJS-parsed workbook rows
2. Detects the header row (looks for Name, CFMS ID / Employee ID columns)
3. Maps each remaining column to a day-of-month date
4. For each data row → builds `EmployeeRecord` with `attendance[]` array
5. Normalizes all status strings to canonical values: `P | A | L | H | HD | Late`

---

### `core/attendance/calculations.js`

**Main exports:**

```js
calculateSummary(employee, monthNumber, year) → SummaryObject
calculateOverallStats(allEmployees, month, year) → OverallStatsObject
getAttendanceCategory(percentage) → 'good' | 'average' | 'poor'
```

**`SummaryObject` shape:**

```js
{
  presentDays: number,
  absentDays: number,
  leaveDays: number,
  totalDays: number,
  totalHours: number,
  formattedDuration: "HH:MM:SS",
  attendancePercentage: number,   // (presentDays / workingDays) * 100
  workingDays: number,            // totalDays - holidayCount
  holidays: number,
  effectiveDays: number
}
```

---

### `core/attendance/validators.js`

Validates processed `EmployeeRecord` data:
- Required fields presence (name, email, attendance array)
- Email format validation
- Attendance array length vs expected month days

---

### `core/attendance/status.js`

Helper functions for mapping raw status strings to display labels, CSS classes, and boolean flags (`isPresent`, `isAbsent`, `isLeave`, etc.).

---

### `core/calendar/workingDays.js`

- `getHolidays(month, totalDays, year)` → `Set<number>` of holiday day numbers
- `getWorkingDays(month, totalDays, year)` → total days minus holiday count
- `calculateWorkingDaysFromCalendar(month, year)` → full calendar-based working day count
- Sources holiday data from `src/config/calendar.js`

---

### `core/calendar/dateUtils.js`

- `parseDurationToHours(durationStr: "HH:MM:SS") → number` — converts duration string to decimal hours
- `estimateHoursFromTimes(inTime, outTime) → number` — estimates hours from punch-in / punch-out times

---

### `core/email/templates.js`

**Main export:** `generateEmailHTML(employee, summary, config, periodLabel) → string (HTML)`

Generates a complete, self-contained HTML email:
- College/institution header
- Attendance summary table with colour-coded cells
- Pass/Fail indicator based on percentage threshold
- Inline CSS from `core/email/styles.js`
- Fully compatible with major email clients

---

## 10. Utility Modules

| Module | Key Exports | Purpose |
|---|---|---|
| `utils/storage.js` | `getItem, setItem, removeItem` | Safe `localStorage` wrappers (no-throw) |
| `utils/data/faculty.js` | `mapFacultyData`, `normalizeFaculty` | Faculty data normalization and mapping (20 KB) |
| `utils/report/index.js` | `generatePDFBase64(opts)` | jsPDF attendance report → Base64 string for email attachment |
| `utils/export/` | CSV / Excel export utilities | Exports table data to downloadable files |
| `utils/helpers/` | Pure formatting / calculation helpers | Date formatting, number rounding, string utilities |
| `utils/email/` | Email-specific utilities | Recipient validation, batch chunking helpers |

---

## 11. Backend API Reference

**Local Base URL:** `http://localhost:8001/api`  
**External Fallback:** `https://api.apfrs.jntugv.in/api`

All JSON responses follow the shape: `{ success: boolean, data?: any, error?: string, message?: string }`

### 11.1 Auth Endpoints

| Method | Path | Auth | Body | Success Response |
|---|---|---|---|---|
| `POST` | `/api/auth/login` | Public (rate-limited) | `{ email, password }` | `{ success, user, token }` |
| `POST` | `/api/auth/refresh` | Public | `{ token }` | `{ success, token }` |
| `POST` | `/api/auth/logout` | Bearer Token | — | `{ success }` |
| `GET` | `/api/auth/me` | Bearer Token | — | `{ success, user }` |
| `POST` | `/api/auth/change-password` | Bearer Token | `{ currentPassword, newPassword }` | `{ success }` |

---

### 11.2 Admin Endpoints

> All require `Authorization: Bearer <token>` with `role = admin`

| Method | Path | Body | Success Response |
|---|---|---|---|
| `GET` | `/api/admin/faculty` | — | `{ success, data: User[] }` |
| `GET` | `/api/admin/faculty/:id` | — | `{ success, data: User }` |
| `POST` | `/api/admin/faculty` | `facultyCreateSchema` | `{ success, data: User }` |
| `PUT` | `/api/admin/faculty/:id` | `facultyUpdateSchema` | `{ success, data: User }` |
| `DELETE` | `/api/admin/faculty/:id` | — | `{ success }` |
| `GET` | `/api/admin/attendance/batches` | — | `{ success, data: Batch[] }` |
| `GET` | `/api/admin/attendance/send/:batchId` | — | `{ success, data: Batch }` |
| `POST` | `/api/admin/attendance/send` | `attendanceSendSchema` | `{ success, data: Batch }` |
| `GET` | `/api/admin/stats` | — | `{ success, data: StatsObject }` |

**`User` Model Fields:** `id`, `cfms_id`, `email`, `name`, `designation`, `department`, `mobile`, `job_status`, `role`, `isActive`, `createdAt`, `updatedAt`

**`Batch` Model Fields:** `id`, `batchId`, `status` (`pending|processing|sent|failed`), `totalFaculty`, `sentCount`, `failedCount`, `facultyList[]`, `results[]`, `month`, `year`, `progress`, `createdAt`, `completedAt`

---

### 11.3 Faculty Endpoints

> All require `Authorization: Bearer <token>` with `role = faculty OR admin`

| Method | Path | Success Response |
|---|---|---|
| `GET` | `/api/faculty/profile` | `{ success, data: UserProfile }` |
| `GET` | `/api/faculty/attendance` | `{ success, data: AttendanceRecord[] }` |
| `GET` | `/api/faculty/colleagues` | `{ success, data: User[] }` |
| `GET` | `/api/faculty/department` | `{ success, data: DeptStats }` |

---

### 11.4 Email Endpoints

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| `POST` | `/api/email/send` | Admin Bearer | `emailSchema` | Send one email with HTML body and optional PDF attachment |
| `POST` | `/api/email/bulk` | Admin Bearer | `bulkEmailSchema` | Send to multiple recipients |
| `POST` | `/api/email/test-smtp` | Public | `testSMTPSchema` | Test SMTP connection |
| `GET` | `/api/email/status/:id` | Public | — | Get delivery status for a message ID |

**`emailSchema` payload structure** (built by `createSMTPEmailPayload()`):

```json
{
  "config": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": { "user": "...", "pass": "..." },
    "companyName": "APFRS",
    "systemName": "Attendance System"
  },
  "emailData": {
    "from": { "name": "APFRS Reports", "address": "noreply@example.com" },
    "to": ["recipient@example.com"],
    "subject": "APFRS Attendance Report - November 2025",
    "html": "<html>...",
    "attachments": [
      {
        "filename": "attendance_report_CFMS123_2025_11.pdf",
        "content": "<base64>",
        "encoding": "base64",
        "contentType": "application/pdf"
      }
    ]
  }
}
```

---

### 11.5 Health Endpoint

| Method | Path | Auth | Response |
|---|---|---|---|
| `GET` | `/api/health` | Public | `{ status: "ok", timestamp: ISOString }` |

---

### 11.6 Legacy Route Aliases

Kept for backward compatibility — the frontend `emailService.js` calls these directly on the local backend:

| Method | Alias Path | Routes To |
|---|---|---|
| `POST` | `/api/send-email` | `emailController.sendEmail` |
| `POST` | `/api/send-bulk-email` | `emailController.sendBulkEmails` |
| `GET` | `/api/email-status/:id` | `emailController.getEmailStatus` |
| `POST` | `/api/test-smtp` | `emailController.testSMTP` |

---

## 12. Frontend API Service Layer

### `src/api/emailService.js`

Primary service for all email-related API calls. Implements a **local-first, external-fallback** strategy.

#### `sendEmail(payload, configOverride?)`

Low-level send function:
1. Resolves active SMTP config via `getSMTPConfig()` (or uses `configOverride`)
2. Validates config with `validateSMTPConfig()` — throws if invalid
3. Builds request body via `createSMTPEmailPayload(config, emailData)`
4. Tries `POST http://localhost:8001/api/send-email` (1 retry)
5. Falls back to `POST https://api.apfrs.jntugv.in/api/send-email` (2 retries)

#### `sendIndividualReport(employee, configOverride?, monthNumber, year)`

Full pipeline for sending one employee's attendance report:

```
1. Validate employee.email format
2. setEmailPending(email, periodKey)
3. calculateSummary(employee, month, year) → SummaryObject
4. generateEmailHTML(employee, summary, config, periodLabel) → HTML string
5. generatePDFBase64({ employee, summary, month, year }) → base64 string
6. sendEmail({ recipients, subject, body, isHtml: true, attachments: [pdf] })
7a. On success → setEmailSent(email, periodKey, { messageId })
7b. On failure → setEmailFailed(email, periodKey, error.message) + rethrow
```

**Returns** (on success):
```js
{
  ...emailResult,
  reportData: {
    employeeId, reportId, percentage,
    workingDays, holidays, generatedAt
  }
}
```

#### `testSMTPConnection(config)`

Tests SMTP credentials:
- Tries `POST http://localhost:8001/api/test-smtp` (5 s timeout)
- Falls back to `POST https://api.apfrs.jntugv.in/api/test-smtp` (15 s timeout)

#### `sendRequestWithRetry(url, options, retries)`

Internal retry helper:
- Max retries: configurable (default 2)
- Base delay: 800 ms × 2^attempt + random(0–200) ms jitter
- Retries only on: HTTP 5xx or `AbortError` (30 s request timeout)
- Does NOT retry 4xx client errors

---

## 13. Environment Variables

### Root `.env` (consumed by Vite — must be prefixed `VITE_` to be exposed to frontend)

| Variable | Default | Description |
|---|---|---|
| `VITE_DEV_SERVER_PORT` | `5000` | Vite dev server port |
| `VITE_BACKEND_PORT` | `8001` | Backend proxy target port |
| `VITE_EMAIL_API_URL` | `https://api.apfrs.jntugv.in/api` | External email API fallback base URL |
| `VITE_SMTP_HOST` | — | Pre-seed SMTP host (builds env_smtp_config) |
| `VITE_SMTP_USER` / `VITE_SMTP_EMAIL` | — | Pre-seed SMTP user email |
| `VITE_SMTP_PASS` / `VITE_SMTP_PASSWORD` | — | Pre-seed SMTP password |
| `VITE_SMTP_PORT` | `587` | Pre-seed SMTP port |
| `VITE_SMTP_SECURE` | — | Pre-seed TLS flag (`true`/`false`) |
| `VITE_SMTP_SECURITY` | — | Security protocol override |
| `VITE_SMTP_SUBJECT` | `APFRS Attendance Report` | Default email subject |
| `VITE_SMTP_FROM_NAME` | `APFRS Reports` | Email From display name |
| `VITE_SMTP_TEST_RECIPIENT` | *(SMTP user)* | Test send recipient |
| `VITE_SMTP_CONFIG_NAME` | `Environment SMTP` | Label for env-sourced config |

### Backend `.env`

| Variable | Description |
|---|---|
| `PORT` | Express server port (default `8001`) |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `SMTP_HOST` / `SMTP_EMAIL` / `SMTP_PASSWORD` | Server-side SMTP (used by nodemailer) |
| `DB_PATH` | Path to the database file |

---

## 14. Build & Dev Configuration

### Vite Config — `vite.config.js`

```js
plugins: [react(), tailwindcss()]

server: {
  host: '0.0.0.0',
  port: 5000,              // from VITE_DEV_SERVER_PORT
  allowedHosts: true,
  proxy: {
    '/api': {
      target: 'http://localhost:8001',  // BACKEND_HOST:BACKEND_PORT
      changeOrigin: true,
      secure: false
    }
  }
}
```

All `/api/*` requests in development are transparently proxied to the local Express backend — no CORS issues in dev mode.

### NPM Scripts — `package.json`

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `concurrently "node backend/server.js" "npx vite --host 0.0.0.0 --port 5000"` | Starts both frontend and backend together |
| `npm run build` | `npx vite build` | Production bundle → `/dist` |
| `npm run lint` | `npx eslint .` | ESLint across all source files |
| `npm run preview` | `npx vite preview` | Serves the `/dist` bundle locally |

### Middleware Stack (Backend)

| Middleware | Purpose |
|---|---|
| `cors` | Cross-origin request handling |
| `express.json()` | JSON body parsing |
| `verifyToken` | JWT validation (`middleware/auth.js`) |
| `requireRole(role)` | RBAC enforcement (`middleware/rbac.js`) |
| `loginLimiter` | Rate-limit on login endpoint |
| `emailLimiter` | Rate-limit on email send endpoints |
| `validate(schema)` | Request body validation against Joi/zod schemas |

---

*Document generated: 2026-08-26. Reflects source as of that date.*
