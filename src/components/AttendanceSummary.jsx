import React from 'react';

const AttendanceSummary = ({ fileName, employeeCount, onReset }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Attendance Summary
          </h2>
          <p className="text-slate-600 mt-1">
            {employeeCount} employees found in <span className="font-medium text-sky-600">{fileName}</span>
          </p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors duration-200 shadow-sm"
        >
          Upload New File
        </button>
      </div>
    </div>
  );
};

export default AttendanceSummary;