# APFRS Attendance Report System

## Overview
A React-based attendance management system that allows users to upload Excel attendance sheets and generate insights, analytics, and monthly attendance reports automatically.

## Tech Stack
- **Frontend**: React 19, React Router, Tailwind CSS 4
- **Build Tool**: Vite 7
- **Backend**: Express.js (for SMTP configuration)
- **Excel Processing**: xlsx library
- **Icons**: Lucide React

## Project Structure
```
APFRS Attendance Report System/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── Header.jsx      # Navigation header
│   │   ├── Footer.jsx      # Page footer
│   │   ├── FileUpload.jsx  # File upload component
│   │   ├── LoadingIndicator.jsx
│   │   ├── ErrorDisplay.jsx
│   │   └── summary/        # Summary page components
│   ├── pages/              # Route pages
│   │   ├── HomePage.jsx    # Landing page
│   │   ├── FacultySummary.jsx
│   │   ├── DetailedView.jsx
│   │   ├── ConfigureSMTP.jsx
│   │   └── Docs.jsx
│   ├── utils/              # Utility functions
│   ├── App.jsx             # Main app with routing
│   └── main.jsx            # Entry point
├── server.js               # Express backend for SMTP
├── vite.config.js          # Vite configuration
└── package.json
```

## Features
- Upload Excel attendance files (.xlsx, .xls)
- View attendance summaries
- Detailed attendance records
- SMTP configuration for email reports
- Data persistence via localStorage

## Running the App
Start both servers together (recommended):

```bash
cd 'APFRS Attendance Report System'
npm run dev:full
```

Behind the scenes this runs Vite on port 5000 and the Express SMTP relay on port 3000 using `concurrently`. If you prefer manual control, you can still run each command in separate terminals:

- **Frontend (Vite)** — `npm run dev`
- **Email API (Express)** — `npm run server`

The Vite dev server proxies `/api/*` requests to the Express server.

Set `VITE_EMAIL_API_URL=/api` (already the default) to keep the frontend and backend on the same origin during local development and Vercel deployments. Override it with a full URL only if the SMTP relay is hosted elsewhere.

## Deployment Notes
- Build the SPA with `npm run build` before deploying to Vercel.
- Keep `/api` requests relative so Vercel (or any reverse proxy) can forward them to the Express server without leaking localhost URLs.
- When the SMTP relay lives on a different host, set `VITE_EMAIL_API_URL` accordingly in `.env` and redeploy.

## API Endpoints
- `GET /api/health` - Health check
- `POST /api/send-email` - Send email via SMTP

## Email API Flow
- The Configure SMTP page reads defaults from `VITE_SMTP_*` env vars and lets users save overrides into `localStorage.smtpConfig`. Those values flow into `src/utils/emailUtils.jsx` so every email request carries the chosen SMTP credentials.
- Frontend requests point to `${VITE_EMAIL_API_URL || '/api'}/send-email`. In dev we leave this as `/api`, allowing Vite to proxy the call to the Express relay (running on `SMTP_SERVER_PORT`, default 4000) without CORS issues.
- The backend merges the posted `config` with the `.env` `SMTP_*` values (`mergeSMTPConfig`) and normalizes whitespace before giving Nodemailer the final credentials. Missing fields fall back to the server defaults automatically.
- Gmail and other providers expect either an app password (with 2FA enabled) or XOAUTH2. If authentication fails the API returns a 401 plus the provider hint, which the UI surfaces to guide the user.
- After changing `.env` or the saved SMTP config, restart `npm run dev:full` (or both `npm run dev` and `npm run server`) so Vite rebuilds with the new env vars and the relay reloads its credentials.

 