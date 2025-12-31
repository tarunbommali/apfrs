/* eslint-disable no-unused-vars */
import React, { useRef, useCallback, useState } from 'react';
import { calculateSummary } from '../../utils/attendanceUtils';

const FacultyTable = ({
  facultyData,
  workingDays,
  totalWorkingDays,
  onSendEmail,
  emailStatus,
  sendingEmail,
  bulkEmailProgress,
  selectedMonth = 11,
  selectedYear = 2025
}) => {
  const effectiveWorkingDays = workingDays && workingDays.length ? workingDays : null;
  const headerRef = useRef(null);
  const bodyRef = useRef(null);

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc' // 'asc' or 'desc'
  });

  const handleBodyScroll = useCallback((e) => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = e.target.scrollLeft;
    }
  }, []);

  const handleHeaderScroll = useCallback((e) => {
    if (bodyRef.current) {
      bodyRef.current.scrollLeft = e.target.scrollLeft;
    }
  }, []);

  // Function to handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Function to get sorted data
  const getSortedData = () => {
    if (!sortConfig.key) return facultyData;

    return [...facultyData].sort((a, b) => {
      const summaryA = a.summary || calculateSummary(a, selectedMonth, selectedYear);
      const summaryB = b.summary || calculateSummary(b, selectedMonth, selectedYear);
      const percentageA = parseFloat(summaryA.attendancePercentage) || 0;
      const percentageB = parseFloat(summaryB.attendancePercentage) || 0;

      let valueA, valueB;

      switch (sortConfig.key) {
        case 'sno':
          // S.No is based on original order, so we don't sort by this
          return 0;

        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;

        case 'department':
          valueA = a.department.toLowerCase();
          valueB = b.department.toLowerCase();
          break;

        case 'designation':
          valueA = (a.designation || '').toLowerCase();
          valueB = (b.designation || '').toLowerCase();
          break;

        case 'stats':
          valueA = summaryA.presentDays;
          valueB = summaryB.presentDays;
          break;

        case 'hours':
          valueA = parseFloat(summaryA.totalHours);
          valueB = parseFloat(summaryB.totalHours);
          break;

        case 'percentage':
          valueA = percentageA;
          valueB = percentageB;
          break;

        default:
          return 0;
      }

      if (valueA < valueB) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Function to get dynamic background color based on percentage
  const getStatsBackgroundColor = (percentage) => {
    if (percentage >= 75) return 'bg-emerald-100 text-emerald-800';
    if (percentage >= 50) return 'bg-amber-100 text-amber-800';
    return 'bg-rose-100 text-rose-800';
  };

  // Function to get sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;

    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const sortedData = getSortedData();

  if (facultyData.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-slate-500 text-lg">No faculty members match your filters</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col border border-slate-200 rounded-lg overflow-hidden">
      {/* Header with horizontal scroll and sorting */}
      <div
        ref={headerRef}
        className="shrink-0 bg-slate-50 border-b border-slate-200 overflow-x-auto"
        onScroll={handleHeaderScroll}
      >
        <div className="flex min-w-max">
          {/* S.No */}
          <div
            className="w-16 px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => handleSort('sno')}
          >
            <div className="flex items-center justify-center">
              S.No
              <span className="ml-1 text-xs">{getSortIndicator('sno')}</span>
            </div>
          </div>

          {/* Faculty Member */}
          <div
            className="w-64 px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => handleSort('name')}
          >
            <div className="flex items-center">
              Faculty Member
              <span className="ml-1 text-xs">{getSortIndicator('name')}</span>
            </div>
          </div>

          {/* Details */}
          <div
            className="w-64 px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => handleSort('department')}
          >
            <div className="flex items-center">
              Details
              <span className="ml-1 text-xs">{getSortIndicator('department')}</span>
            </div>
          </div>

          {/* Stats */}
          <div
            className="w-48 px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => handleSort('stats')}
          >
            <div className="flex items-center justify-center">
              Stats [P/T]
              <span className="ml-1 text-xs">{getSortIndicator('stats')}</span>
            </div>
          </div>

          {/* Total Hours */}
          <div
            className="w-32 px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => handleSort('hours')}
          >
            <div className="flex items-center justify-center">
              Total Hours
              <span className="ml-1 text-xs">{getSortIndicator('hours')}</span>
            </div>
          </div>

          {/* Percentage */}
          <div
            className="w-32 px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => handleSort('percentage')}
          >
            <div className="flex items-center justify-center">
              Percentage
              <span className="ml-1 text-xs">{getSortIndicator('percentage')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body with synchronized horizontal scroll */}
      <div
        ref={bodyRef}
        className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] max-h-[70vh]"
        onScroll={handleBodyScroll}
      >
        <div className="min-w-max">
          {sortedData.map((employee, index) => {
            const summary = employee.summary || calculateSummary(employee, selectedMonth, selectedYear);
            const totalDaysForEmployee = summary.workingDays || summary.totalDays || totalWorkingDays || employee.attendance.length || 0;
            const percentageValue = parseFloat(summary.attendancePercentage) || 0;
            const percentage = percentageValue.toFixed(1);
            const totalHoursValue = parseFloat(summary.totalHours) || 0;
            const totalHoursDisplay = `${totalHoursValue.toFixed(1)}h`;

            return (
              <div key={index} className="flex border-b border-slate-200 hover:bg-slate-50 transition-colors duration-150 min-w-max">
                {/* S.No */}
                <div className="w-16 px-3 py-3 whitespace-nowrap text-sm text-slate-600 text-center font-medium border-r border-slate-200">
                  {index + 1}
                </div>

                {/* Faculty Member */}
                <div className="w-64 px-4 py-3 whitespace-nowrap border-r border-slate-200">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{employee.name}</div>
                    <div className="text-sm text-slate-500 truncate">ID: {employee.cfmsId}</div>
                    {employee.email && employee.email !== 'N/A' && (
                      <div className="text-xs text-sky-600 truncate mt-1">{employee.email}</div>
                    )}
                  </div>
                </div>

                {/* Details - Department & Designation */}
                <div className="w-64 px-4 py-3 whitespace-nowrap border-r border-slate-200">
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${employee.department === 'N/A'
                        ? 'bg-slate-100 text-slate-800'
                        : 'bg-sky-100 text-sky-800'
                        }`}>
                        <span className="truncate">{employee.department}</span>
                      </span>
                    </div>
                    {employee.designation && employee.designation !== 'N/A' && (
                      <div className="text-xs text-slate-600 truncate">
                        {employee.designation}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats - Present/Total Days with dynamic background */}
                <div className="w-48 px-4 py-3 whitespace-nowrap text-center border-r border-slate-200">
                  <div className="flex flex-col items-center space-y-1">
                    <span className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${getStatsBackgroundColor(percentageValue)}`}>
                      {summary.presentDays}/{totalDaysForEmployee || '-'}
                    </span>

                  </div>
                </div>

                {/* Total Hours */}
                <div className="w-32 px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-center font-medium border-r border-slate-200">
                  {totalHoursDisplay}
                </div>

                {/* Percentage */}
                <div className="w-32 px-4 py-3 whitespace-nowrap text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <span className={`text-lg font-bold ${percentageValue >= 75 ? 'text-emerald-700' :
                      percentageValue >= 50 ? 'text-amber-700' : 'text-rose-700'
                      }`}>
                      {percentage}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FacultyTable;