import React from 'react';
import EmployeeCard from '../components/EmployeeCard';
import { calculateSummary } from '../utils/attendanceUtils';

const DetailedView = ({ attendanceData, fileName, onReset }) => {
  return (
    <div className="space-y-8">
      {/* Summary Header */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Detailed Faculty Attendance
            </h2>
            <p className="text-gray-600 mt-1">
              {attendanceData.length} employees found in {fileName}
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

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 text-center shadow-lg">
          <div className="text-2xl font-bold text-blue-700">{attendanceData.length}</div>
          <div className="text-blue-600 text-sm font-medium">Total Faculty</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-lg">
          <div className="text-2xl font-bold text-green-700">
            {attendanceData.reduce((acc, emp) => acc + calculateSummary(emp).presentDays, 0)}
          </div>
          <div className="text-green-600 text-sm font-medium">Total Present Days</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-lg">
          <div className="text-2xl font-bold text-red-700">
            {attendanceData.reduce((acc, emp) => acc + calculateSummary(emp).absentDays, 0)}
          </div>
          <div className="text-red-600 text-sm font-medium">Total Absent Days</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-lg">
          <div className="text-2xl font-bold text-purple-700">
            {(
              (attendanceData.reduce((acc, emp) => acc + calculateSummary(emp).presentDays, 0) / 
              (attendanceData.length * 31)) * 100
            ).toFixed(1)}%
          </div>
          <div className="text-purple-600 text-sm font-medium">Overall Percentage</div>
        </div>
      </div>

      {/* Employee Cards */}
      {attendanceData.map((employee, index) => (
        <EmployeeCard
          key={index}
          employee={employee}
          summary={calculateSummary(employee)}
        />
      ))}
    </div>
  );
};

export default DetailedView;