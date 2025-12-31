/* eslint-disable no-unused-vars */
import { getSMTPConfig, validateSMTPConfig } from './smtpConfig';
import { calculateSummary as calculateSummaryFromUtils, getHardcodedWorkingDays } from './attendanceUtils';
import { generateAttendanceReport, generatePlaintextFromSummary } from './emailGenerator';
import { sendEmail, sendIndividualReport } from './emailService';

const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME || 'APFRS';
const REPORT_SYSTEM_NAME = import.meta.env.VITE_REPORT_SYSTEM_NAME || 'Attendance System';


// Calculate summary for email
const calculateSummaryForEmail = (employee = {}, monthNumber = 11, year = new Date().getFullYear()) => {
  return calculateSummaryFromUtils(employee, monthNumber, year);
};

// Bulk email sending
export const sendBulkReports = async (employees, onProgress = () => { }, concurrency = 2, monthNumber = 11, year = new Date().getFullYear()) => {
  console.log(`📧 Starting bulk attendance reports for ${employees.length} employees`);

  const validEmployees = employees.filter(emp =>
    emp.email && emp.email.includes('@') && emp.email !== 'N/A'
  );

  if (validEmployees.length !== employees.length) {
    console.warn(`⚠️ Filtered out ${employees.length - validEmployees.length} employees with invalid email addresses`);
  }

  const results = [];
  const queue = [...validEmployees];
  const config = getSMTPConfig();

  let active = 0;
  let index = 0;
  let successCount = 0;
  let failureCount = 0;

  const next = async () => {
    if (queue.length === 0) return;
    const emp = queue.shift();
    const pos = ++index;

    onProgress({
      current: pos,
      total: validEmployees.length,
      employee: emp.name,
      status: 'processing',
      processed: index - 1,
      success: successCount,
      failed: failureCount
    });

    try {
      const startTime = Date.now();
      const result = await sendIndividualReport(emp, null, monthNumber, year);
      const duration = Date.now() - startTime;

      successCount++;
      results.push({
        employee: emp.name,
        email: emp.email,
        employeeId: emp.cfmsId || emp.employeeId,
        success: true,
        data: result,
        duration,
        timestamp: new Date().toISOString()
      });

      onProgress({
        current: pos,
        total: validEmployees.length,
        employee: emp.name,
        status: 'sent',
        processed: index,
        success: successCount,
        failed: failureCount,
        duration
      });
    } catch (err) {
      failureCount++;
      results.push({
        employee: emp.name,
        email: emp.email,
        employeeId: emp.cfmsId || emp.employeeId,
        success: false,
        error: err?.message || String(err),
        hint: err?.hint,
        timestamp: new Date().toISOString()
      });

      onProgress({
        current: pos,
        total: validEmployees.length,
        employee: emp.name,
        status: 'error',
        error: err?.message || String(err),
        processed: index,
        success: successCount,
        failed: failureCount
      });
    } finally {
      active -= 1;
      if (queue.length > 0) await next();
    }
  };

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, 5)) }, () => {
    active += 1;
    return next();
  });

  console.log(`🚀 Starting ${workers.length} concurrent workers for bulk reports`);

  await Promise.allSettled(workers);

  const summary = {
    total: validEmployees.length,
    success: successCount,
    failed: failureCount,
    successRate: validEmployees.length > 0 ? (successCount / validEmployees.length * 100).toFixed(1) : 0,
    duration: results.length > 0
      ? results.reduce((sum, r) => sum + (r.duration || 0), 0)
      : 0,
    averageTime: successCount > 0
      ? results.filter(r => r.success).reduce((sum, r) => sum + (r.duration || 0), 0) / successCount
      : 0
  };

  console.log(`📊 Bulk report completion summary:`, summary);
  console.log(`✅ Successfully sent: ${successCount}/${validEmployees.length} reports`);

  if (failureCount > 0) {
    console.error(`❌ Failed reports:`, results.filter(r => !r.success).map(r => ({
      employee: r.employee,
      error: r.error
    })));
  }

  return {
    results,
    summary,
    generatedAt: new Date().toISOString(),
    config: {
      companyName: config?.companyName,
      systemName: config?.systemName,
      concurrency: workers.length
    }
  };
};

