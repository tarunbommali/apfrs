import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  getHolidaysByMonth,
  HOLIDAY_TYPE_COLORS,
  getHolidayLabel,
  getHolidayType,
  getColorForType,
  getAvailableYears,
  getYearStats
} from '../config/calendar';

const ManageCalendar = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-based (0 = January)
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeMonth, setActiveMonth] = useState(currentMonth); // Track visible month

  // Get public holidays for a specific month and year
  const getPublicHolidaysForMonth = (monthIndex, year) => {
    const month = monthIndex + 1; // Convert to 1-based
    const holidayList = getHolidaysByMonth(year, month);
    return holidayList.map(holiday => ({
      date: new Date(year, monthIndex, holiday.day),
      label: holiday.label,
      type: holiday.type
    }));
  };

  // Check if a date is a public holiday
  const isPublicHoliday = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const holidays = getHolidaysByMonth(year, month);
    return holidays.some(h => h.day === day);
  };

  // Get holiday name for a specific date
  const getHolidayNameForDate = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return getHolidayLabel(month, day, year) || 'Holiday';
  };

  // Get holiday type for a specific date
  const getHolidayTypeForDate = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return getHolidayType(month, day, year);
  };

  // Check if a date is Sunday
  const isSunday = (date) => {
    return date.getDay() === 0;
  };

  // Tile content for calendar
  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;

    const isHoliday = isPublicHoliday(date);
    const sunday = isSunday(date);
    const holidayType = getHolidayTypeForDate(date);

    return (
      <div className="tile-content">
        {isHoliday && (
          <div
            className="holiday-indicator"
            title={`${getHolidayNameForDate(date)} (${holidayType})`}
            style={{ color: getColorForType(holidayType) }}
          >
            🎉
          </div>
        )}
        {sunday && !isHoliday && (
          <div className="sunday-indicator">
            ☀️
          </div>
        )}
      </div>
    );
  };

  // Tile class name for styling
  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return '';

    const classes = [];
    if (isPublicHoliday(date)) {
      const holidayType = getHolidayTypeForDate(date);
      classes.push(`holiday-${holidayType}`);
    }
    if (isSunday(date)) classes.push('sunday');

    return classes.join(' ');
  };

  // Handle active month change when navigating calendar
  const handleActiveStartDateChange = ({ activeStartDate }) => {
    if (activeStartDate) {
      const newYear = activeStartDate.getFullYear();
      // Only allow navigation to configured years
      if (availableYears.includes(newYear)) {
        setActiveMonth(activeStartDate.getMonth());
        setSelectedYear(newYear);
      }
    }
  };

  // Get holidays for currently visible month and year
  const publicHolidays = getPublicHolidaysForMonth(activeMonth, selectedYear);

  // Get year statistics
  const yearStats = getYearStats(selectedYear);
  const availableYears = getAvailableYears();

  return (
    <div className="manage-calendar-container">
      <style>{`
  :root {
    --bg: #f8fafc;
    --card: #ffffff;
    --border: #e2e8f0;
    --text: #0f172a;
    --muted: #64748b;

    --public: #dc2626;
    --optional: #d97706;
    --sunday: #ea580c;
    --primary: #4f46e5;
  }

  body {
    background: var(--bg);
  }

  .manage-calendar-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 1rem;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 1.25rem;
  }

  @media (max-width: 1024px) {
    .calendar-grid {
      grid-template-columns: 1fr;
    }
  }

  .calendar-section,
  .sidebar-section,
  .legend-section {
    background: var(--card);
    border-radius: 14px;
    padding: 1.25rem;
    border: 1px solid var(--border);
  }

  /* ================= CALENDAR ================= */

  .react-calendar {
    width: 100%;
    border: none;
    font-family: system-ui, sans-serif;
  }

  .react-calendar__navigation {
    margin-bottom: 0.75rem;
  }

  .react-calendar__navigation button {
    font-weight: 700;
    color: var(--text);
    border-radius: 8px;
  }

  .react-calendar__navigation button:hover {
    background: #f1f5f9;
  }

  .react-calendar__month-view__weekdays {
    font-size: 0.65rem;
    color: var(--muted);
    font-weight: 700;
  }

  .react-calendar__tile {
    border: 1px solid #dae1e7;
    border-radius: 4px !important;
    font-weight: 600;
    color: var(--text);
    transition: all 0.15s ease;
    margin-right: -1px;
    margin-bottom: -1px;
  }

  .react-calendar__tile:hover {
    background: #f1f5f9;
  }

  .react-calendar__tile--active {
    background: var(--primary) !important;
    color: white !important;
  }

  .react-calendar__tile--now {
    background: #f59e0b !important;
    color: white !important;
    border-radius: 8px !important;
    font-weight: 800;
    box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.4);
  }

  /* ================= TILE MARKERS ================= */

  .tile-content {
    display: flex;
    gap: 4px;
    margin-top: 4px;
  }

  .holiday-indicator,
  .sunday-indicator {
    width: 6px;
    height: 6px;
    border-radius: 999px;
  }

  .holiday-public .holiday-indicator {
    background: var(--public);
  }

  .holiday-optional .holiday-indicator {
    background: var(--optional);
  }

  .sunday .sunday-indicator {
    background: var(--sunday);
  }

  /* ================= TILE STATES ================= */

  .holiday-public {
    color: var(--public) !important;
  }

  .holiday-optional {
    color: var(--optional) !important;
  }

  .sunday {
    color: var(--sunday) !important;
  }

  /* ================= SIDEBAR ================= */

  .sidebar-title {
    font-size: 0.95rem;
    font-weight: 800;
    margin-bottom: 1rem;
    color: var(--text);
  }

  .holiday-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 380px;
    overflow-y: auto;
    padding-right: 0.5rem;
  }
  
  /* Custom Scrollbar for holiday list */
  .holiday-list::-webkit-scrollbar {
    width: 6px;
  }
  
  .holiday-list::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .holiday-list::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 20px;
  }

  .holiday-item {
    padding: 0.75rem;
    border-radius: 10px;
    background: #f8fafc;
    border-left: 4px solid var(--primary);
  }

  .holiday-date {
    font-size: 0.7rem;
    color: var(--muted);
    font-weight: 700;
    margin-bottom: 0.25rem;
  }

  .holiday-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text);
  }

  .type-badge {
    margin-top: 6px;
    font-size: 0.65rem;
    padding: 2px 8px;
    border-radius: 999px;
    font-weight: 700;
    text-transform: uppercase;
    border: 1px solid currentColor;
  }

  /* ================= LEGEND ================= */

  .legend-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--muted);
    font-weight: 600;
  }

  .legend-color {
    width: 10px;
    height: 10px;
    border-radius: 999px;
  }
`}</style>

      {/* Main Grid */}
      <div className="calendar-grid">
        {/* Calendar */}
        <div className="calendar-section">
          {/* Year Selector & Legend */}
          <div className="flex flex-col gap-6 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            {/* Top Row: Dropdown, Year Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-slate-600">
                  Select Academic Year:
                </label>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer hover:border-indigo-300"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Year Stats */}
              {yearStats && (
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Public</span>
                    <span className="text-sm font-bold text-slate-800">{yearStats.totalPublicHolidays}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Optional</span>
                    <span className="text-sm font-bold text-slate-800">{yearStats.totalOptionalHolidays}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Sundays</span>
                    <span className="text-sm font-bold text-slate-800">{yearStats.totalSundays}</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          <Calendar
            value={new Date(selectedYear, activeMonth, 1)}
            onActiveStartDateChange={handleActiveStartDateChange}
            tileContent={tileContent}
            tileClassName={tileClassName}
            showNeighboringMonth={false}
            minDetail="month"
            defaultView="month"
            minDate={new Date(Math.min(...availableYears), 0, 1)}
            maxDate={new Date(Math.max(...availableYears), 11, 31)}
            prev2Label={null}
            next2Label={null}
            className="rounded-xl border-none font-sans"
          />
        </div>

        {/* Sidebar */}
        <div>
          {/* Public Holidays */}
          <div className="sidebar-section">
            <h3 className="sidebar-title">
              🎉 {new Date(selectedYear, activeMonth).toLocaleDateString('en-US', { month: 'long' })} {selectedYear} Holidays ({publicHolidays.length})
            </h3>
            <div className="holiday-list">
              {publicHolidays.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                  No public holidays this month.
                </p>
              ) : (
                publicHolidays.map((holiday, idx) => (
                  <div
                    key={idx}
                    className="holiday-item"
                    style={{ borderLeftColor: getColorForType(holiday.type) }}
                  >
                    <div className="holiday-date">
                      {holiday.date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="holiday-name">
                      {holiday.label}
                      <span
                        className="type-badge"
                        style={{
                          backgroundColor: `${getColorForType(holiday.type)}20`,
                          color: getColorForType(holiday.type),
                          border: `1px solid ${getColorForType(holiday.type)}`
                        }}
                      >
                        {holiday.type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ManageCalendar;
