import * as calculations from './attendanceCalculations';
import * as dataProcessing from './dataProcessor';
import * as timeHelpers from './timeUtils';
import * as dateTimeHelpers from './dateTimeUtils';
import * as fileHelpers from './fileUtils';
import * as exportHelpers from './exportUtils';
import * as validationHelpers from './validationUtils';

export {
  calculateSummary,
  calculateOverallStats,
  calculateMonthlyStats,
  calculateAttendanceTrends
} from './attendanceCalculations';

export {
  processAttendanceData,
  handleExcelUpload,
  analyzeAttendanceData,
  filterEmployees
} from './dataProcessor';

export { parseDurationToHours, estimateHoursFromTimes } from './timeUtils';

export {
  getHardcodedWorkingDays,
  getWorkingDays,
  getHolidays,
  getDaysInMonth,
  compareHolidaysWithAttendance,
  getDayAttendanceStatus
} from './dateTimeUtils';

export {
  detectMonthFromFileName,
  getUniqueDepartments,
  getUniqueDesignations,
  getUniqueEmpTypes,
  generateReportFilename
} from './fileUtils';

export { exportToCSV } from './exportUtils';

export {
  validateEmployeeRecord,
  sanitizeAttendanceData,
  validateTimeFormat,
  validateDateRange,
  validateAttendanceData
} from './validationUtils';

export const calculateWorkingDays = (attendanceData, monthNumber = 11, totalDaysOverride = null, year = new Date().getFullYear()) => {
  return dateTimeHelpers.getWorkingDays(attendanceData, monthNumber, totalDaysOverride, year);
};

const attendanceUtils = {
  ...calculations,
  ...dataProcessing,
  ...timeHelpers,
  ...dateTimeHelpers,
  ...fileHelpers,
  ...exportHelpers,
  ...validationHelpers,
  calculateWorkingDays
};

export default attendanceUtils;
