// Calendar configuration by year
const CALENDAR_CONFIG = {
  2025: {
    total_public_holidays: 7,
    total_optional_holidays: 1,
    total_sundays: 52,
    holidays: {
      1: [
        { day: 1, label: "New Year's Day", type: "optional" },
        { day: 26, label: "Republic Day", type: "public" }
      ],
      2: [],
      3: [],
      4: [],
      5: [
        { day: 1, label: "Labor Day", type: "public" }
      ],
      6: [],
      7: [],
      8: [
        { day: 15, label: "Independence Day", type: "public" }
      ],
      9: [],
      10: [
        { day: 2, label: "Gandhi Jayanti", type: "public" }
      ],
      11: [
        { day: 2, label: "Diwali", type: "public" }
      ],
      12: [
        { day: 25, label: "Christmas", type: "public" }
      ]
    }
  },
  2026: {
    total_public_holidays: 11,
    total_optional_holidays: 11,
    total_sundays: 52,
    holidays: {
      1: [
        { day: 1, label: "New Year's Day", type: "optional" },
        { day: 26, label: "Republic Day", type: "public" }
      ],
      2: [],
      3: [],
      4: [],
      5: [
        { day: 1, label: "Labor Day", type: "public" }
      ],
      6: [],
      7: [],
      8: [
        { day: 15, label: "Independence Day", type: "public" }
      ],
      9: [],
      10: [
        { day: 2, label: "Gandhi Jayanti", type: "public" }
      ],
      11: [
        { day: 2, label: "Diwali", type: "public" }
      ],
      12: [
        { day: 25, label: "Christmas", type: "public" }
      ]
    }
  }
};

// Legacy support for older code expecting HOLIDAYS_BY_MONTH (defaults to 2025)
const HOLIDAYS_BY_MONTH = CALENDAR_CONFIG[2025].holidays;

// Color mapping for holiday types
const HOLIDAY_TYPE_COLORS = {
  public: '#ef4444',      // Red for public holidays
  optional: '#f59e0b',    // Amber for optional holidays
  custom: '#8b5cf6',      // Purple for custom events
  academic: '#3b82f6',    // Blue for academic events
  festival: '#ec4899',    // Pink for festivals
  other: '#6b7280'        // Gray for other events
};

// Get calendar configuration for a specific year
const getCalendarConfig = (year) => {
  return CALENDAR_CONFIG[year] || null;
};

// Get holidays for a specific year and month
const getHolidaysByMonth = (year, month) => {
  const config = getCalendarConfig(year);
  if (!config || !config.holidays) return [];
  return config.holidays[month] || [];
};

// Helper function to get holiday days as array (for backward compatibility)
const getHolidayDays = (month, year = new Date().getFullYear()) => {
  const holidays = getHolidaysByMonth(year, month);
  return holidays.map(h => h.day);
};

// Helper function to get holiday label
const getHolidayLabel = (month, day, year = new Date().getFullYear()) => {
  const holidays = getHolidaysByMonth(year, month);
  const holiday = holidays.find(h => h.day === day);
  return holiday ? holiday.label : null;
};

// Helper function to get holiday type
const getHolidayType = (month, day, year = new Date().getFullYear()) => {
  const holidays = getHolidaysByMonth(year, month);
  const holiday = holidays.find(h => h.day === day);
  return holiday ? holiday.type : null;
};

// Helper function to get color for holiday type
const getColorForType = (type) => {
  return HOLIDAY_TYPE_COLORS[type] || HOLIDAY_TYPE_COLORS.other;
};

// Get available years
const getAvailableYears = () => {
  return Object.keys(CALENDAR_CONFIG).map(Number).sort((a, b) => b - a);
};

// Get statistics for a year
const getYearStats = (year) => {
  const config = getCalendarConfig(year);
  if (!config) return null;

  return {
    year,
    totalPublicHolidays: config.total_public_holidays,
    totalOptionalHolidays: config.total_optional_holidays,
    totalSundays: config.total_sundays
  };
};

export {
  HOLIDAYS_BY_MONTH,
  CALENDAR_CONFIG,
  HOLIDAY_TYPE_COLORS,
  getCalendarConfig,
  getHolidaysByMonth,
  getHolidayDays,
  getHolidayLabel,
  getHolidayType,
  getColorForType,
  getAvailableYears,
  getYearStats
};