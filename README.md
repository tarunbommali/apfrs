# APFRS - Attendance Report System (JNTU GV)

A comprehensive **Attendance Performance and Faculty Reporting System (APFRS)** designed for JNTU GV. This system automates the processing of biometric/excel attendance data, manages academic calendars dynamically, and generates detailed analytical reports (Daily, Weekly, Monthly, Department-wise). It also features a robust email notification system for sending individual or bulk performance reports to faculty.

![APFRS Dashboard](https://via.placeholder.com/800x400?text=APFRS+Dashboard+Preview)

## 🚀 Key Features

### 1. **Robust Data Import & Validation**
- **Drag & Drop Interface**: Modern, intuitive file upload area with animations.
- **Form-Data Support**: Supports Excel (`.xlsx`, `.xls`) file processing via `SheetJS`.
- **Auto-Detection**: Automatically extracts Year and Month from filenames or validates selected periods.
- **Smart Validation**: Prevents uploading future data or malformed excel sheets.

### 2. **Advanced Academic Calendar Management**
- **Dynamic Configuration**: Centralized holiday management via `src/utils/calendar.js`.
- **Automatic Calculations**:
    - **Sundays = Public Holidays**: Automatically treats all Sundays as holidays.
    - **Working Days**: Calculated as `Total Days - (Public Holidays + Sundays)`.
    - **Holiday Types**: Supports Public, Optional, Custom, Academic, Festival, and "Sunday".
- **Visual Interface**:
    - Color-coded calendar view.
    - Month-specific holiday lists side-by-side.
    - Year-based navigation.

### 3. **Comprehensive Reporting Suite**

#### **📊 Daily Report**
- Day-wise attendance breakdown.
- Visual status indicators (Present/Absent/Leave).
- Toggle between days with simple navigation ◀ ▶.

#### **📅 Weekly Report**
- Groups data into academic weeks.
- Trend analysis (↑ ↓) comparing current week vs previous week.
- Visual progress bars for weekly attendance rates.

#### **🏢 Department Report**
- Comparative analysis of all departments (CSE, ECE, MECH, etc.).
- Performance ranking sorted by attendance percentage.
- Drill-down capability to view faculty within a department.

#### **👤 Monthly Report (Faculty Summary)**
- The core report for audits.
- Detailed summary: Present, Absent, Working Days, Holidays, Total Hours.
- **Email Integration**: Send individual or bulk reports directly from this view.

### 4. **Automated Communication System**
- **Bulk Emailing**: Send personalized reports to hundreds of faculty members with one click.
- **Concurrency Control**: Processes emails in batches (default: 2) to prevent server/SMTP timeouts.
- **Progress Tracking**: Full-screen animated overlay showing real-time success/failure counts.
- **Rich HTML Emails**:
  - **Performance Color Coding**: Green (Good) to Red (Poor).
  - **Dynamic Remarks**: Automatic performance feedback text.
  - **Daily Breakdown**: Detailed table of every day's In/Out time and status.
  - **Attachment**: Automatically attaches a PDF version of the report.

### 5. **System Configuration**
- **SMTP Settings**: Configure Gmail or custom SMTP servers directly from the UI.
- **Test Configuration**: built-in tool to send test emails and verify credentials.
- **Environment Support**: Supports `.env` variables for secure credential management.

---

## 🛠️ Technology Stack
- **Frontend Framework**: [React.js](https://reactjs.org/) with [Vite](https://vitejs.dev/)
- **Language**: JavaScript (ES6+)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Responsive, Modern UI)
- **State Management**: React Context API
- **Data Processing**: `xlsx` (SheetJS)
- **Date Handling**: `dayjs`
- **Icons**: `lucide-react`
- **Routing**: `react-router-dom`

---

## 📁 Project Structure

```bash
/src
├── components/       # Reusable UI components (Buttons, Cards, Inputs)
│   ├── report/       # Report-specific components (FacultyTable, StatsCards)
├── contexts/         # Global State (AttendanceContext)
├── pages/            # Main Views (HomePage, DailyReport, FacultySummary)
├── utils/            # Core Logic & Helpers
│   ├── attendanceCalculations.js  # Summary & Stats logic
│   ├── calendar.js                # Holiday configuration
│   ├── dateTimeUtils.js           # Date/Sunday/Working Day logic
│   ├── emailService.js            # SMTP & Sending logic
│   ├── emailTemplateGenerator.js  # HTML Email templates
└── App.jsx           # Main Router Setup
```

---

## 📋 Setup & Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-repo/apfrs.git
   cd apfrs
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables** (Optional):
   Create a `.env` file in the root directory:
   ```env
   VITE_COMPANY_NAME="JNTU GV"
   VITE_SMTP_USER="your-email@gmail.com"
   VITE_SMTP_PASS="your-app-password"
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Access the app at `http://localhost:5173`.

---

## 📖 User Guide

### 1. Importing Data
- Go to the **Home** page.
- Select the **Year** and **Month**.
- Drag and drop your attendance Excel file.
- *Note: Ensure the file matches the standard format.*

### 2. Configuring Calendar
- Navigate to **Academic Calendar**.
- Check the holidays for the current year.
- *To add holidays*: Edit `src/utils/calendar.js` and add entries to `CALENDAR_CONFIG`.

### 3. Configuring Email
- Go to **Settings > Configure SMTP**.
- Enter your Gmail address and **App Password** (not login password).
- Click **Test Configuration** to verify.

### 4. Sending Reports
- Go to **Monthly Report**.
- Use filters (Dept, Status) to select faculty.
- Click **Send Bulk Email** to email everyone in the list.
- Watch the progress overlay for status updates.

---

## 💡 Email Report Logic
The system uses the following logic for generating reports:
- **Working Days**: Calculated dynamically excluding Sundays and configured holidays.
- **Present Days**: Counted from 'P' status.
- **Absent Days**: Counted from 'A' status or empty status on *Working Days*.
- **Leave Days**: Tracked but **excluded** from the main summary view (as per latest requirements).
- **Remarks**: Auto-generated based on attendance percentage (<50%: Poor, >90%: Excellent).

---

© 2026 APFRS - Developed for JNTU GV.
