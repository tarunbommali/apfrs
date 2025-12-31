import React from 'react';
import EmployeeHeader from './EmployeeHeader';



const EmployeeCard = ({ employee, summary }) => {
  const percentage = parseFloat(summary.attendancePercentage) || 0;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
      <EmployeeHeader employee={employee} summary={summary} percentage={percentage} attendance={employee.attendance} />
    </div>
  );
};

export default EmployeeCard;