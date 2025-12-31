export const formatPercentage = (value) => {
  return `${Number(value).toFixed(1)}%`;
};

export const formatHours = (hours) => {
  return `${Number(hours).toFixed(2)} hours`;
};

export const groupByDepartment = (employees) => {
  return employees.reduce((acc, emp) => {
    const dept = emp.department || 'Unknown';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(emp);
    return acc;
  }, {});
};

export const sortByAttendance = (employees, ascending = false) => {
  return [...employees].sort((a, b) => {
    const aPercent = a.attendancePercentage || 0;
    const bPercent = b.attendancePercentage || 0;
    return ascending ? aPercent - bPercent : bPercent - aPercent;
  });
};

export const calculateAverage = (values) => {
  if (!values.length) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
};