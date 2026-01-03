# 📊 APFRS - Attendance Performance Reporting System (JNTU GV)

A state-of-the-art **Attendance Performance and Faculty Reporting System (APFRS)** specifically engineered for JNTU GV. This platform automates the intricate process of biometric attendance analysis, dynamic academic calendar synchronization, and high-fidelity report generation.

![APFRS Dashboard](https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop)

## 🌟 Premium Features

### 1. **Automated Biometric Processing**
*   **Intelligent Importer**: Industrial-grade Excel parser that handles complex attendance logs (`.xlsx`, `.xls`).
*   **Temporal Intelligence**: Automatic detection of month and year from filenames with manual override capabilities.
*   **Live Validation**: Real-time cross-referencing against faculty databases to ensure data integrity.

### 2. **Dynamic Academic Infrastructure**
*   **Multi-Year Support**: Full holiday and working day configurations for **2025** and **2026**.
*   **Precision Accounting**: Strictly implements the formula:  
    `Present Days + Absent Days + Holiday Count = Total Month Days`.
*   **Gazetted Synchronization**: Pre-configured with Andhra Pradesh Gazetted holidays, including Second Saturdays and Sundays.

### 3. **High-Performance Reporting**
*   **Faculty Summaries**: Detailed performance metrics including attendance percentages and effective hours.
*   **Analytical Dashboards**: Real-time visualization of attendance trends and department-wise performance metrics.
*   **Microservice Integration**: Seamless communication with the deployed JNTUGV backend for robust data handling.

### 4. **Enterprise Communication**
*   **Bulk Dispatch**: Parallel processing engine for sending individual reports to hundreds of faculty members.
*   **HTML High-Fidelity Emails**: Beautifully styled, mobile-responsive email reports with performance-based color coding.
*   **PDF Generation**: Dynamic PDF report generation attached to every outgoing communication.

---

## 🏗️ Reorganized Architecture

The project follows a clean, feature-based modular architecture for maximum scalability:

```text
src/
├── core/                # Core Business Logic
│   ├── attendance/      # Attendance processing & mathematical calculations
│   └── calendar/        # Working days & temporal logic
├── config/              # Centralized configuration (Academic Calendars)
├── contexts/            # Global state management
├── utils/               # Feature-specific utility modules
│   ├── data/            # Faculty & Person data management
│   ├── email/           # SMTP & communication logic
│   ├── export/          # PDF & File generation logic
│   └── report/          # Summary generation & formatting
└── pages/               # Premium page views
```

---

## �️ Technology Stack

*   **Logic**: [React.js](https://reactjs.org/) (Vite) + ESNext
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Data**: [SheetJS](https://sheetjs.com/) (XLSX)
*   **Visuals**: [Lucide React](https://lucide.dev/) + [Framer Motion](https://www.framer.com/motion/)
*   **Communication**: Deployed Node.js Microservice

---

## � Quick Start

### 1. Installation
```bash
npm install
```

### 2. Development
```bash
npm run dev
```

### 3. Configuration
Access the **Settings** menu within the application to configure:
*   **SMTP Gateway**: Set up your institution's email server credentials.
*   **Academic Year**: Switch between 2025 and 2026 calendar data.

---

## � Operational Guide

1.  **Import**: Upload the biometric Excel file via the `Import Data` screen.
2.  **Verify**: Cross-check the auto-calculated working days against the institution's calendar.
3.  **Analyze**: Review department-wise performance in the `Status Dashboard`.
4.  **Communicate**: Use the `Faculty Summary` page to trigger bulk email reports.

---

© 2026 JNTU GV - Vizianagaram. All rights reserved.
Developed for excellence in academic administration.
