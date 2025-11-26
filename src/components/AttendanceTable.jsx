import React from 'react';

const AttendanceTable = ({ attendance }) => {
  return (
    <div className="p-6">
      <h4 className="text-lg font-semibold text-gray-800 mb-4">Detailed Attendance</h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Out Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attendance.map((day, dayIndex) => (
              <tr 
                key={dayIndex}
                className={`
                  hover:bg-gray-50 transition-colors duration-150
                  ${day.status === 'P' ? 'bg-green-50' : day.status === 'A' ? 'bg-red-50' : ''}
                `}
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {day.day}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {day.inTime || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {day.outTime || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${day.status === 'P' 
                      ? 'bg-green-100 text-green-800' 
                      : day.status === 'A'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                    }
                  `}>
                    {day.status}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {day.duration || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceTable;