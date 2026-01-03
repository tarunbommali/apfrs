export const validateEmployeeRecord = (employee) => {
  if (!employee) {
    return { isValid: false, errors: ['Employee record is missing'] };
  }

  const errors = [];
  if (!employee.name || employee.name.trim() === '') {
    errors.push('Employee name is required');
  }
  if (!employee.attendance || !Array.isArray(employee.attendance)) {
    errors.push('Attendance records are missing');
  }

  return { isValid: errors.length === 0, errors };
};

export const sanitizeAttendanceData = (data = []) => {
  return data.filter((employee) => employee && employee.name);
};

export const validateTimeFormat = (timeString) => {
  if (!timeString) return false;
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(timeString);
};

export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  return new Date(startDate) <= new Date(endDate);
};

export const validateAttendanceData = (attendanceData) => {
  const errors = [];
  const warnings = [];

  if (!attendanceData || !Array.isArray(attendanceData)) {
    errors.push('No attendance data provided');
    return { isValid: false, errors, warnings };
  }

  if (attendanceData.length === 0) {
    errors.push('Attendance data is empty');
    return { isValid: false, errors, warnings };
  }

  const firstEmp = attendanceData[0];
  if (!firstEmp.attendance || !Array.isArray(firstEmp.attendance)) {
    errors.push('First employee has no attendance records');
  }

  attendanceData.forEach((emp, index) => {
    if (!emp.name || emp.name.trim() === '') {
      errors.push(`Employee at index ${index} has no name`);
    }
    if (!emp.cfmsId || emp.cfmsId.trim() === '') {
      warnings.push(`Employee "${emp.name}" at index ${index} has no CFMS ID`);
    }
    if (!emp.attendance || !Array.isArray(emp.attendance)) {
      errors.push(`Employee "${emp.name}" has no attendance records`);
    }
  });

  const dayCounts = new Set(attendanceData.map((emp) => emp.attendance?.length || 0));
  if (dayCounts.size > 1) {
    warnings.push(`Inconsistent number of attendance days: ${Array.from(dayCounts).join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};