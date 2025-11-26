/* eslint-disable no-unused-vars */
import React from 'react';

const SummaryHeader = ({ 
  title, 
  subtitle, 
  filters, 
  overallStats, 
  filteredCount, 
  totalCount 
}) => {
  const hasActiveFilters = filters.department || filters.designation || filters.status || filters.search;
  const overallPercentage = filteredCount > 0 
    ? ((overallStats.totalPresent / (filteredCount * 31)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-indigo-500">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {title}
        </h2>
        <p className="text-gray-600 mt-1">
          {filteredCount} of {totalCount} faculty members • {subtitle}
        </p>
        {hasActiveFilters && (
          <p className="text-sm text-indigo-600 mt-1">
            🔍 Filters applied: 
            {filters.department && ` Department: ${filters.department}`}
            {filters.designation && ` Designation: ${filters.designation}`}
            {filters.status && ` Status: ${filters.status}`}
            {filters.search && ` Search: ${filters.search}`}
          </p>
        )}
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{filteredCount}</div>
          <div className="text-blue-600 text-sm font-medium">Total Faculty</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{overallStats.totalPresent}</div>
          <div className="text-green-600 text-sm font-medium">Total Present Days</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{overallStats.totalAbsent}</div>
          <div className="text-red-600 text-sm font-medium">Total Absent Days</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-700">{overallPercentage}%</div>
          <div className="text-purple-600 text-sm font-medium">Overall Attendance</div>
        </div>
      </div>
    </div>
  );
};

export default SummaryHeader;