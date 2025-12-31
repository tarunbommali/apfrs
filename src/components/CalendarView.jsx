import React, { useState } from 'react';
import { getHolidayDays } from '../utils/calendar';
import { useAttendance } from '../contexts/AttendanceContext';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CalendarView = () => {
  const [selectedYear, setSelectedYear] = useState(2025);
  const { customHolidays, toggleHoliday } = useAttendance();

  // Helper to get days in a month for the selected year
  const getDaysInMonth = (monthIndex, year) => {
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  // Helper to get the starting day of the week (0=Sun, 1=Mon...)
  const getFirstDayOfMonth = (monthIndex, year) => {
    return new Date(year, monthIndex, 1).getDay();
  };

  // Determine status of a specific day
  const getDayStatus = (monthIndex, day, dayOfWeek) => {
    // monthIndex is 0-based, data uses 1-based keys
    const monthKey = monthIndex + 1;
    const customKey = `${monthKey}-${day}`;

    // Check custom overrides first
    if (customHolidays && customHolidays[customKey] === 'holiday') return 'custom-holiday';

    const holidayDays = getHolidayDays(monthKey, selectedYear);

    // Base logic
    if (holidayDays.includes(day)) return 'holiday';
    if (dayOfWeek === 0) return 'sunday-holiday'; // Explicit Sunday check

    // All other days are working days
    return 'working';
  };

  const handleDayClick = (monthIndex, day) => {
    toggleHoliday(monthIndex, day);
  };

  return (
    <div className="w-full bg-white/50 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-xl space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Academic Calendar</h2>
          <p className="text-slate-500 mt-1">Working days and holiday schedule for {selectedYear}</p>
        </div>

        <div className="flex items-center gap-4 bg-white/60 p-1.5 rounded-full border border-slate-200 shadow-sm">
          <button
            onClick={() => setSelectedYear(prev => prev - 1)}
            className="p-2 hover:bg-white rounded-full transition-colors text-slate-600"
          >
            ←
          </button>
          <span className="text-lg font-bold text-slate-800 min-w-[3rem] text-center">{selectedYear}</span>
          <button
            onClick={() => setSelectedYear(prev => prev + 1)}
            className="p-2 hover:bg-white rounded-full transition-colors text-slate-600"
          >
            →
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm font-medium flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30"></div>
          <span className="text-slate-600">Working Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/30"></div>
          <span className="text-slate-600">Public Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/30"></div>
          <span className="text-slate-600">Sunday</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/30"></div>
          <span className="text-slate-600">Custom Holiday (Click to Toggle)</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {MONTHS.map((monthName, index) => {
          const daysInMonth = getDaysInMonth(index, selectedYear);
          const firstDay = getFirstDayOfMonth(index, selectedYear);

          return (
            <div key={monthName} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
              <h3 className="text-lg font-bold text-slate-800 mb-4">{monthName}</h3>

              {/* Days Header */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS_OF_WEEK.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for offset */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Date cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  // Calculate day of week for this specific date
                  const date = new Date(selectedYear, index, day);
                  const dayOfWeek = date.getDay();

                  const status = getDayStatus(index, day, dayOfWeek);

                  let baseClasses = "aspect-square flex items-center justify-center text-sm rounded-lg transition-all duration-200 cursor-pointer relative group";
                  let statusClasses = "";

                  if (status === 'working') {
                    statusClasses = "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-medium";
                  } else if (status === 'holiday') {
                    statusClasses = "text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold";
                  } else if (status === 'sunday-holiday') {
                    statusClasses = "text-amber-700 bg-amber-50 hover:bg-amber-100 font-semibold";
                  } else if (status === 'custom-holiday') {
                    statusClasses = "text-purple-700 bg-purple-50 hover:bg-purple-100 font-bold border-2 border-purple-200";
                  } else {
                    statusClasses = "text-slate-400 bg-slate-50 hover:bg-slate-100";
                  }

                  return (
                    <div
                      key={day}
                      className={`${baseClasses} ${statusClasses}`}
                      onClick={() => handleDayClick(index, day)}
                      title="Click to toggle working status"
                    >
                      {day}

                      {/* Tooltip */}
                      {(status === 'holiday' || status === 'custom-holiday') && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 w-max max-w-[150px]">
                          <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg">
                            {status === 'custom-holiday' ? 'Manual Holiday' : 'Holiday'}
                          </div>
                          <div className="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mt-1"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;