export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DEFAULT_WORKING_HOURS = 8;
export const LATE_THRESHOLD_MINUTES = 15;
export const EARLY_DEPARTURE_MINUTES = 15;

export const ATTENDANCE_STATUS = {
  PRESENT: 'P',
  ABSENT: 'A',
  LEAVE: 'L',
  HOLIDAY: 'H',
  HALF_DAY: 'HD',
  LATE: 'Late'
};

export const HOLIDAYS_2025 = {
  1: [1, 26], // January: 1, 26
  4: [14],    // April: 14
  8: [15],    // August: 15
  // ... other months
};