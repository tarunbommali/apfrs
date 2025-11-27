/* eslint-disable no-unused-vars */
import React, { useState, useMemo } from 'react';
import { calculateSummary, getUniqueDepartments, getUniqueDesignations } from '../utils/attendanceUtils';
import { getSMTPConfig, validateSMTPConfig, sendIndividualReport } from '../utils/emailUtils';
import SummaryHeader from '../components/summary/SummaryHeader';
import FacultyTable from '../components/summary/FacultyTable';
import PageLayout from './PageLayout';

// Email report storage utilities
const EMAIL_REPORTS_KEY = 'faculty_email_reports';

const getEmailReports = () => {
  try {
    return JSON.parse(localStorage.getItem(EMAIL_REPORTS_KEY)) || {};
  } catch {
    return {};
  }
};

const saveEmailReport = (cfmsId, email, status, message = '') => {
  try {
    const reports = getEmailReports();
    const today = new Date().toDateString();
    
    if (!reports[cfmsId]) {
      reports[cfmsId] = [];
    }
    
    // Add new report
    reports[cfmsId].push({
      date: today,
      email,
      status,
      message,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 30 days of reports for each user
    reports[cfmsId] = reports[cfmsId]
      .filter(report => {
        const reportDate = new Date(report.timestamp);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return reportDate >= thirtyDaysAgo;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    localStorage.setItem(EMAIL_REPORTS_KEY, JSON.stringify(reports));
    return reports[cfmsId];
  } catch (error) {
    console.error('Error saving email report:', error);
    return [];
  }
};

const hasEmailSentToday = (cfmsId) => {
  try {
    const reports = getEmailReports();
    const today = new Date().toDateString();
    
    if (!reports[cfmsId]) return false;
    
    return reports[cfmsId].some(report => 
      report.date === today && report.status === 'success'
    );
  } catch {
    return false;
  }
};

const getLastEmailStatus = (cfmsId) => {
  try {
    const reports = getEmailReports();
    if (!reports[cfmsId] || reports[cfmsId].length === 0) return null;
    
    return reports[cfmsId][0]; // Most recent report
  } catch {
    return null;
  }
};

const FacultySummary = ({ attendanceData, fileName, onReset, Sidebar }) => {
  const [filters, setFilters] = useState({
    department: '',
    designation: '',
    status: '',
    search: ''
  });
  const [emailStatus, setEmailStatus] = useState({});
  const [sendingEmail, setSendingEmail] = useState(false);
  const [bulkEmailProgress, setBulkEmailProgress] = useState({
    sent: 0,
    total: 0,
    processing: false,
    error: '',
    status: 'idle'
  });

  // Get unique values for filters
  const departments = getUniqueDepartments(attendanceData);
  const designations = getUniqueDesignations(attendanceData);

  // Check if SMTP is configured - ALWAYS check fresh config
  const isSMTPConfigured = useMemo(() => {
    const config = getSMTPConfig();
    return validateSMTPConfig(config);
  }, []);

  // Filtered data with email status
  const filteredData = useMemo(() => {
    return attendanceData.map(employee => {
      const lastEmailStatus = getLastEmailStatus(employee.cfmsId);
      const emailSentToday = hasEmailSentToday(employee.cfmsId);
      
      return {
        ...employee,
        lastEmailStatus,
        emailSentToday,
        canSendEmail: !emailSentToday && employee.email && employee.email !== 'N/A'
      };
    }).filter(employee => {
      const summary = calculateSummary(employee);
      const percentage = (summary.presentDays / 31) * 100;
      let status = '';
      if (percentage >= 75) status = 'Good';
      else if (percentage >= 50) status = 'Average';
      else status = 'Poor';

      return (
        (filters.department === '' || employee.department === filters.department) &&
        (filters.designation === '' || employee.designation === filters.designation) &&
        (filters.status === '' || status === filters.status) &&
        (filters.search === '' ||
          employee.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          employee.cfmsId.toLowerCase().includes(filters.search.toLowerCase()) ||
          employee.department.toLowerCase().includes(filters.search.toLowerCase()))
      );
    });
  }, [attendanceData, filters]);

  // Calculate overall statistics for filtered data
  const overallStats = useMemo(() => {
    return filteredData.reduce((acc, employee) => {
      const summary = calculateSummary(employee);
      acc.totalPresent += summary.presentDays;
      acc.totalAbsent += summary.absentDays;
      acc.totalHours += parseFloat(summary.totalHours);
      acc.totalEmployees++;
      return acc;
    }, { totalPresent: 0, totalAbsent: 0, totalHours: 0, totalEmployees: 0 });
  }, [filteredData]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      department: '',
      designation: '',
      status: '',
      search: ''
    });
  };

  // Email functions
  const handleSendEmail = async (employee) => {
    console.log(`📧 Sending email to: ${employee.name} <${employee.email}>`);

    // Check if email was already sent today
    if (hasEmailSentToday(employee.cfmsId)) {
      const errorMsg = 'Email already sent to this employee today';
      console.warn('⚠️', errorMsg);
      return { success: false, message: errorMsg, alreadySent: true };
    }

    if (!isSMTPConfigured) {
      const errorMsg = 'SMTP configuration missing. Please configure email settings first.';
      console.error('❌', errorMsg);
      return { success: false, message: errorMsg };
    }

    if (!employee.email || employee.email === 'N/A') {
      const errorMsg = 'Employee does not have a valid email address';
      console.error('❌', errorMsg);
      return { success: false, message: errorMsg };
    }

    setEmailStatus(prev => ({ ...prev, [employee.cfmsId]: 'sending' }));

    try {
      // Use the dedicated utility function
      const result = await sendIndividualReport(employee);

      console.log('✅ Email sent successfully to:', employee.email);
      
      // Save successful email report
      saveEmailReport(employee.cfmsId, employee.email, 'success', 'Email sent successfully');
      
      setEmailStatus(prev => ({ ...prev, [employee.cfmsId]: 'sent' }));

      // Reset status after 3 seconds
      setTimeout(() => {
        setEmailStatus(prev => ({ ...prev, [employee.cfmsId]: '' }));
      }, 3000);

      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error sending email to', employee.email, ':', error);
      
      // Save failed email report
      saveEmailReport(
        employee.cfmsId, 
        employee.email, 
        'error', 
        error?.message || 'Unknown error occurred'
      );
      
      setEmailStatus(prev => ({ ...prev, [employee.cfmsId]: 'error' }));
      return {
        success: false,
        message: error?.message || 'Unknown error',
        hint: error?.hint,
        error: error
      };
    }
  };

  const handleBulkEmail = async () => {
    console.log('📧 Starting bulk email process');

    if (!isSMTPConfigured) {
      const errorMsg = 'SMTP configuration missing. Please configure email settings first.';
      setBulkEmailProgress(prev => ({ ...prev, error: errorMsg, status: 'error' }));
      alert(errorMsg);
      return;
    }

    const employeesToEmail = filteredData.filter(emp => emp.canSendEmail);

    if (employeesToEmail.length === 0) {
      const errorMsg = 'No employees available for email. Either emails were already sent today or no valid email addresses found.';
      setBulkEmailProgress(prev => ({ ...prev, error: errorMsg, status: 'error' }));
      console.error('❌', errorMsg);
      return;
    }

    console.log(`📧 Found ${employeesToEmail.length} employees available for email`);

    setBulkEmailProgress({
      sent: 0,
      total: employeesToEmail.length,
      processing: true,
      error: '',
      status: 'in-progress'
    });
    setSendingEmail(true);

    let successCount = 0;
    let errorCount = 0;
    let alreadySentCount = 0;
    const errors = [];

    // Send emails to all filtered employees who can receive emails today
    for (let i = 0; i < employeesToEmail.length; i++) {
      const employee = employeesToEmail[i];

      try {
        console.log(`📧 [${i + 1}/${employeesToEmail.length}] Sending to: ${employee.name}`);
        const result = await handleSendEmail(employee);
        
        if (result && result.success) {
          successCount++;
          console.log(`✅ [${i + 1}/${employeesToEmail.length}] Success: ${employee.name}`);
        } else if (result && result.alreadySent) {
          alreadySentCount++;
          console.log(`⚠️ [${i + 1}/${employeesToEmail.length}] Already sent: ${employee.name}`);
        } else {
          errorCount++;
          errors.push({ employee: employee.name, error: result?.message });
          console.error(`❌ [${i + 1}/${employeesToEmail.length}] Failed: ${employee.name} - ${result?.message}`);
        }

        // Update progress
        setBulkEmailProgress(prev => ({
          ...prev,
          sent: i + 1
        }));

        // Add delay between emails to avoid rate limiting
        if (i < employeesToEmail.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        errorCount++;
        errors.push({ employee: employee.name, error: error.message });
        console.error(`❌ [${i + 1}/${employeesToEmail.length}] Error: ${employee.name} - ${error.message}`);
        setBulkEmailProgress(prev => ({
          ...prev,
          sent: i + 1
        }));
      }
    }

    const hasFailures = errorCount > 0;
    const summaryMessage = hasFailures
      ? `${successCount} sent successfully, ${errorCount} failed, ${alreadySentCount} already sent today. ${errors.slice(0, 3).map(e => `${e.employee}: ${e.error}`).join('; ')}${errors.length > 3 ? '...' : ''}`
      : `${successCount} emails sent successfully${alreadySentCount > 0 ? `, ${alreadySentCount} already sent today` : ''}`;

    console.log(`📧 Bulk email completed: ${successCount} success, ${errorCount} failures, ${alreadySentCount} already sent`);

    setBulkEmailProgress(prev => ({
      ...prev,
      processing: false,
      error: summaryMessage,
      status: hasFailures ? 'error' : successCount > 0 ? 'success' : 'info'
    }));
    setSendingEmail(false);

    // Reset progress after 8 seconds for better visibility
    setTimeout(() => {
      setBulkEmailProgress({
        sent: 0,
        total: 0,
        processing: false,
        error: '',
        status: 'idle'
      });
    }, 8000);
  };

  const employeesWithEmail = filteredData.filter(emp => emp.canSendEmail).length;
  const employeesAlreadySent = filteredData.filter(emp => emp.emailSentToday).length;

  // Sidebar content with filters and email stats
  const sidebarContent = Sidebar || (
    <div className="space-y-6">
      <SummaryHeader
        title="Attendance Summary"
        subtitle={fileName}
        filters={filters}
        overallStats={overallStats}
        filteredCount={filteredData.length}
        totalCount={attendanceData.length}
      />

      {/* Email Status Box */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Email Reports</h3>
          {!isSMTPConfigured && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-amber-50 rounded border border-amber-200">
              <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-xs font-medium text-amber-700">SMTP Not Configured</span>
            </div>
          )}
        </div>

        {/* Email Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <div className="text-lg font-bold text-slate-900">{bulkEmailProgress.total}</div>
            <div className="text-xs text-slate-500 font-medium">TOTAL</div>
          </div>
          
          <div className="text-center p-2 bg-sky-50 rounded-lg border border-sky-100">
            <div className={`text-lg font-bold ${
              bulkEmailProgress.sent === bulkEmailProgress.total ? 'text-emerald-600' : 'text-sky-600'
            }`}>
              {bulkEmailProgress.sent}
            </div>
            <div className="text-xs text-slate-500 font-medium">SENT</div>
          </div>

          <div className="text-center p-2 bg-rose-50 rounded-lg border border-rose-100">
            <div className="text-lg font-bold text-rose-600">{Math.max(0, bulkEmailProgress.total - bulkEmailProgress.sent)}</div>
            <div className="text-xs text-slate-500 font-medium">FAILED</div>
          </div>

          <div className="text-center p-2 bg-amber-50 rounded-lg border border-amber-100">
            <div className="text-lg font-bold text-amber-600">{employeesAlreadySent}</div>
            <div className="text-xs text-slate-500 font-medium">SENT TODAY</div>
          </div>
        </div>

        {/* Status Indicators */}
        {bulkEmailProgress.processing && (
          <div className="flex items-center space-x-2 px-3 py-2 bg-sky-50 rounded-lg border border-sky-200 mb-3">
            <div className="w-2 h-2 bg-sky-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-sky-700">Sending {bulkEmailProgress.sent}/{bulkEmailProgress.total}</span>
          </div>
        )}

        {!bulkEmailProgress.processing && bulkEmailProgress.status === 'success' && (
          <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200 mb-3">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-emerald-700">Emails sent successfully</span>
          </div>
        )}

        {!bulkEmailProgress.processing && bulkEmailProgress.status === 'error' && (
          <div className="flex items-center space-x-2 px-3 py-2 bg-rose-50 rounded-lg border border-rose-200 mb-3">
            <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-medium text-rose-700">Some emails failed to send</span>
          </div>
        )}

        {employeesAlreadySent > 0 && (
          <div className="flex items-center space-x-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200 mb-3">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-amber-700">{employeesAlreadySent} already sent today</span>
          </div>
        )}

        {/* Send Report Button */}
        <button
          onClick={handleBulkEmail}
          disabled={sendingEmail || bulkEmailProgress.processing || !isSMTPConfigured || employeesWithEmail === 0}
          className="w-full px-4 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center shadow-sm font-medium"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {bulkEmailProgress.processing ? 'Sending...' : `Send Report (${employeesWithEmail})`}
        </button>

        {employeesWithEmail === 0 && (
          <p className="text-xs text-slate-500 text-center mt-2">
            {employeesAlreadySent > 0 
              ? 'All emails already sent today' 
              : 'No employees with valid email addresses in current filter'
            }
          </p>
        )}
      </div>
    </div>
  );

  // Create the Body content for the Layout
  const BodyContent = (
    <div className="space-y-6 pt-16">
      {/* Faculty List Table */}
      <div className="bg-white rounded-2xl shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800">Faculty Attendance Details</h3>
            
            {/* Simple Email Button in Header */}
            {employeesWithEmail > 0 && isSMTPConfigured && (
              <button
                onClick={handleBulkEmail}
                disabled={sendingEmail || bulkEmailProgress.processing}
                className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center shadow-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {bulkEmailProgress.processing ? 'Sending...' : 'Send Bulk Email'}
              </button>
            )}
          </div>
        </div>

        <FacultyTable
          facultyData={filteredData}
          onSendEmail={handleSendEmail}
          emailStatus={emailStatus}
          sendingEmail={sendingEmail}
          bulkEmailProgress={bulkEmailProgress}
        />
      </div>

    </div>
  );

  return (
    <PageLayout
      Sidebar={sidebarContent}
      Body={BodyContent}
    />
  );
};

export default FacultySummary;