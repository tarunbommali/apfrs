/* eslint-disable no-unused-vars */
import React from 'react';

const SummaryHeader = ({ 
  title, 
  subtitle, 
  filters, 
  overallStats, 
  filteredCount, 
  totalCount,
  attendanceData 
}) => {
  const hasActiveFilters = filters.department || filters.designation || filters.status || filters.search;
  
  // Calculate statistics from attendanceData
  const totalFaculty = filteredCount;
  const totalPresent = overallStats?.totalPresent || 0;
  const totalAbsent = overallStats?.totalAbsent || 0;
  const overallPercentage = overallStats?.averageAttendancePercentage ?? '0.0';

  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 mb-6">
      {/* Header Title and Subtitle */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-800">
          {title}
        </h2>
        <p className="text-slate-600 text-[11px]  mt-1">
          {subtitle}
        </p>
        {hasActiveFilters && (
          <p className="text-sm text-sky-600 mt-1">
            🔍 Filters applied: 
            {filters.department && ` Department: ${filters.department}`}
            {filters.designation && ` Designation: ${filters.designation}`}
            {filters.status && ` Status: ${filters.status}`}
            {filters.search && ` Search: ${filters.search}`}
          </p>
        )}
      </div>

      {/* Overall Stats */}
      <section className="  bg-white ">
         <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Total Faculty</span>
            <span className="font-semibold text-slate-900">{totalFaculty}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Total Present Days</span>
            <span className="font-semibold text-emerald-600">{totalPresent}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Total Absent Days</span>
            <span className="font-semibold text-rose-600">{totalAbsent}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Overall Percentage</span>
            <span className="font-semibold text-sky-600">{overallPercentage}%</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SummaryHeader;