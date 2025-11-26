import React from 'react';

const AttendanceSummary = ({ fileName, employeeCount, onReset }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Attendance Summary
          </h2>
          <p className="text-gray-600 mt-1">
            {employeeCount} employees found in {fileName}
          </p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
        >
          Upload New File
        </button>
      </div>
    </div>
  );
};

export default AttendanceSummary;