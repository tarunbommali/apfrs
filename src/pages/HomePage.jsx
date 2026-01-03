/* eslint-disable react-hooks/preserve-manual-memoization */
/* eslint-disable no-unused-vars */
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAttendance } from '../contexts/AttendanceContext';

import PageLayout from './PageLayout';
import ReportOverview from '../components/report/ReportOverview';
import StatsCards from '../components/report/StatsCards';


import { calculateSummary } from '../core/attendance/calculations';
import { getWorkingDays, getDaysInMonth } from '../core/calendar/workingDays';

import {
  getSMTPConfig,
  validateSMTPConfig,
} from '../utils/emailUtils';

const EMAIL_REPORTS_KEY = "faculty_email_reports";

const getEmailReports = () => {
  try {
    return JSON.parse(localStorage.getItem(EMAIL_REPORTS_KEY)) || {};
  } catch {
    return {};
  }
};

const hasEmailSentToday = (cfmsId) => {
  try {
    const reports = getEmailReports();
    const today = new Date().toDateString();
    if (!reports[cfmsId]) return false;
    return reports[cfmsId].some(
      (report) => report.date === today && report.status === "success"
    );
  } catch {
    return false;
  }
};

/* ---------------- SMALL STAT CARD ---------------- */
const StatCard = ({ label, value, colorClass, icon }) => (
  <div className={`rounded-2xl border ${colorClass.border} bg-white p-4 shadow-sm`}>
    <div className="flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${colorClass.bg} ${colorClass.text}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm font-medium text-slate-600">{label}</p>
      </div>
    </div>
  </div>
);

const HomePage = () => {
  const navigate = useNavigate();
  const {
    attendanceData,
    handleFileUpload,
    loading,
    error,
    hasData,
    fileName,
    selectedMonth,
    selectedYear,
  } = useAttendance();

  const [uploadSuccess, setUploadSuccess] = useState(false);

  /* ---------------- FILE UPLOAD ---------------- */
  const handleUpload = async (file, data, month) => {
    setUploadSuccess(false);
    const success = await handleFileUpload(file, data, month);
    setUploadSuccess(success);
    return success;
  };

  /* ---------------- BASIC CALCULATIONS ---------------- */
  const workingDays = useMemo(
    () => (attendanceData.length ? getWorkingDays(attendanceData, selectedMonth, null, selectedYear) : []),
    [attendanceData, selectedMonth, selectedYear]
  );

  const totalDaysInPeriod = useMemo(
    () => (attendanceData.length ? getDaysInMonth(attendanceData) : 0),
    [attendanceData]
  );

  const effectiveWorkingDays = workingDays.length ? workingDays : null;

  /* ---------------- PERIOD STATS ---------------- */
  const periodStats = useMemo(() => {
    const totalWorkingDays = workingDays.length;
    return {
      totalWorkingDays,
      totalPeriodDays: totalDaysInPeriod,
      workingDayPercentage:
        totalDaysInPeriod > 0
          ? ((totalWorkingDays / totalDaysInPeriod) * 100).toFixed(1)
          : '0.0',
    };
  }, [workingDays, totalDaysInPeriod]);

  /* ---------------- OVERALL STATS ---------------- */
  const overallStats = useMemo(() => {
    if (!attendanceData.length) {
      return {
        totalEmployees: 0,
        averageAttendancePercentage: '0.0',
        averageHoursPerFaculty: '0.0',
      };
    }

    let totalPresent = 0;
    let totalHours = 0;

    attendanceData.forEach((emp) => {
      const summary = calculateSummary(emp, selectedMonth, selectedYear);
      totalPresent += summary.presentDays;
      totalHours += parseFloat(summary.totalHours || 0);
    });

    const denominator =
      attendanceData.length *
      (workingDays.length || totalDaysInPeriod || 1);

    return {
      totalEmployees: attendanceData.length,
      averageAttendancePercentage:
        denominator > 0
          ? ((totalPresent / denominator) * 100).toFixed(1)
          : '0.0',
      averageHoursPerFaculty:
        attendanceData.length > 0
          ? (totalHours / attendanceData.length).toFixed(1)
          : '0.0',
    };
  }, [attendanceData, workingDays, totalDaysInPeriod]);

  /* ---------------- QUICK STATS ---------------- */
  const totalPresent = useMemo(
    () =>
      attendanceData.reduce(
        (sum, emp) =>
          sum + calculateSummary(emp, effectiveWorkingDays).presentDays,
        0
      ),
    [attendanceData, effectiveWorkingDays]
  );

  const totalAbsent = useMemo(
    () =>
      attendanceData.reduce(
        (sum, emp) =>
          sum + calculateSummary(emp, effectiveWorkingDays).absentDays,
        0
      ),
    [attendanceData, effectiveWorkingDays]
  );

  /* ---------------- SMTP & EMAIL STATUS ---------------- */
  const isSMTPConfigured = useMemo(() => {
    const config = getSMTPConfig();
    return validateSMTPConfig(config).isValid;
  }, []);

  const employeesWithEmail = useMemo(() => {
    return attendanceData.filter(emp => emp.email && emp.email.includes('@') && emp.email !== 'N/A').length;
  }, [attendanceData]);

  const employeesAlreadySent = useMemo(() => {
    return attendanceData.filter(emp => hasEmailSentToday(emp.cfmsId)).length;
  }, [attendanceData]);
  const bodyContent = (
    <div className="space-y-10 max-w-6xl mx-auto">

      {/* HERO */}
      <section className="text-center">
        <h1 className="text-4xl font-bold text-slate-900">
          APFRS Attendance System
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Analyze and manage faculty attendance with ease.
        </p>
      </section>

      {/* EMPTY STATE */}
      {!hasData && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
          <div className="bg-indigo-50 p-4 rounded-full mb-4">
            <span className="text-4xl">📂</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Attendance Data Found</h3>
          <p className="text-slate-500 max-w-md text-center mb-6">
            Please navigate to the <span className="font-bold text-indigo-600">Import Data</span> page to upload your biometric attendance Excel sheet.
          </p>
          <Link
            to="/import"
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
          >
            Go to Import Data
          </Link>
        </div>
      )}



      {hasData && (
        <ReportOverview
          periodStats={periodStats}
          overallStats={overallStats}
          facultyData={attendanceData}
          workingDays={effectiveWorkingDays || []}
          isSMTPConfigured={isSMTPConfigured}
          employeesAlreadySent={employeesAlreadySent}
          employeesWithEmail={employeesWithEmail}
          bulkEmailProgress={{}}
          sendingEmail={false}
          onBulkSend={() => navigate('/summary')}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      )}



    </div>
  );

  return <PageLayout Sidebar={null} Body={bodyContent} />;
};

export default HomePage;