// Test email function
export const sendTestEmail = async (testRecipient = null, configOverride = null, monthNumber = 11, year = new Date().getFullYear()) => {
  const config = configOverride || getSMTPConfig();
  const validation = validateSMTPConfig(config);

  if (!validation.isValid) {
    throw new Error(`SMTP configuration error: ${validation.error}`);
  }

  const recipient = testRecipient || config.testRecipient || config.user;
  if (!recipient || !recipient.includes('@')) {
    throw new Error('Invalid test recipient email address. Please provide a valid email.');
  }

  console.log(`🧪 Sending test attendance report to: ${recipient}`);

  const testEmployee = {
    name: 'John Smith',
    email: recipient,
    cfmsId: 'EMP-2024-001',
    employeeId: 'EMP-2024-001',
    department: 'Information Technology',
    designation: 'Senior Software Engineer',
    period: `${[
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ][monthNumber - 1]} ${year}`,
    attendance: Array.from({ length: 30 }, (_, i) => {
      const day = i + 1;
      const isWorkingDay = getHardcodedWorkingDays(monthNumber, 30, year).includes(day);
      const isHoliday = !isWorkingDay;
      const isLeave = day >= 10 && day <= 12;
      const isLate = day === 5 || day === 19;
      const isHalfDay = day === 15;

      let status = 'P';
      let inTime = '09:00';
      let outTime = '17:30';
      let hours = 8.5;

      if (isHoliday) {
        status = 'A';
      } else if (isLeave) {
        status = 'L';
        inTime = '-';
        outTime = '-';
        hours = 0;
      } else if (isLate) {
        status = 'P';
        inTime = '10:15';
        hours = 7.25;
      } else if (isHalfDay) {
        status = 'P';
        outTime = '13:00';
        hours = 4.0;
      }

      return {
        date: `${year}-${monthNumber.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
        day: day,
        inTime,
        outTime,
        status,
        duration: `${hours} hours`,
        hours: hours.toString()
      };
    })
  };

  try {
    const result = await sendIndividualReport(testEmployee, config, monthNumber, year);
    console.log('✅ Test attendance report sent successfully');
    return {
      success: true,
      message: 'Test attendance report sent successfully',
      recipient,
      reportId: result.reportData?.reportId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to send test attendance report:', error);
    throw new Error(`Failed to send test report: ${error.message}`);
  }
};

// Utility functions for reporting
export const generateReportStatistics = (results = []) => {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  const avgPercentage = successful.length > 0
    ? successful.reduce((sum, r) => sum + parseFloat(r.data?.reportData?.percentage || 0), 0) / successful.length
    : 0;

  return {
    totalReports: results.length,
    successful: successful.length,
    failed: failed.length,
    successRate: results.length > 0 ? (successful.length / results.length * 100).toFixed(1) : 0,
    averageAttendance: avgPercentage.toFixed(1),
    failedDetails: failed.map(f => ({
      employee: f.employee,
      error: f.error,
      email: f.email
    }))
  };
};

export const validateEmployeeData = (employee) => {
  const errors = [];

  if (!employee.name || employee.name.trim().length < 2) {
    errors.push('Employee name is required and must be at least 2 characters long');
  }

  if (!employee.email || !employee.email.includes('@') || !employee.email.includes('.')) {
    errors.push('Valid email address is required');
  }

  if (!employee.attendance || !Array.isArray(employee.attendance)) {
    errors.push('Attendance data is required');
  } else if (employee.attendance.length === 0) {
    errors.push('Attendance data cannot be empty');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: []
  };
};

export { sendEmail, sendIndividualReport, getSMTPConfig, validateSMTPConfig };