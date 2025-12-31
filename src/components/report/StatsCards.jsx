/* eslint-disable no-unused-vars */
import React from 'react';
import { calculateSummary } from '../../utils/attendanceUtils';

const StatsCards = ({ facultyData, overallStats, filteredCount, workingDays, selectedMonth = 11, selectedYear = 2025 }) => {
  const effectiveWorkingDays = workingDays && workingDays.length ? workingDays : null;
  const overallPercentage = overallStats?.averageAttendancePercentage ?? '0.0';
  const totalHours = overallStats?.totalHours || 0;
  const averageHoursPerFaculty = overallStats?.averageHoursPerFaculty
    ?? (filteredCount > 0 ? (totalHours / filteredCount).toFixed(1) : '0.0');

  if (facultyData.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Top Performers */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200">
        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
          <svg className="w-5 h-5 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Top Performers
        </h4>
        <div className="space-y-3">
          {facultyData
            .map(employee => {
              const summary = calculateSummary(employee, selectedMonth, selectedYear);
              const percentageValue = parseFloat(summary.attendancePercentage) || 0;
              return { ...employee, percentage: percentageValue.toFixed(1), percentageValue };
            })
            .sort((a, b) => b.percentageValue - a.percentageValue)
            .slice(0, 3)
            .map((employee, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{employee.name}</div>
                    <div className="text-xs text-slate-600">{employee.department}</div>
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-700">{employee.percentage}%</span>
              </div>
            ))}
        </div>
      </div>

      {/* Attendance Distribution */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200">
        <h4 className="text-lg font-bold text-slate-800 mb-4">Attendance Distribution</h4>
        <div className="space-y-4">
          {['Good (≥75%)', 'Average (50-74%)', 'Poor (<50%)'].map((category, index) => {
            const count = facultyData.filter(employee => {
              const summary = calculateSummary(employee, selectedMonth, selectedYear);
              const percentage = parseFloat(summary.attendancePercentage) || 0;
              if (index === 0) return percentage >= 75;
              if (index === 1) return percentage >= 50 && percentage < 75;
              return percentage < 50;
            }).length;

            const colors = ['emerald', 'amber', 'rose'];
            const colorClasses = {
              emerald: 'bg-emerald-100 text-emerald-800',
              amber: 'bg-amber-100 text-amber-800',
              rose: 'bg-rose-100 text-rose-800'
            };

            return (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{category}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorClasses[colors[index]]}`}>
                  {count} faculty
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200">
        <h4 className="text-lg font-bold text-slate-800 mb-4">Quick Stats</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Average Attendance</span>
            <span className="text-sm font-bold text-sky-700">{overallPercentage}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Total Work Hours</span>
            <span className="text-sm font-bold text-indigo-700">{totalHours.toFixed ? totalHours.toFixed(0) : totalHours}h</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Avg Hours/Faculty</span>
            <span className="text-sm font-bold text-emerald-700">
              {averageHoursPerFaculty}h
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;