/* eslint-disable no-unused-vars */
import React, { useMemo } from 'react';
import EmployeeCard from '../components/EmployeeCard';
import { calculateSummary } from '../utils/attendanceUtils';
import PageLayout from './PageLayout';
import StatsCards from '../components/summary/StatsCards';

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

const DetailedView = ({ attendanceData, fileName, onReset }) => {
  // Add filters state for filteredData calculation
  const [filters, setFilters] = React.useState({
    department: '',
    designation: '',
    status: '',
    search: ''
  });

  // Calculate filtered data
  const filteredData = useMemo(() => {
    return attendanceData.filter(employee => {
      const summary = calculateSummary(employee);
      const percentage = (summary.presentDays / 31) * 100;
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
  }, [attendanceData, filters]);

  // Calculate overall stats for filtered data
  const overallStats = useMemo(() => {
    return filteredData.reduce((acc, employee) => {
      const summary = calculateSummary(employee);
      acc.totalPresent += summary.presentDays;
      acc.totalAbsent += summary.absentDays;
      acc.totalHours += parseFloat(summary.totalHours);
      acc.totalEmployees++;
      return acc;
    }, { totalPresent: 0, totalAbsent: 0, totalHours: 0, totalEmployees: 0 });
  }, [filteredData]);

  // Calculate statistics for the entire dataset (unfiltered)
  const totalFaculty = attendanceData.length;
  const totalPresent = attendanceData.reduce((acc, emp) => acc + calculateSummary(emp).presentDays, 0);
  const totalAbsent = attendanceData.reduce((acc, emp) => acc + calculateSummary(emp).absentDays, 0);
  const overallPercentage = totalFaculty > 0 ? ((totalPresent / (totalFaculty * 31)) * 100).toFixed(1) : 0;

  const sidebarContent = (
    <div className="space-y-6">
           <p className="mt-2 text-slate-600">
              {filteredData.length} of {totalFaculty} employees found in {fileName}
            </p>
        <button
            onClick={onReset}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-indigo-700"
        >
            Upload New File
        </button>
    </div>
  );

  const bodyContent = (
    <div className="space-y-8 pt-16 ">
      <div className="rounded-2xl border bg-white  border-slate-200  p-6 text-slate-800 shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Detailed Faculty Attendance
            </h2>
          
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard 
            label="Total Present Days" 
            value={totalPresent} 
            colorClass={{ bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' }} 
            icon={<span className="text-2xl">✓</span>} 
        />
        <StatCard 
            label="Total Absent Days" 
            value={totalAbsent} 
            colorClass={{ bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' }} 
            icon={<span className="text-2xl">×</span>} 
        />
      </div>

      {/* Statistics Cards - Shows filtered data stats */}
      <StatsCards
        facultyData={filteredData}
        overallStats={overallStats}
        filteredCount={filteredData.length}
      />

      {/* Employee Cards - Shows filtered data */}
      {filteredData.map((employee, index) => (
        <EmployeeCard
          key={index}
          employee={employee}
          summary={calculateSummary(employee)}
        />
      ))}
    </div>
  );

  return <PageLayout Sidebar={sidebarContent} Body={bodyContent} />;
};

export default DetailedView;