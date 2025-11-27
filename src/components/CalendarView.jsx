import React from 'react';

const CalendarView = ({ attendance }) => {
  return (
    <div className="p-6 border-b border-slate-200">
      <h4 className="text-lg font-semibold text-slate-700 mb-4">Monthly Calendar</h4>
      <div className="grid grid-cols-7 md:grid-cols-10 lg:grid-cols-15 gap-2">
        {attendance.map((day, dayIndex) => (
          <div 
            key={dayIndex}
            className={`
              relative p-2 rounded-lg text-center text-sm font-medium cursor-help
              ${day.status === 'P' 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                : day.status === 'A'
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
              }
            `}
            title={`Day ${day.day}: ${day.inTime || 'No In Time'} - ${day.outTime || 'No Out Time'} (${day.duration || 'No Duration'})`}
          >
            <div className="font-bold">{day.day}</div>
            <div className="text-xs opacity-75">{day.status}</div>
            {day.inTime && (
              <div className="text-xs opacity-60 mt-1">
                {day.inTime.split(':').slice(0, 2).join(':')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;