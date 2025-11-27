import React from 'react';
import EmployeeHeader from './EmployeeHeader';
import CalendarView from './CalendarView';


const EmployeeCard = ({ employee, summary }) => {
  const percentage = ((summary.presentDays / 31) * 100).toFixed(1);
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
      <EmployeeHeader employee={employee} summary={summary} percentage={percentage} attendance={employee.attendance}   />
      <CalendarView attendance={employee.attendance} />
     </div>
  );
};

export default EmployeeCard;