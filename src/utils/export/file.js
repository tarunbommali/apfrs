const MONTH_NAME_MAP = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12
};

export const detectMonthFromFileName = (fileName = '') => {
  if (!fileName) return 11;

  const normalizedName = fileName.toLowerCase();
  for (const [key, month] of Object.entries(MONTH_NAME_MAP)) {
    if (normalizedName.includes(key)) {
      return month;
    }
  }

  const numericMatch = normalizedName.match(/(0[1-9]|1[0-2])\d{4}/);
  if (numericMatch) {
    return parseInt(numericMatch[1], 10);
  }

  console.warn('detectMonthFromFileName: defaulting to November');
  return 11;
};

export const getUniqueDepartments = (employees = []) => {
  const departments = [...new Set(employees.map((emp) => emp.department))];
  return departments.filter((dept) => dept && dept !== 'N/A').sort();
};

export const getUniqueDesignations = (employees = []) => {
  const designations = [...new Set(employees.map((emp) => emp.designation))];
  return designations.filter((value) => value && value !== 'N/A').sort();
};

export const getUniqueEmpTypes = (employees = []) => {
  const empTypes = [...new Set(employees.map((emp) => emp.empType))];
  return empTypes.filter((value) => value && value.trim() !== '').sort();
};

export const generateReportFilename = (department = 'All', month = 11, year = new Date().getFullYear()) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const safeDepartment = department.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'all';
  const monthLabel = monthNames[(month - 1 + 12) % 12];
  return `${safeDepartment}-attendance-${monthLabel}-${year}.csv`.toLowerCase();
};