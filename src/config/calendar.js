// Calendar configuration by year
const CALENDAR_CONFIG = {
  2026: {
    state: "Andhra Pradesh",
    authority: "G.O. Rt. No.2276 GAD (Poll.B) Dept",
    total_general_holidays: 24,
    max_optional_holidays_allowed: 5,
    weekly_offs: {
      sundays: true,
      second_saturdays: true
    },

    holidays: {
      1: [
        { day: 1, label: "New Year's Day", type: "optional" },
        { day: 14, label: "Bhogi", type: "general" },
        { day: 15, label: "Makara Sankranti", type: "general" },
        { day: 16, label: "Kanuma", type: "general" },
        { day: 26, label: "Republic Day", type: "general" },

        { day: 4, label: "Weekend", type: "sunday" },
        { day: 10, label: "Second Saturday", type: "second_saturday" },
        { day: 11, label: "Weekend", type: "sunday" },
        { day: 18, label: "Weekend", type: "sunday" },
        { day: 25, label: "Weekend", type: "sunday" }
      ],

      2: [
        { day: 3, label: "Shab-E-Barath", type: "optional" },
        { day: 15, label: "Maha Sivarathri", type: "general", note: "Sunday" },

        { day: 1, label: "Weekend", type: "sunday" },
        { day: 8, label: "Weekend", type: "sunday" },
        { day: 14, label: "Second Saturday", type: "second_saturday" },
        { day: 22, label: "Weekend", type: "sunday" }
      ],

      3: [
        { day: 3, label: "Holi", type: "general" },
        { day: 11, label: "Shahadat of Hazrath Ali (R.A.)", type: "optional" },
        { day: 13, label: "Jamatul Veda", type: "optional" },
        { day: 15, label: "Shab-E-Qadar", type: "optional", note: "Sunday" },
        { day: 19, label: "Ugadi", type: "general" },
        { day: 20, label: "Eid-ul-Fitr (Ramzan)", type: "general" },
        { day: 27, label: "Sri Rama Navami", type: "general" },

        { day: 1, label: "Weekend", type: "sunday" },
        { day: 8, label: "Weekend", type: "sunday" },
        { day: 14, label: "Second Saturday", type: "second_saturday" },
        { day: 22, label: "Weekend", type: "sunday" },
        { day: 29, label: "Weekend", type: "sunday" }
      ],

      4: [
        { day: 3, label: "Good Friday", type: "general" },
        { day: 5, label: "Babu Jagjivan Ram Birthday", type: "general", note: "Sunday" },
        { day: 14, label: "Dr. B.R. Ambedkar Jayanti", type: "general" },
        { day: 20, label: "Basava Jayanti", type: "optional" },

        { day: 4, label: "Second Saturday", type: "second_saturday" },
        { day: 12, label: "Weekend", type: "sunday" },
        { day: 19, label: "Weekend", type: "sunday" },
        { day: 26, label: "Weekend", type: "sunday" }
      ],

      5: [
        { day: 1, label: "Buddha Purnima", type: "optional" },
        { day: 27, label: "Eid-ul-Adha (Bakrid)", type: "general" },

        { day: 2, label: "Second Saturday", type: "second_saturday" },
        { day: 3, label: "Weekend", type: "sunday" },
        { day: 10, label: "Weekend", type: "sunday" },
        { day: 17, label: "Weekend", type: "sunday" },
        { day: 24, label: "Weekend", type: "sunday" },
        { day: 31, label: "Weekend", type: "sunday" }
      ],

      6: [
        { day: 3, label: "Eid-E-Gadeer", type: "optional" },
        { day: 16, label: "Moharram (Optional)", type: "optional" },
        { day: 25, label: "Moharram (General)", type: "general" },

        { day: 6, label: "Second Saturday", type: "second_saturday" },
        { day: 7, label: "Weekend", type: "sunday" },
        { day: 14, label: "Weekend", type: "sunday" },
        { day: 21, label: "Weekend", type: "sunday" },
        { day: 28, label: "Weekend", type: "sunday" }
      ],

      7: [
        { day: 16, label: "Ratha Yatra", type: "optional" },

        { day: 4, label: "Second Saturday", type: "second_saturday" },
        { day: 5, label: "Weekend", type: "sunday" },
        { day: 12, label: "Weekend", type: "sunday" },
        { day: 19, label: "Weekend", type: "sunday" },
        { day: 26, label: "Weekend", type: "sunday" }
      ],

      8: [
        { day: 4, label: "Arbayein (Chahallum)", type: "optional" },
        { day: 15, label: "Independence Day", type: "general", note: "Saturday" },
        { day: 21, label: "Vara Lakshmi Vratham", type: "general" },
        { day: 25, label: "Milad-un-Nabi", type: "general" },

        { day: 1, label: "Second Saturday", type: "second_saturday" },
        { day: 2, label: "Weekend", type: "sunday" },
        { day: 9, label: "Weekend", type: "sunday" },
        { day: 16, label: "Weekend", type: "sunday" },
        { day: 23, label: "Weekend", type: "sunday" },
        { day: 30, label: "Weekend", type: "sunday" }
      ],

      9: [
        { day: 4, label: "Sri Krishna Ashtami", type: "general" },
        { day: 14, label: "Vinayaka Chavithi", type: "general" },

        { day: 5, label: "Second Saturday", type: "second_saturday" },
        { day: 6, label: "Weekend", type: "sunday" },
        { day: 13, label: "Weekend", type: "sunday" },
        { day: 20, label: "Weekend", type: "sunday" },
        { day: 27, label: "Weekend", type: "sunday" }
      ],

      10: [
        { day: 2, label: "Gandhi Jayanti", type: "general" },
        { day: 10, label: "Mahalaya Amavasya", type: "optional", note: "Second Saturday" },
        { day: 18, label: "Durgashtami", type: "general", note: "Sunday" },
        { day: 20, label: "Vijaya Dasami", type: "general" },

        { day: 4, label: "Weekend", type: "sunday" },
        { day: 11, label: "Weekend", type: "sunday" },
        { day: 25, label: "Weekend", type: "sunday" }
      ],

      11: [
        { day: 8, label: "Deepavali", type: "general", note: "Sunday" },
        { day: 24, label: "Guru Nanak Jayanti", type: "optional" },

        { day: 1, label: "Weekend", type: "sunday" },
        { day: 14, label: "Second Saturday", type: "second_saturday" },
        { day: 15, label: "Weekend", type: "sunday" },
        { day: 22, label: "Weekend", type: "sunday" },
        { day: 29, label: "Weekend", type: "sunday" }
      ],

      12: [
        { day: 24, label: "Christmas Eve", type: "optional" },
        { day: 25, label: "Christmas", type: "general" },
        { day: 26, label: "Boxing Day", type: "optional" },

        { day: 5, label: "Second Saturday", type: "second_saturday" },
        { day: 6, label: "Weekend", type: "sunday" },
        { day: 13, label: "Weekend", type: "sunday" },
        { day: 20, label: "Weekend", type: "sunday" },
        { day: 27, label: "Weekend", type: "sunday" }
      ]
    }
  }
};


// Legacy support for older code expecting HOLIDAYS_BY_MONTH
const HOLIDAYS_BY_MONTH = (() => {
  const currentYear = new Date().getFullYear();
  const availableYear = CALENDAR_CONFIG[currentYear]
    ? currentYear
    : parseInt(Object.keys(CALENDAR_CONFIG)[0]);
  return CALENDAR_CONFIG[availableYear].holidays;
})();

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

  if (holiday) return holiday.label;

  // Check if it's a Sunday
  const date = new Date(year, month - 1, day);
  if (date.getDay() === 0) return 'Sunday';

  return null;
};

// Helper function to get holiday type
const getHolidayType = (month, day, year = new Date().getFullYear()) => {
  const holidays = getHolidaysByMonth(year, month);
  const holiday = holidays.find(h => h.day === day);

  if (holiday) return holiday.type;

  // Check if it's a Sunday
  const date = new Date(year, month - 1, day);
  if (date.getDay() === 0) return 'public';

  return null;
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