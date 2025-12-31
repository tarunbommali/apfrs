import React, { useMemo, useState } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import EmployeeCard from '../components/EmployeeCard';
import { calculateSummary, calculateWorkingDays, getDaysInMonth } from '../utils/attendanceUtils';
import PageLayout from './PageLayout';
import StatsCards from '../components/report/StatsCards';

const StatCard = ({ label, value, colorClass, icon }) => (
  <div className={`rounded-2xl border ${colorClass.border} bg-white p-4 shadow-sm`}>
    <div className="flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${colorClass.bg} ${colorClass.text}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm font-medium text-slate-600">{label}</p>
      </div>
    </div>
  </div>
);

import MonthCalendar from '../components/MonthCalendar';

const DetailedView = () => {
  const { attendanceData, fileName, resetData, selectedMonth, selectedYear } = useAttendance();

  const [filters, setFilters] = useState({
    department: '',
    designation: '',
    status: '',
    search: ''
  });

  const [expandedId, setExpandedId] = useState(null); // ID or index of currently expanded employee for calendar

  const workingDays = useMemo(() => calculateWorkingDays(attendanceData, selectedMonth, null, selectedYear), [attendanceData, selectedMonth, selectedYear]);
  const totalDaysInPeriod = useMemo(() => getDaysInMonth(attendanceData), [attendanceData]);
  const effectiveWorkingDays = workingDays.length ? workingDays : null;
  const denominatorDays = workingDays.length || totalDaysInPeriod || 1;

  // Extract unique departments
  const uniqueDepartments = useMemo(() => {
    const depts = new Set(attendanceData.map(e => e.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [attendanceData]);

  const filteredData = useMemo(() => {
    return attendanceData.filter(employee => {
      const summary = calculateSummary(employee, selectedMonth, selectedYear);
      const percentage = parseFloat(summary.attendancePercentage) || 0;
      let status = '';
      if (percentage >= 75) status = 'Good';
      else if (percentage >= 50) status = 'Average';
      else status = 'Poor';

      return (
        (filters.department === '' || employee.department === filters.department) &&
        (filters.designation === '' || employee.designation === filters.designation) &&
        (filters.status === '' || status === filters.status) &&
        (filters.search === '' ||
          employee.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          employee.cfmsId.toLowerCase().includes(filters.search.toLowerCase()) ||
          employee.department.toLowerCase().includes(filters.search.toLowerCase()))
      );
    });
  }, [attendanceData, filters, effectiveWorkingDays]);

  const overallStats = useMemo(() => {
    if (!filteredData.length) {
      return {
        totalPresent: 0,
        totalAbsent: 0,
        totalLeave: 0,
        totalHours: 0,
        totalEmployees: 0,
        averageAttendancePercentage: '0.0',
        averageHoursPerFaculty: '0.0'
      };
    }

    const stats = filteredData.reduce((acc, employee) => {
      const summary = calculateSummary(employee, selectedMonth, selectedYear);
      acc.totalPresent += summary.presentDays;
      acc.totalAbsent += summary.absentDays;
      acc.totalLeave += summary.leaveDays;
      acc.totalHours += parseFloat(summary.totalHours);
      acc.totalEmployees += 1;
      return acc;
    }, {
      totalPresent: 0,
      totalAbsent: 0,
      totalLeave: 0,
      totalHours: 0,
      totalEmployees: 0
    });

    const denominator = stats.totalEmployees * denominatorDays;
    stats.averageAttendancePercentage = denominator > 0
      ? ((stats.totalPresent / denominator) * 100).toFixed(1)
      : '0.0';
    stats.averageHoursPerFaculty = stats.totalEmployees > 0
      ? (stats.totalHours / stats.totalEmployees).toFixed(1)
      : '0.0';

    return stats;
  }, [filteredData, effectiveWorkingDays, denominatorDays]);

  const toggleExpand = (index) => {
    setExpandedId(expandedId === index ? null : index);
  };

  const bodyContent = (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="rounded-2xl border bg-white border-slate-200 p-6 text-slate-800 shadow-lg">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Detailed Faculty Attendance
            </h2>
            <div className="text-sm text-slate-500 font-medium">
              Period: {selectedMonth}/{selectedYear}
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search by name, ID..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            <select
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              className="px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="Good">Good (&gt; 75%)</option>
              <option value="Average">Average (50-75%)</option>
              <option value="Poor">Poor (&lt; 50%)</option>
            </select>

            <button
              onClick={() => setFilters({ department: '', designation: '', status: '', search: '' })}
              className="px-4 py-2 text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredData.map((employee, index) => (
          <div key={index} className="flex flex-col gap-4">
            <div onClick={() => toggleExpand(index)} className="cursor-pointer">
              <EmployeeCard
                employee={employee}
                summary={calculateSummary(employee, selectedMonth, selectedYear)}
              />
            </div>

            {/* Expanded Calendar View */}
            {expandedId === index && (
              <div className="ml-4 md:ml-8 animate-in fade-in slide-in-from-top-4 duration-300">
                <MonthCalendar
                  employee={employee}
                  monthNumber={selectedMonth}
                  year={selectedYear}
                />
              </div>
            )}
          </div>
        ))}

        {filteredData.length === 0 && (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
            No employees match your filters.
          </div>
        )}
      </div>
    </div>
  );

  return <PageLayout Sidebar={null} Body={bodyContent} />;
};

export default DetailedView;
