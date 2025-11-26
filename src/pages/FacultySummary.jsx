/* eslint-disable no-unused-vars */
import React, { useState, useMemo } from 'react';
import { calculateSummary, getUniqueDepartments, getUniqueDesignations } from '../utils/attendanceUtils';
import { getSMTPConfig, validateSMTPConfig, sendEmail, generateAttendanceReport, sendIndividualReport } from '../utils/emailUtils';
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

  // Check if SMTP is configured - ALWAYS check fresh config
  const isSMTPConfigured = useMemo(() => {
    const config = getSMTPConfig();
    return validateSMTPConfig(config);
  }, []);

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
    console.log(`📧 Sending email to: ${employee.name} <${employee.email}>`);
    
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
      setEmailStatus(prev => ({ ...prev, [employee.cfmsId]: 'sent' }));
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setEmailStatus(prev => ({ ...prev, [employee.cfmsId]: '' }));
      }, 3000);

      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error sending email to', employee.email, ':', error);
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

    const employeesWithEmail = filteredData.filter(emp => emp.email && emp.email !== 'N/A');
    
    if (employeesWithEmail.length === 0) {
      const errorMsg = 'No employees with valid email addresses found in the current filter';
      setBulkEmailProgress(prev => ({ ...prev, error: errorMsg, status: 'error' }));
      console.error('❌', errorMsg);
      return;
    }

    console.log(`📧 Found ${employeesWithEmail.length} employees with email addresses`);

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
    const errors = [];

    // Send emails to all filtered employees with valid email addresses
    for (let i = 0; i < employeesWithEmail.length; i++) {
      const employee = employeesWithEmail[i];
      
      try {
        console.log(`📧 [${i + 1}/${employeesWithEmail.length}] Sending to: ${employee.name}`);
        const result = await handleSendEmail(employee);
        if (result && result.success) {
          successCount++;
          console.log(`✅ [${i + 1}/${employeesWithEmail.length}] Success: ${employee.name}`);
        } else {
          errorCount++;
          errors.push({ employee: employee.name, error: result?.message });
          console.error(`❌ [${i + 1}/${employeesWithEmail.length}] Failed: ${employee.name} - ${result?.message}`);
        }
        
        // Update progress
        setBulkEmailProgress(prev => ({
          ...prev,
          sent: i + 1
        }));

        // Add delay between emails to avoid rate limiting
        if (i < employeesWithEmail.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        errorCount++;
        errors.push({ employee: employee.name, error: error.message });
        console.error(`❌ [${i + 1}/${employeesWithEmail.length}] Error: ${employee.name} - ${error.message}`);
        setBulkEmailProgress(prev => ({
          ...prev,
          sent: i + 1
        }));
      }
    }

    const hasFailures = errorCount > 0;
    const summaryMessage = hasFailures
      ? `${successCount} sent successfully, ${errorCount} failed. ${errors.slice(0, 3).map(e => `${e.employee}: ${e.error}`).join('; ')}${errors.length > 3 ? '...' : ''}`
      : `${successCount} emails sent successfully`;

    console.log(`📧 Bulk email completed: ${successCount} success, ${errorCount} failures`);

    setBulkEmailProgress(prev => ({
      ...prev,
      processing: false,
      error: summaryMessage,
      status: hasFailures ? 'error' : 'success'
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
          {!isSMTPConfigured && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              ⚠️ SMTP not configured. Please configure email settings to send reports.
            </div>
          )}
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