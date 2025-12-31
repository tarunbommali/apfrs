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
} from '../utils/calendar';

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
        .manage-calendar-container {
          max-width: 100%;
          margin: 0 auto;
          padding: 0;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 2rem;
        }

        @media (max-width: 1024px) {
          .calendar-grid {
            grid-template-columns: 1fr;
          }
        }

        .calendar-section {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .react-calendar {
          width: 100%;
          border: none;
          font-family: inherit;
        }

        .react-calendar__tile {
          position: relative;
          padding: 1rem 0.5rem;
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }

        .react-calendar__tile:hover {
          background: #f8fafc;
        }

        .react-calendar__tile--active {
          background: #8b5cf6 !important;
          color: white;
        }

        .react-calendar__tile--now {
          background: #fef3c7;
        }

        .tile-content {
          display: flex;
          gap: 0.25rem;
          margin-top: 0.25rem;
        }

        .holiday-indicator,
        .sunday-indicator {
          font-size: 1rem;
        }

        /* Holiday type colors */
        .holiday-public {
          background: #fef2f2;
          color: #991b1b;
        }

        .holiday-optional {
          background: #fffbeb;
          color: #92400e;
        }

        .holiday-custom {
          background: #faf5ff;
          color: #6b21a8;
        }

        .holiday-academic {
          background: #eff6ff;
          color: #1e40af;
        }

        .holiday-festival {
          background: #fdf2f8;
          color: #9f1239;
        }

        .sunday {
          background: #fef3c7;
        }

        .sidebar-section {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .sidebar-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .holiday-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .holiday-item {
          padding: 0.75rem;
          background: #f8fafc;
          border-radius: 0.5rem;
          border-left: 4px solid #8b5cf6;
          transition: all 0.2s;
        }

        .holiday-item:hover {
          background: #f1f5f9;
          transform: translateX(2px);
        }

        .holiday-date {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .holiday-name {
          font-size: 0.875rem;
          color: #1e293b;
          font-weight: 600;
          margin-top: 0.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .type-badge {
          display: inline-block;
          padding: 0.125rem 0.5rem;
          font-size: 0.75rem;
          border-radius: 9999px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .legend-section {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-top: 1rem;
        }

        .legend-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .legend-color {
          width: 1rem;
          height: 1rem;
          border-radius: 0.25rem;
          flex-shrink: 0;
        }
      `}</style>

      {/* Main Grid */}
      <div className="calendar-grid">
        {/* Calendar */}
        <div className="calendar-section">
          {/* Year Selector */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b', marginRight: '0.5rem' }}>
                Select Year:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#1e293b',
                  cursor: 'pointer'
                }}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Year Stats */}
            {yearStats && (
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
                <span>📅 Public: {yearStats.totalPublicHolidays}</span>
                <span>🟠 Optional: {yearStats.totalOptionalHolidays}</span>
                <span>☀️ Sundays: {yearStats.totalSundays}</span>
              </div>
            )}
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

          {/* Legend */}
          <div className="legend-section">
            <h3 className="sidebar-title">
              📋 Legend
            </h3>
            <div className="legend-grid">
              {Object.entries(HOLIDAY_TYPE_COLORS).map(([type, color]) => (
                <div key={type} className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: color }}></div>
                  <span style={{ textTransform: 'capitalize' }}>{type}</span>
                </div>
              ))}
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#fbbf24' }}></div>
                <span>Sunday</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageCalendar;
