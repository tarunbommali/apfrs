/* eslint-disable no-unused-vars */
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useAttendance } from "../contexts/AttendanceContext";
import {
  calculateSummary,
  calculateWorkingDays,
  getDaysInMonth,
} from "../utils/attendanceUtils";
import {
  getSMTPConfig,
  validateSMTPConfig,
  sendIndividualReport,
  sendBulkReports,
} from "../utils/emailUtils";
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
  const { attendanceData, fileName, resetData, selectedMonth, selectedYear, workingDays: contextWorkingDays } = useAttendance();

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
    return calculateWorkingDays(attendanceData, selectedMonth, null, selectedYear);
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
      const result = await sendIndividualReport(employee, activeConfig, effectiveWorkingDays);

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
      console.error(`Error sending email to ${employee.name}:`, error);

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

  const handleBulkEmail = async () => {
    // Prevent multiple bulk operations
    if (isBulkInProgress.current) {
      console.warn("Bulk email already in progress");
      return;
    }

    isBulkInProgress.current = true;

    try {
      const smtpCheck = getValidatedSMTPConfig();
      if (!smtpCheck.ok) {
        const errorMsg = smtpCheck.message || SMTP_MISSING_ERROR;
        setBulkEmailProgress((prev) => ({
          ...prev,
          error: errorMsg,
          status: "error",
        }));
        alert(errorMsg);
        return;
      }
      const bulkSMTPConfig = smtpCheck.config;

      const employeesToEmail = filteredData.filter((emp) => emp.canSendEmail);

      if (employeesToEmail.length === 0) {
        const errorMsg =
          "No employees available for email. Either emails were already sent today or no valid email addresses found.";
        setBulkEmailProgress((prev) => ({
          ...prev,
          error: errorMsg,
          status: "error",
        }));
        return;
      }

      console.log(`Starting bulk email for ${employeesToEmail.length} employees`);

      // Reset progress
      setBulkEmailProgress({
        current: 0,
        success: 0,
        fail: 0,
        total: employeesToEmail.length,
        processing: true,
        error: "",
        status: "in-progress",
        currentEmployee: "",
      });
      setSendingEmail(true);

      let successCount = 0;
      let errorCount = 0;
      let alreadySentCount = 0;
      const errors = [];

      // Process emails sequentially with a small delay to avoid rate limiting
      for (let i = 0; i < employeesToEmail.length; i++) {
        const employee = employeesToEmail[i];

        // Update current employee
        setBulkEmailProgress((prev) => ({
          ...prev,
          currentEmployee: employee.name,
        }));

        try {
          console.log(`Processing ${i + 1}/${employeesToEmail.length}: ${employee.name}`);

          const result = await handleSendEmail(employee, bulkSMTPConfig);

          if (result && result.success) {
            successCount++;
            console.log(`✅ Sent to ${employee.name}`);
          } else if (result && result.alreadySent) {
            alreadySentCount++;
            console.log(`⚠️ Already sent to ${employee.name}`);
          } else {
            errorCount++;
            const errorMsg = result?.message || "Unknown error";
            errors.push({ employee: employee.name, error: errorMsg });
            console.log(`❌ Failed to send to ${employee.name}:`, errorMsg);
          }

          // Update progress
          setBulkEmailProgress((prev) => ({
            ...prev,
            current: i + 1,
            success: successCount,
            fail: errorCount
          }));

          // Add delay between emails (1 second) to avoid rate limiting
          if (i < employeesToEmail.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          errorCount++;
          const errorMsg = error.message || "Unknown error";
          errors.push({ employee: employee.name, error: errorMsg });
          console.error(`❌ Error processing ${employee.name}:`, error);

          setBulkEmailProgress((prev) => ({
            ...prev,
            current: i + 1,
            fail: errorCount
          }));
        }
      }

      // Prepare summary message
      let summaryMessage = "";
      let statusType = "info";

      if (successCount > 0 && errorCount === 0) {
        summaryMessage = `✅ Successfully sent ${successCount} email${successCount > 1 ? 's' : ''}`;
        if (alreadySentCount > 0) {
          summaryMessage += ` (${alreadySentCount} already sent today)`;
        }
        statusType = "success";
      } else if (successCount > 0 && errorCount > 0) {
        summaryMessage = `⚠️ Sent ${successCount} successfully, ${errorCount} failed`;
        if (alreadySentCount > 0) {
          summaryMessage += `, ${alreadySentCount} already sent`;
        }
        statusType = "warning";
      } else if (errorCount > 0) {
        summaryMessage = `❌ Failed to send ${errorCount} email${errorCount > 1 ? 's' : ''}`;
        if (alreadySentCount > 0) {
          summaryMessage += ` (${alreadySentCount} already sent)`;
        }

        // Show first 3 errors
        if (errors.length > 0) {
          const errorList = errors.slice(0, 3).map(e => `${e.employee}: ${e.error}`).join("; ");
          summaryMessage += `. Errors: ${errorList}${errors.length > 3 ? "..." : ""}`;
        }
        statusType = "error";
      } else {
        summaryMessage = "No emails were sent";
        statusType = "info";
      }

      console.log("Bulk email completed:", summaryMessage);

      setBulkEmailProgress((prev) => ({
        ...prev,
        processing: false,
        error: summaryMessage,
        status: statusType,
        currentEmployee: "",
      }));

      setSendingEmail(false);

      // Auto-clear after 10 seconds
      setTimeout(() => {
        setBulkEmailProgress({
          current: 0,
          success: 0,
          fail: 0,
          total: 0,
          processing: false,
          error: "",
          status: "idle",
          currentEmployee: "",
        });
      }, 10000);

    } catch (error) {
      console.error("Bulk email error:", error);
      setBulkEmailProgress({
        sent: 0,
        total: 0,
        processing: false,
        error: `Bulk email failed: ${error.message}`,
        status: "error",
        currentEmployee: "",
      });
      setSendingEmail(false);
    } finally {
      isBulkInProgress.current = false;
    }
  };

  // Alternative bulk email using the utility function
  const handleBulkEmailAlternative = async () => {
    try {
      const smtpCheck = getValidatedSMTPConfig();
      if (!smtpCheck.ok) {
        alert(smtpCheck.message || SMTP_MISSING_ERROR);
        return;
      }

      const employeesToEmail = filteredData.filter((emp) => emp.canSendEmail);

      if (employeesToEmail.length === 0) {
        alert("No employees available for email.");
        return;
      }

      setSendingEmail(true);
      setBulkEmailProgress({
        current: 0,
        success: 0,
        fail: 0,
        total: employeesToEmail.length,
        processing: true,
        error: "",
        status: "in-progress",
        currentEmployee: "",
      });

      // Use the sendBulkReports utility function
      const results = await sendBulkReports(
        employeesToEmail,
        (progress) => {
          setBulkEmailProgress({
            current: progress.current,
            success: progress.success || 0,
            fail: progress.failed || 0,
            total: progress.total,
            processing: progress.status === 'sending' || progress.status === 'processing',
            error: progress.error || "",
            status: progress.status === 'error' ? 'error' :
              progress.status === 'sent' ? 'success' : 'in-progress',
            currentEmployee: progress.employee || "",
          });
        },
        2, // Concurrency: 2 emails at a time
        selectedMonth,
        selectedYear
      );

      // Save successful reports
      results.results.forEach((result) => {
        if (result.success && result.employeeId) {
          saveEmailReport(
            result.employeeId,
            result.email,
            "success",
            "Email sent via bulk operation"
          );
        } else if (!result.success) {
          saveEmailReport(
            result.employeeId,
            result.email,
            "error",
            result.error || "Bulk email failed"
          );
        }
      });

      const successCount = results.results.filter(r => r.success).length;
      const errorCount = results.results.filter(r => !r.success).length;

      let summaryMessage = "";
      if (successCount > 0 && errorCount === 0) {
        summaryMessage = `✅ Successfully sent ${successCount} emails`;
      } else if (successCount > 0 && errorCount > 0) {
        summaryMessage = `⚠️ Sent ${successCount} successfully, ${errorCount} failed`;
      } else {
        summaryMessage = `❌ Failed to send ${errorCount} emails`;
      }

      setBulkEmailProgress({
        current: employeesToEmail.length,
        success: successCount,
        fail: errorCount,
        total: employeesToEmail.length,
        processing: false,
        error: summaryMessage,
        status: errorCount === 0 ? "success" : errorCount === employeesToEmail.length ? "error" : "warning",
        currentEmployee: "",
      });

    } catch (error) {
      console.error("Bulk email error:", error);
      setBulkEmailProgress({
        sent: 0,
        total: 0,
        processing: false,
        error: `Bulk email failed: ${error.message}`,
        status: "error",
        currentEmployee: "",
      });
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
            bulkEmailProgress={bulkEmailProgress}
            onBulkSend={handleBulkEmail}
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
            bulkEmailProgress={bulkEmailProgress}
            sendingEmail={sendingEmail}
            onBulkSend={handleBulkEmail}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        </div>
      }
    />
  );
};

export default FacultySummary;