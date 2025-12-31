# APFRS Attendance Report System

## Overview
A comprehensive React-based attendance management system for faculty members. The system processes Excel/CSV attendance files, calculates working days with holiday calendar integration, generates attendance analytics, sends automated email reports via SMTP, displays analytics dashboards with charts, and provides export functionality.

## Recent Changes (December 2, 2025)
- Fixed missing exports in emailUtils.js (getSMTPConfig, validateSMTPConfig, sendEmail)
- Added re-exports for SMTP configuration functions
- Configured unified workflow for frontend and backend
- Verified all application pages working correctly
- Environment variables prefilled for SMTP configuration

## Project Architecture

### Data Flow
```
Excel Upload → Process Data → Store in Context → Use in Pages → Generate Reports → Send Emails
```

1. User uploads Excel file via Header component or Home page
2. File processed by `attendanceUtils.js` and `dataProcessor.js` functions
3. Data merged with `data.js` person information
4. Enriched data stored in `AttendanceContext`
5. Data persisted to localStorage for session continuity
6. All pages access data from context
7. Email reports generated and sent via SMTP relay server

### Key Files

**Context:**
- `src/contexts/AttendanceContext.jsx` - Central state management

**Pages:**
- `src/pages/HomePage.jsx` - Landing page with file upload
- `src/pages/FacultySummary.jsx` - Summary view with email actions
- `src/pages/DetailedView.jsx` - Individual employee details
- `src/pages/ConfigureSMTP.jsx` - Email configuration
- `src/pages/Docs.jsx` - Documentation

**Utils:**
- `src/utils/attendanceUtils.js` - Excel processing and attendance calculation
- `src/utils/attendanceCalculations.js` - Detailed attendance metrics
- `src/utils/dataProcessor.js` - Data normalization and processing
- `src/utils/emailUtils.js` - Email sending utilities with retry logic
- `src/utils/smtpConfig.js` - SMTP configuration management
- `src/utils/smtpConfigStore.js` - SMTP config localStorage persistence
- `src/utils/calendar.js` - Holiday calendar and working days
- `src/utils/data.js` - Faculty member data

**Server:**
- `server.js` - Express SMTP relay server with Nodemailer

### Context Data Structure
```javascript
{
  attendanceData: Array<Employee>,
  fileName: string,
  uploadDate: timestamp,
  loading: boolean,
  error: string,
  hasData: boolean,
  workingDays: number[],
  overallStats: Object,
  departments: string[],
  designations: string[],
  empTypes: string[]
}
```

## Running the Application

**Development (Full Stack):**
```bash
npm run dev:full
```
This starts both the Vite frontend (port 5000) and Express SMTP relay (port 4000).

**Frontend Only:**
```bash
npm run dev
```
This starts the Vite development server on port 5000.

**SMTP Server Only:**
```bash
npm run server
```
This starts the Express SMTP relay server on port 4000.

## Environment Variables

### SMTP Configuration
- `VITE_SMTP_HOST` - SMTP server host (default: smtp.gmail.com)
- `VITE_SMTP_PORT` - SMTP port (default: 587)
- `VITE_SMTP_USER` / `VITE_SMTP_EMAIL` - Gmail address
- `VITE_SMTP_PASS` / `VITE_SMTP_PASSWORD` - Gmail app password
- `VITE_SMTP_SECURE` - Enable TLS/SSL (default: true)
- `VITE_SMTP_SUBJECT` - Default email subject

### Application
- `VITE_COMPANY_NAME` - Company name for reports (default: APFRS)
- `VITE_REPORT_SYSTEM_NAME` - System name (default: Attendance System)
- `VITE_EMAIL_API_URL` - Email API base URL

## Features

### Core Features
- Excel/CSV file upload and processing
- Attendance calculations with holiday calendar
- Working days detection and calculation
- Present/Absent/Leave/Half-day tracking
- Total hours calculation

### Email Reports
- Individual attendance reports via email
- Bulk report sending with concurrency control
- Mobile-responsive HTML email templates
- Retry logic for failed sends
- Progress tracking for bulk operations

### Analytics & Export
- Attendance percentage calculations
- Late arrival tracking
- Department-wise analytics
- Export to JSON format
- Visual dashboards

### SMTP Configuration
- Gmail SMTP integration
- App password support
- TLS/SSL security
- Test email functionality
- Configuration persistence

## Tech Stack
- React 19 with React Router v7
- Vite 7 for bundling
- TailwindCSS 4 for styling
- XLSX for Excel processing
- Nodemailer for email sending
- Express for SMTP relay server
- Day.js for date handling
