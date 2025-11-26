import React from 'react';

const CalendarView = ({ attendance }) => {
  return (
    <div className="p-6 border-b">
      <h4 className="text-lg font-semibold text-gray-800 mb-4">Monthly Calendar</h4>
      <div className="grid grid-cols-7 md:grid-cols-10 lg:grid-cols-15 gap-2">
        {attendance.map((day, dayIndex) => (
          <div 
            key={dayIndex}
            className={`
              relative p-2 rounded-lg text-center text-sm font-medium cursor-help
              ${day.status === 'P' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : day.status === 'A'
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
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