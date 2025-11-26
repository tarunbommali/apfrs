import React from 'react';
import EmployeeHeader from './EmployeeHeader';
import CalendarView from './CalendarView';
import AttendanceTable from './AttendanceTable';

const EmployeeCard = ({ employee, summary }) => {
  const percentage = ((summary.presentDays / 31) * 100).toFixed(1);
  
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <EmployeeHeader employee={employee} summary={summary} percentage={percentage} />
      <CalendarView attendance={employee.attendance} />
      <AttendanceTable attendance={employee.attendance} />
    </div>
  );
};

export default EmployeeCard;