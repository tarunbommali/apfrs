import { persons } from './data';

export const processAttendanceData = (rawData) => {
  if (!rawData || rawData.length < 3) return [];

  const processed = [];
  
  for (let i = 2; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length < 4) continue;

    const cfmsId = row[2]?.toString() || '';
    
    // Find person data from persons array
    const personInfo = persons.find(person => person.cfms_id === cfmsId) || {};
    
    const employee = {
      name: row[0] || 'Unknown',
      designation: personInfo.designation || row[1] || '',
      cfmsId: cfmsId,
      empType: row[3] || '',
      department: personInfo.department || 'N/A',
      email: personInfo.email || '',
      attendance: []
    };

    for (let day = 1; day <= 31; day++) {
      const baseCol = 4 + (day - 1) * 4;

      employee.attendance.push({
        day: day,
        inTime: row[baseCol] || '',
        outTime: row[baseCol + 1] || '',
        status: row[baseCol + 2] || '',
        duration: row[baseCol + 3] || ''
      });
    }
    
    processed.push(employee);
  }
  
  return processed;
};

export const calculateSummary = (employee) => {
  const presentDays = employee.attendance.filter(a => a.status === 'P').length;
  const absentDays = employee.attendance.filter(a => a.status === 'A').length;
  
  let totalHours = 0;
  employee.attendance.forEach(day => {
    if (day.duration) {
      const [hours, minutes, seconds] = day.duration.split(':').map(Number);
      totalHours += hours + minutes / 60 + seconds / 3600;
    }
  });

  return {
    presentDays,
    absentDays,
    totalHours: totalHours.toFixed(2)
  };
};

export const calculateOverallStats = (attendanceData) => {
  const totalDays = 31;
  
  return attendanceData.reduce((acc, employee) => {
    const summary = calculateSummary(employee);
    const percentage = (summary.presentDays / totalDays) * 100;
    
    acc.totalPresent += summary.presentDays;
    acc.totalAbsent += summary.absentDays;
    acc.totalHours += parseFloat(summary.totalHours);
    acc.totalEmployees++;
    
    if (percentage >= 75) acc.goodAttendance++;
    else if (percentage >= 50) acc.averageAttendance++;
    else acc.poorAttendance++;
    
    return acc;
  }, { 
    totalPresent: 0, 
    totalAbsent: 0, 
    totalHours: 0, 
    totalEmployees: 0,
    goodAttendance: 0,
    averageAttendance: 0,
    poorAttendance: 0
  });
};

// Get unique departments for filter
export const getUniqueDepartments = (attendanceData) => {
  const departments = [...new Set(attendanceData.map(emp => emp.department))];
  return departments.filter(dept => dept && dept !== 'N/A').sort();
};

// Get unique designations for filter
export const getUniqueDesignations = (attendanceData) => {
  const designations = [...new Set(attendanceData.map(emp => emp.designation))];
  return designations.filter(desig => desig && desig !== 'N/A').sort();
};