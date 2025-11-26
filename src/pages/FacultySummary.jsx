/* eslint-disable no-unused-vars */
import React, { useState, useMemo } from 'react';
import { calculateSummary, getUniqueDepartments, getUniqueDesignations } from '../utils/attendanceUtils';
import { getSMTPConfig, validateSMTPConfig, sendEmail, generateAttendanceReport } from '../utils/emailUtils';
import SummaryHeader from '../components/summary/SummaryHeader';
import FilterSection from '../components/summary/FilterSection';
import EmailActions from '../components/summary/EmailActions';
import FacultyTable from '../components/summary/FacultyTable';
import StatsCards from '../components/summary/StatsCards';

const FacultySummary = ({ attendanceData, fileName, onReset }) => {
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

  // Check if SMTP is configured
  const isSMTPConfigured = validateSMTPConfig(getSMTPConfig());

  // Filtered data
  const filteredData = useMemo(() => {
    return attendanceData.filter(employee => {
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
    if (!isSMTPConfigured) {
      return { success: false, message: 'SMTP configuration missing' };
    }

    setEmailStatus(prev => ({ ...prev, [employee.cfmsId]: 'sending' }));

    try {
      const summary = calculateSummary(employee);
      const report = generateAttendanceReport(employee, summary);

      await sendEmail(employee.email, report.subject, report.html, employee.name, { text: report.text });
      
      setEmailStatus(prev => ({ ...prev, [employee.cfmsId]: 'sent' }));
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setEmailStatus(prev => ({ ...prev, [employee.cfmsId]: '' }));
      }, 3000);

      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailStatus(prev => ({ ...prev, [employee.cfmsId]: 'error' }));
      return { success: false, message: error?.message || 'Unknown error' };
    }
  };

  const handleBulkEmail = async () => {
    if (!isSMTPConfigured) {
      alert('SMTP configuration missing. Please configure email settings first.');
      return;
    }

    const employeesWithEmail = filteredData.filter(emp => emp.email && emp.email !== 'N/A');
    
    if (employeesWithEmail.length === 0) {
      setBulkEmailProgress(prev => ({ ...prev, error: 'No employees with valid email addresses found', status: 'error' }));
      return;
    }

    setBulkEmailProgress({
      sent: 0,
      total: employeesWithEmail.length,
      processing: true,
      error: '',
      status: 'in-progress'
    });
    setSendingEmail(true);

    let successCount = 0;
    let errorCount = 0;

    // Send emails to all filtered employees with valid email addresses
    for (let i = 0; i < employeesWithEmail.length; i++) {
      const employee = employeesWithEmail[i];
      
      try {
        const result = await handleSendEmail(employee);
        if (result && result.success) {
          successCount++;
        } else {
          errorCount++;
        }
        
        // Update progress
        setBulkEmailProgress(prev => ({
          ...prev,
          sent: i + 1
        }));

        // Add delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        errorCount++;
        setBulkEmailProgress(prev => ({
          ...prev,
          sent: i + 1
        }));
      }
    }

    const hasFailures = errorCount > 0;
    const summaryMessage = hasFailures
      ? `${successCount} sent successfully, ${errorCount} failed`
      : `${successCount} emails sent successfully`;

    setBulkEmailProgress(prev => ({
      ...prev,
      processing: false,
      error: summaryMessage,
      status: hasFailures ? 'error' : 'success'
    }));
    setSendingEmail(false);

    // Reset progress after 5 seconds
    setTimeout(() => {
      setBulkEmailProgress({
        sent: 0,
        total: 0,
        processing: false,
        error: '',
        status: 'idle'
      });
    }, 5000);
  };

  const employeesWithEmail = filteredData.filter(emp => emp.email && emp.email !== 'N/A').length;

  return (
    <div className="space-y-6">
      {/* Overall Summary Card */}
      <SummaryHeader
        title="Faculty Attendance Summary"
        subtitle={fileName}
        filters={filters}
        overallStats={overallStats}
        filteredCount={filteredData.length}
        totalCount={attendanceData.length}
      />

      {/* Email Actions */}
      <EmailActions
        employeesWithEmail={employeesWithEmail}
        isSMTPConfigured={isSMTPConfigured}
        onBulkEmail={handleBulkEmail}
        bulkEmailProgress={bulkEmailProgress}
        sendingEmail={sendingEmail}
      />

      {/* Filters Section */}
      <FilterSection
        filters={filters}
        departments={departments}
        designations={designations}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        filteredCount={filteredData.length}
        totalCount={attendanceData.length}
      />

      {/* Faculty List Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">Faculty Attendance Details</h3>
        </div>
        
        <FacultyTable
          facultyData={filteredData}
          onSendEmail={handleSendEmail}
          emailStatus={emailStatus}
          sendingEmail={sendingEmail}
          bulkEmailProgress={bulkEmailProgress}
        />
      </div>

      {/* Statistics Cards */}
      <StatsCards
        facultyData={filteredData}
        overallStats={overallStats}
        filteredCount={filteredData.length}
      />
    </div>
  );
};

export default FacultySummary;