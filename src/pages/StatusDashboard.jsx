import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import PageLayout from './PageLayout';
import {
  Users,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  Search,
  Filter,
  BarChart3,
  AlertCircle,
  Send,
  Loader2
} from 'lucide-react';
import {
  getEmailStatusStore,
  clearEmailStatusStore,
  setEmailSent,
  setEmailFailed
} from '../utils/emailStatusStore';
import { generateIndividualPDF, downloadReport } from '../utils/reportGenerator';
import { calculateSummary } from '../utils/attendanceUtils';
import { sendBulkReports, validateSMTPConfig } from '../utils/emailUtils';
import { sendIndividualReport } from '../utils/emailService';
import { getActiveSMTPConfig } from '../utils/smtpConfigStore';

const StatusBadge = ({ status }) => {
  const styles = {
    sent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-100 text-rose-700 border-rose-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    none: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  const icons = {
    sent: <CheckCircle className="w-3.5 h-3.5" />,
    failed: <XCircle className="w-3.5 h-3.5" />,
    pending: <Clock className="w-3.5 h-3.5" />,
    none: <Mail className="w-3.5 h-3.5" />
  };

  const labels = {
    sent: 'Sent',
    failed: 'Failed',
    pending: 'Pending',
    none: 'Not Sent'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.none}`}>
      {icons[status] || icons.none}
      {labels[status] || labels.none}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm`}>
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {subtext && <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
  </div>
);

const StatusDashboard = () => {
  const { attendanceData, selectedMonth, selectedYear, hasData } = useAttendance();
  const [emailStatuses, setEmailStatuses] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const activeConfig = useMemo(() => getActiveSMTPConfig(), []);

  // Bulk Sending State
  const [isSending, setIsSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({
    total: 0,
    current: 0,
    success: 0,
    failed: 0,
    processing: false,
    status: 'idle',
    error: null,
    currentEmployee: ''
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const periodKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  // Load email statuses from localStorage
  const loadEmailStatuses = useCallback(() => {
    const store = getEmailStatusStore();
    setEmailStatuses(store);
  }, []);

  useEffect(() => {
    loadEmailStatuses();

    // Listen for storage changes
    const handleStorageChange = () => loadEmailStatuses();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('email-status-updated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('email-status-updated', handleStorageChange);
    };
  }, [loadEmailStatuses]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadEmailStatuses();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleClearStatuses = () => {
    if (window.confirm('Are you sure you want to clear all email statuses? This cannot be undone.')) {
      clearEmailStatusStore();
      loadEmailStatuses();
    }
  };

  // Process data with email statuses
  const processedData = useMemo(() => {
    if (!attendanceData || !Array.isArray(attendanceData)) return [];

    return attendanceData.map(employee => {
      const emailKey = employee.email?.toLowerCase();
      const statusData = emailStatuses[emailKey];

      // Check if status is for current month
      let currentStatus = 'none';
      let statusTimestamp = null;
      let statusError = null;

      if (statusData && statusData.month === periodKey) {
        currentStatus = statusData.status;
        statusTimestamp = statusData.timestamp;
        statusError = statusData.error;
      }

      const summary = calculateSummary(employee, selectedMonth, selectedYear);
      const hasValidEmail = employee.email && employee.email.includes('@') && employee.email !== 'N/A';
      const reportGenerated = currentStatus === 'sent';

      return {
        ...employee,
        emailStatus: currentStatus,
        statusTimestamp,
        statusError,
        hasValidEmail,
        reportGenerated,
        summary
      };
    });
  }, [attendanceData, emailStatuses, periodKey, selectedMonth, selectedYear]);

  // Filter data
  const filteredData = useMemo(() => {
    return processedData.filter(emp => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = emp.name?.toLowerCase().includes(search);
        const matchesEmail = emp.email?.toLowerCase().includes(search);
        const matchesDept = emp.department?.toLowerCase().includes(search);
        if (!matchesName && !matchesEmail && !matchesDept) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && emp.emailStatus !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [processedData, searchTerm, statusFilter]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = processedData.length;
    const sent = processedData.filter(e => e.emailStatus === 'sent').length;
    const failed = processedData.filter(e => e.emailStatus === 'failed').length;
    const pending = processedData.filter(e => e.emailStatus === 'pending').length;
    const notSent = processedData.filter(e => e.emailStatus === 'none').length;
    const withEmail = processedData.filter(e => e.hasValidEmail).length;
    const reportsGenerated = processedData.filter(e => e.reportGenerated).length;

    return { total, sent, failed, pending, notSent, withEmail, reportsGenerated };
  }, [processedData]);

  const handleDownloadReport = async (employee, format = 'pdf') => {
    try {
      const summary = calculateSummary(employee, selectedMonth, selectedYear);
      const reportData = {
        employee,
        summary,
        month: selectedMonth,
        year: selectedYear,
        periodLabel: `${monthNames[selectedMonth - 1]} ${selectedYear}`
      };

      await downloadReport(reportData, format);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report: ' + error.message);
    }
  };



  const handleBulkSend = async () => {
    if (!activeConfig) {
      alert('Please configure SMTP settings first');
      return;
    }

    const validation = validateSMTPConfig(activeConfig);
    if (!validation.isValid) {
      alert('Invalid SMTP Configuration: ' + validation.error);
      return;
    }

    // Filter employees with valid emails AND who haven't received it yet (optional but good)
    // Actually, sending to all valid emails is better, let user filter if they want partial.
    // For now, let's send to all filtered data that has email, respecting current view filters is confusing?
    // Let's stick to ALL valid employees in the dataset to be safe/consistent.
    const employeesToEmail = attendanceData.filter(emp =>
      emp.email && emp.email.includes('@') && emp.email !== 'N/A'
    );

    if (employeesToEmail.length === 0) {
      alert('No valid recipients found.');
      return;
    }

    if (!confirm(`Are you sure you want to send emails to ${employeesToEmail.length} faculty members?`)) {
      return;
    }

    setIsSending(true);
    setBulkProgress({
      total: employeesToEmail.length,
      current: 0,
      success: 0,
      failed: 0,
      processing: true,
      status: 'sending',
      error: null,
      currentEmployee: ''
    });

    try {
      const results = await sendBulkReports(
        employeesToEmail,
        (progress) => {
          setBulkProgress(prev => ({
            ...prev,
            current: progress.current,
            success: progress.success,
            failed: progress.failed,
            currentEmployee: progress.employee,
            status: progress.status === 'processing' || progress.status === 'sending' ? 'sending' : prev.status
          }));
        },
        2, // Concurrency
        selectedMonth,
        selectedYear
      );

      // Update stores
      results.results.forEach(res => {
        if (res.success) {
          setEmailSent(res.email, periodKey);
        } else {
          setEmailFailed(res.email, periodKey, res.error);
        }
      });

      loadEmailStatuses(); // Refresh UI immediately

      setBulkProgress(prev => ({
        ...prev,
        processing: false,
        status: 'completed',
        currentEmployee: ''
      }));

      alert(`Bulk sending completed. Sent: ${results.summary.success}, Failed: ${results.summary.failed}`);

    } catch (error) {
      console.error('Bulk send error:', error);
      setBulkProgress(prev => ({
        ...prev,
        processing: false,
        status: 'error',
        error: error.message
      }));
      alert('Bulk sending failed: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };


  const bodyContent = (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            Email Status Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Track and manage email delivery for {monthNames[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBulkSend}
            disabled={isSending || !hasData}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isSending ? 'Sending...' : 'Send Bulk Emails'}
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleClearStatuses}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium hover:bg-rose-100 transition-all shadow-sm"
          >
            Clear All
          </button>
        </div>
      </header>

      {!hasData ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-amber-900 mb-2">No Data Available</h3>
          <p className="text-amber-700">
            Please upload attendance data first to view the status dashboard.
          </p>
        </div>
      ) : (
        <>
          {/* Progress Overlay/Section */}
          {bulkProgress.status !== 'idle' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  {bulkProgress.status === 'sending' && <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />}
                  {bulkProgress.status === 'completed' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                  {bulkProgress.status === 'error' && <XCircle className="w-5 h-5 text-rose-600" />}

                  {bulkProgress.status === 'sending' ? 'Sending Emails...' :
                    bulkProgress.status === 'completed' ? 'Batch Completed' : 'Batch Failed'}
                </h3>
                <span className="text-sm font-medium text-slate-500">
                  {bulkProgress.current} / {bulkProgress.total} Processed
                </span>
              </div>

              <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-4 relative">
                {/* Animated striped background for processing state */}
                <div
                  className={`h-full bg-indigo-600 transition-all duration-300 ease-out ${bulkProgress.status === 'sending' ? 'animate-pulse' : ''}`}
                  style={{ width: `${(bulkProgress.current / (bulkProgress.total || 1)) * 100}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center transition-all duration-300 transform hover:scale-105">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Success</span>
                  <div className="text-xl font-bold text-emerald-800 transition-all duration-300">
                    {bulkProgress.success}
                  </div>
                </div>
                <div className="bg-rose-50 rounded-xl p-3 border border-rose-100 text-center transition-all duration-300 transform hover:scale-105">
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Failed</span>
                  <div className="text-xl font-bold text-rose-800">
                    {bulkProgress.failed}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center transition-all duration-300">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Remaining</span>
                  <div className="text-xl font-bold text-slate-700">
                    {Math.max(0, bulkProgress.total - (bulkProgress.success + bulkProgress.failed))}
                  </div>
                </div>
              </div>
              {bulkProgress.processing && (
                <div className="mt-4 text-sm text-slate-600 text-center flex items-center justify-center gap-2">
                  <span className="animate-pulse font-medium text-indigo-600">Processing:</span>
                  <span className="font-semibold text-slate-800">{bulkProgress.currentEmployee}</span>
                </div>
              )}

            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Total Faculty"
              value={stats.total}
              color="bg-indigo-600"
              subtext={`${stats.withEmail} with valid email`}
            />
            <StatCard
              icon={CheckCircle}
              label="Emails Sent"
              value={stats.sent}
              color="bg-emerald-600"
              subtext={stats.total > 0 ? `${((stats.sent / stats.total) * 100).toFixed(1)}% success` : '0%'}
            />
            <StatCard
              icon={XCircle}
              label="Failed"
              value={stats.failed}
              color="bg-rose-600"
              subtext="Needs retry"
            />
            <StatCard
              icon={Clock}
              label="Pending"
              value={stats.pending + stats.notSent}
              color="bg-amber-600"
              subtext="Not yet sent"
            />
          </div>

          {/* Data Table with Filters */}
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    data-testid="status-search-input"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    data-testid="status-filter-select"
                  >
                    <option value="all">All Statuses</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                    <option value="none">Not Sent</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="status-table">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Faculty</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Department</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Report</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="text-center px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          No records found matching your criteria
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((employee, idx) => (
                        <tr key={employee.cfmsId || idx} className="hover:bg-slate-50 transition-colors" data-testid={`status-row-${employee.cfmsId}`}>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-slate-900">{employee.name}</p>
                              <p className="text-sm text-slate-500">{employee.designation || 'N/A'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-sm ${employee.hasValidEmail ? 'text-slate-700' : 'text-rose-500'}`}>
                              {employee.email || 'No email'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {employee.department || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {employee.reportGenerated ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium">
                                <CheckCircle className="w-4 h-4" />
                                Yes
                              </span>
                            ) : (
                              <span className="text-slate-400 text-sm">No</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <StatusBadge status={employee.emailStatus} />
                            {employee.statusTimestamp && (
                              <p className="text-xs text-slate-400 mt-1">
                                {new Date(employee.statusTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                            {employee.statusError && (
                              <p className="text-xs text-rose-500 mt-1 truncate max-w-[150px]" title={employee.statusError}>
                                {employee.statusError}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleDownloadReport(employee, 'pdf')}
                                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filteredData.length > 0 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                  <p className="text-sm text-slate-500">
                    Showing {filteredData.length} of {processedData.length} records
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return <PageLayout Sidebar={null} Body={bodyContent} />;
};

export default StatusDashboard;
