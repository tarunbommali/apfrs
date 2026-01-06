/* eslint-disable no-unused-vars */
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useParams } from 'react-router-dom';
import { useAttendance } from "../contexts/AttendanceContext";
import { calculateSummary } from '../core/attendance/calculations';
import { getWorkingDays, getDaysInMonth } from '../core/calendar/workingDays';
import {
  getSMTPConfig,
  validateSMTPConfig,
  sendIndividualReport,
  sendBulkReports,
} from "../utils/email/index";
import PageLayout from "./PageLayout";
import ReportOverview from "../components/report/ReportOverview";
import ReportBody from "../components/report/ReportBody";

const EMAIL_REPORTS_KEY = "faculty_email_reports";
const SMTP_CONFIG_EVENT = "smtp-config-updated";
const SMTP_MISSING_ERROR = "SMTP configuration missing. Please configure email settings first.";

const getEmailReports = () => {
  try {
    return JSON.parse(localStorage.getItem(EMAIL_REPORTS_KEY)) || {};
  } catch {
    return {};
  }
};

const saveEmailReport = (cfmsId, email, status, message = "") => {
  try {
    const reports = getEmailReports();
    const today = new Date().toDateString();

    if (!reports[cfmsId]) {
      reports[cfmsId] = [];
    }

    reports[cfmsId].push({
      date: today,
      email,
      status,
      message,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 30 days of reports
    reports[cfmsId] = reports[cfmsId]
      .filter((report) => {
        const reportDate = new Date(report.timestamp);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return reportDate >= thirtyDaysAgo;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    localStorage.setItem(EMAIL_REPORTS_KEY, JSON.stringify(reports));
    return reports[cfmsId];
  } catch (error) {
    console.error("Error saving email report:", error);
    return [];
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

const getLastEmailStatus = (cfmsId) => {
  try {
    const reports = getEmailReports();
    if (!reports[cfmsId] || reports[cfmsId].length === 0) return null;
    return reports[cfmsId][0];
  } catch {
    return null;
  }
};

const createSMTPSnapshot = () => {
  const config = getSMTPConfig();
  const validation = validateSMTPConfig(config);
  return {
    config,
    validation,
    isValid: validation.isValid,
  };
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const FacultySummary = () => {
  const { year, month } = useParams();
  const { attendanceData, fileName, resetData, selectedMonth: contextMonth, selectedYear: contextYear, workingDays: contextWorkingDays } = useAttendance();

  const selectedYear = parseInt(year) || contextYear;
  const selectedMonth = parseInt(month) || contextMonth;

  const [smtpStatus, setSmtpStatus] = useState(() => createSMTPSnapshot());
  const refreshSMTPStatus = useCallback(() => {
    setSmtpStatus(createSMTPSnapshot());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleRefresh = () => refreshSMTPStatus();
    window.addEventListener("focus", handleRefresh);
    window.addEventListener("storage", handleRefresh);
    window.addEventListener(SMTP_CONFIG_EVENT, handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
      window.removeEventListener(SMTP_CONFIG_EVENT, handleRefresh);
    };
  }, [refreshSMTPStatus]);

  const isSMTPConfigured = smtpStatus.isValid;

  const getValidatedSMTPConfig = useCallback((override = null) => {
    if (override) {
      const validation = validateSMTPConfig(override);
      if (!validation.isValid) {
        return { ok: false, message: validation.error || SMTP_MISSING_ERROR };
      }
      return { ok: true, config: override };
    }

    // Get fresh config each time
    const config = getSMTPConfig();
    const validation = validateSMTPConfig(config);
    if (!validation.isValid) {
      return { ok: false, message: validation.error || SMTP_MISSING_ERROR };
    }
    return { ok: true, config };
  }, []);

  const [filters, setFilters] = useState({
    department: "",
    designation: "",
    status: "",
    search: "",
  });
  const [emailStatus, setEmailStatus] = useState({});
  const [sendingEmail, setSendingEmail] = useState(false);
  const [bulkEmailProgress, setBulkEmailProgress] = useState({
    current: 0,
    success: 0,
    fail: 0,
    total: 0,
    processing: false,
    error: "",
    status: "idle",
    currentEmployee: "",
  });

  // Track if bulk operation is in progress
  const isBulkInProgress = useRef(false);

  const workingDays = useMemo(() => {
    if (!attendanceData.length) return [];
    return getWorkingDays(attendanceData, selectedMonth, null, selectedYear);
  }, [attendanceData, selectedMonth, selectedYear]);

  const totalDaysInPeriod = useMemo(() => {
    if (!attendanceData.length) return 0;
    return getDaysInMonth(attendanceData);
  }, [attendanceData]);

  const effectiveWorkingDays = workingDays.length ? workingDays : null;

  const periodStats = useMemo(() => {
    const totalWorkingDays = workingDays.length;
    const totalPeriodDays = totalDaysInPeriod;
    return {
      totalWorkingDays,
      totalPeriodDays,
      workingDayPercentage:
        totalPeriodDays > 0
          ? ((totalWorkingDays / totalPeriodDays) * 100).toFixed(1)
          : "0.0",
    };
  }, [workingDays, totalDaysInPeriod]);

  const filteredData = useMemo(() => {
    if (!attendanceData.length) return [];

    const filtered = attendanceData
      .map((employee) => {
        const lastEmailStatus = getLastEmailStatus(employee.cfmsId);
        const emailSentToday = hasEmailSentToday(employee.cfmsId);
        const summary = calculateSummary(employee, selectedMonth, selectedYear);
        const percentage = parseFloat(summary.attendancePercentage) || 0;

        let status = "";
        if (percentage >= 75) status = "Good";
        else if (percentage >= 50) status = "Average";
        else status = "Poor";

        return {
          ...employee,
          lastEmailStatus,
          emailSentToday,
          canSendEmail:
            !emailSentToday &&
            employee.email &&
            employee.email !== "N/A" &&
            employee.email.includes("@"),
          summaryStatus: status,
          summaryPercentage: percentage,
          summary,
        };
      })
      .filter((employee) => {
        if (filters.department && employee.department !== filters.department)
          return false;
        if (filters.designation && employee.designation !== filters.designation)
          return false;
        if (filters.status && employee.summaryStatus !== filters.status)
          return false;

        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const matchesName =
            employee.name?.toLowerCase().includes(searchLower) || false;
          const matchesCfmsId =
            employee.cfmsId?.toLowerCase().includes(searchLower) || false;
          const matchesDepartment =
            employee.department?.toLowerCase().includes(searchLower) || false;
          const matchesDesignation =
            employee.designation?.toLowerCase().includes(searchLower) || false;

          if (
            !matchesName &&
            !matchesCfmsId &&
            !matchesDepartment &&
            !matchesDesignation
          ) {
            return false;
          }
        }

        return true;
      });

    return filtered;
  }, [attendanceData, filters, effectiveWorkingDays]);

  const overallStats = useMemo(() => {
    if (!filteredData.length) {
      return {
        totalPresent: 0,
        totalAbsent: 0,
        totalLeave: 0,
        totalHours: 0,
        totalEmployees: 0,
        totalWorkingDays: workingDays.length,
        totalPeriodDays: totalDaysInPeriod,
        averageAttendance: "0.0",
        averageAttendancePercentage: "0.0",
        averageHoursPerFaculty: "0.0",
      };
    }

    const stats = filteredData.reduce(
      (acc, employee) => {
        const summary =
          employee.summary || calculateSummary(employee, selectedMonth, selectedYear);
        acc.totalPresent += summary.presentDays;
        acc.totalAbsent += summary.absentDays;
        acc.totalLeave += summary.leaveDays;
        acc.totalHours += parseFloat(summary.totalHours);
        acc.totalEmployees += 1;
        return acc;
      },
      {
        totalPresent: 0,
        totalAbsent: 0,
        totalLeave: 0,
        totalHours: 0,
        totalEmployees: 0,
      }
    );

    stats.totalWorkingDays = workingDays.length;
    stats.totalPeriodDays = totalDaysInPeriod;
    stats.averageAttendance =
      stats.totalEmployees > 0
        ? (stats.totalPresent / stats.totalEmployees).toFixed(1)
        : "0.0";

    const denominator =
      stats.totalEmployees * (workingDays.length || totalDaysInPeriod || 1);
    stats.averageAttendancePercentage =
      denominator > 0
        ? ((stats.totalPresent / denominator) * 100).toFixed(1)
        : "0.0";

    stats.averageHoursPerFaculty =
      stats.totalEmployees > 0
        ? (stats.totalHours / stats.totalEmployees).toFixed(1)
        : "0.0";

    return stats;
  }, [filteredData, effectiveWorkingDays, workingDays.length, totalDaysInPeriod]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      department: "",
      designation: "",
      status: "",
      search: "",
    });
  };

  const handleSendEmail = async (employee, smtpConfigOverride = null) => {
    if (hasEmailSentToday(employee.cfmsId)) {
      const errorMsg = "Email already sent to this employee today";
      return { success: false, message: errorMsg, alreadySent: true };
    }

    if (!employee.email || employee.email === "N/A" || !employee.email.includes("@")) {
      const errorMsg = "Employee does not have a valid email address";
      return { success: false, message: errorMsg };
    }

    const smtpCheck = getValidatedSMTPConfig(smtpConfigOverride);
    if (!smtpCheck.ok) {
      const errorMsg = smtpCheck.message || SMTP_MISSING_ERROR;
      return { success: false, message: errorMsg };
    }
    const activeConfig = smtpCheck.config;

    setEmailStatus((prev) => ({ ...prev, [employee.cfmsId]: "sending" }));

    try {
      console.log(`Sending email to ${employee.name} (${employee.email})`);
      const result = await sendIndividualReport(
        employee,
        activeConfig,
        selectedMonth,
        selectedYear
      );

      saveEmailReport(
        employee.cfmsId,
        employee.email,
        "success",
        "Email sent successfully"
      );

      setEmailStatus((prev) => ({ ...prev, [employee.cfmsId]: "sent" }));

      // Clear status after 3 seconds
      setTimeout(() => {
        setEmailStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[employee.cfmsId];
          return newStatus;
        });
      }, 3000);

      return { success: true, data: result };
    } catch (error) {
      console.error(`Error sending email to ${employee.name}: `, error);

      saveEmailReport(
        employee.cfmsId,
        employee.email,
        "error",
        error?.message || "Unknown error occurred"
      );

      setEmailStatus((prev) => ({ ...prev, [employee.cfmsId]: "error" }));

      return {
        success: false,
        message: error?.message || "Unknown error",
        hint: error?.hint,
        error,
      };
    }
  };

  const handleSendSample = async () => {
    const sampleEmp = filteredData.find((emp) => emp.canSendEmail);

    if (!sampleEmp) {
      alert("No eligible employees found to send a sample to.");
      return;
    }

    if (!confirm(`Send a sample email to ${sampleEmp.name} (${sampleEmp.email})?`)) {
      return;
    }

    setSendingEmail(true);
    try {
      const result = await handleSendEmail(sampleEmp);
      if (result && result.success) {
        alert(`Sample email sent successfully to ${sampleEmp.name} `);
      } else {
        alert(`Failed to send sample: ${result?.message || "Unknown error"} `);
      }
    } catch (error) {
      alert(`Error: ${error.message} `);
    } finally {
      setSendingEmail(false);
    }
  };

  const employeesWithEmail = filteredData.filter((emp) => emp.canSendEmail).length;
  const employeesAlreadySent = filteredData.filter((emp) => emp.emailSentToday).length;

  return (
    <PageLayout
      Sidebar={
        null
      }
      Body={
        <div className="space-y-8 max-w-6xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Monthly Report</h1>
            <p className="text-slate-500 mt-2">
              Performance analysis and email reporting for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </p>
          </div>
          <ReportBody
            filteredData={filteredData}
            effectiveWorkingDays={effectiveWorkingDays}
            periodStats={periodStats}
            sendingEmail={sendingEmail}
            bulkEmailProgress={{ processing: false }} // Dummy prop
            onAction={handleSendSample}
            actionLabel="Send Sample Email"
            onSendEmail={handleSendEmail}
            emailStatus={emailStatus}
            searchValue={filters.search}
            onSearchChange={(value) => handleFilterChange("search", value)}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />

          <ReportOverview
            periodStats={periodStats}
            overallStats={overallStats}
            isSMTPConfigured={isSMTPConfigured}
            employeesAlreadySent={employeesAlreadySent}
            employeesWithEmail={employeesWithEmail}
            bulkEmailProgress={{ processing: false }} // Dummy prop
            sendingEmail={sendingEmail}
            onAction={handleSendSample}
            actionLabel="Send Sample Email"
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        </div>
      }
    />
  );
};

export default FacultySummary;