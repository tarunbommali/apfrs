# APFRS - Attendance Report System

A comprehensive Attendance Performance and Faculty Reporting System (APFRS) for JNTU GV. This system allows administrators to upload attendance data, manage academic calendars, and generate various detailed reports including daily, weekly, monthly, and department-wise analyses.

## 🚀 Key Features

### 1. **Robust Data Import**
- **Modern Drag & Drop Interface**: Completely redesigned file upload with visual feedback and animations.
- **Auto-Detection**: Automatically detects year and month from the uploaded Excel filename.
- **Validation**: Ensures proper file formats (.xlsx, .xls) and prevents future date imports.
- **File Preview**: Shows file details, size, and detected metadata before upload.

### 2. **Advanced Academic Calendar Management**
- **Year-Based Configuration**: Centralized holiday management for multiple academic years using a structured `CALENDAR_CONFIG` object.
- **Dynamic Date Calculations**:
    - **Working Days**: Auto-calculated by excluding configured holidays and all Sundays.
    - **Holiday Statistics**: Real-time calculation of public holidays, optional holidays, and Sundays per month and year.
- **Smart Interface**:
    - **Month-Specific Sidebar**: Dynamically filters and displays only the holidays and events relevant to the currently visible month.
    - **Visual Legend**: 
        - 🔴 **Public**: Official government holidays.
        - 🟠 **Optional**: Restricted/optional holidays.
        - 🟣 **Custom**: User-defined local events.
        - 🔵 **Academic**: Exams, convocations, and academic milestones.
        - 🌸 **Festival**: Cultural and religious festivals.
        - ⚫ **Other**: Miscellaneous institutional events.
        - 🟡 **Sunday**: Automatic highlighting of all Sundays.
    - **Navigation Restrictions**:
        - Restricted navigation to only those years with active configurations.
        - Navigation arrows auto-disable at the boundaries of the configured date range.
- **Simplified Workflow**: Transitioned to a "Configuration-First" model where all calendar data is managed in `calendar.js` for better performance and consistency.

### 3. **Comprehensive Reporting Suite**

#### **Daily Report**
- View attendance details for any specific day in the selected month.
- **Quick Day Selector**: Color-coded calendar days (Holiday: Red, Working: Green, Sunday: Gray).
- **Navigation**: Simple ◀ ▶ controls to move between days.
- **Faculty Details**: Lists every faculty member with status (Present/Absent/Leave) and hours worked.

#### **Weekly Report**
- **Automatic Grouping**: Intelligent grouping of working days into 7-day academic weeks.
- **Trend Analysis**: Visual indicators (↑ ↓ →) showing attendance trends compared to the previous week.
- **Progress Tracking**: Visual progress bars per week with performance-based color coding.

#### **Monthly Report**
- High-level overview of the entire month's attendance performance.
- Statistics on average attendance, working days, and faculty performance.

#### **Department Report**
- **Comparison Table**: Side-by-side performance analysis of all departments.
- **Drill-Down**: Click on any department to see detailed faculty-wise attendance.
- **Performance Ranking**: Departments sorted by attendance percentage.

#### **Detailed View**
- Full raw data accessibility for comprehensive auditing.
- Advanced filtering by department, designation, and search terms.

#### **Automated Communication & Email Preview**
- **Enhanced Progress Experience**: A beautiful, full-screen animated overlay appears during bulk email sending, showing real-time success/fail counts and a graphical progress bar.
- **Smart Throttling**: Visual indicators and progress tracking ensure the system remains stable during large-scale mailing operations.
- **Live Preview**: See exactly how the attendance report email looks before sending using the dedicated Email Template section.
- **Dynamic Visualization**: Renders the complete HTML email with sample faculty data, including personalized remarks based on attendance performance.

### 4. **Project Architecture**
- **Email Configuration**: Secure SMTP settings for automated report delivery.
- **Individual/Bulk Mailing**: Send attendance reports to faculty members with a single click.
- **Success Tracking**: Real-time progress updates for bulk mailing operations.

## 🛠️ Technology Stack
- **Frontend**: React.js with Vite
- **Styling**: Tailwind CSS for a premium, responsive UI.
- **Icons**: Lucide React for consistent and intuitive visual cues.
- **Excel Processing**: SheetJS (xlsx) for reliable data parsing.
- **Routing**: React Router 6 for seamless navigation.

## 📁 Project Structure
- `/src/pages`: Main application pages (DailyReport, WeeklyReport, DepartmentReport, etc.)
- `/src/components`: Reusable UI components (FileUpload, Sidebar, ManageCalendar, etc.)
- `/src/utils`: Helper functions for attendance calculations, calendar logic (`calendar.js`), and email ops.
- `/src/contexts`: Application state management (AttendanceContext).

## 📋 User Guide

### Getting Started
1. Click **Import Data** in the system menu.
2. Select the Year and Month.
3. Drag your Excel file into the upload zone or click to browse.
4. Once uploaded, all report sections will be activated in the sidebar.

### Managing Calendar
1. Navigate to **Academic Calendar**.
2. Select the academic year from the dropdown.
3. View holidays and statistics for that year. The reports will automatically use these settings for calculations.
4. To update holidays, edit `src/utils/calendar.js` following the `CALENDAR_CONFIG` structure.

### Generating Reports
- Use the **Daily Report** for immediate daily status.
- Use **Weekly Report** to track short-term trends.
- Use **Department Report** for administrative performance reviews.
- Use **Monthly Report** (Faculty Summary) for final monthly audits and email distribution.

---

**Dashboard Preview**
```
┌────────────────────────────────────────┐
│  APFRS Admin Portal                    │
├────────────────────────────────────────┤
│  Main Menu                             │
│  - Home                                │
│  - Daily Report        [New]           │
│  - Weekly Report       [New]           │
│  - Department Report   [New]           │
│  - Monthly Report                      │
│                                        │
│  System                                │
│  - Import Data         [Enhanced]      │
│  - Academic Calendar   [Refactored]    │
│  - Email Config                        │
└────────────────────────────────────────┘
```

© 2025 APFRS - Developed for JNTU GV.