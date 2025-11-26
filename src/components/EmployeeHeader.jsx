import React from 'react';

const EmployeeHeader = ({ employee, summary, percentage }) => {
  const getStatusColor = (percent) => {
    if (percent >= 75) return 'text-green-600 bg-green-100';
    if (percent >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusText = (percent) => {
    if (percent >= 75) return 'Excellent';
    if (percent >= 50) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">{employee.name}</h3>
              <div className="flex flex-wrap gap-4 text-indigo-100">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                  </svg>
                  ID: {employee.cfmsId}
                </span>
                <span>Designation: {employee.designation}</span>
                <span>Type: {employee.empType}</span>
              </div>
            </div>
            
            {/* Attendance Percentage */}
            <div className="mt-4 lg:mt-0 lg:ml-6">
              <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-bold ${getStatusColor(percentage)}`}>
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {percentage}% - {getStatusText(percentage)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="text-center bg-white bg-opacity-20 rounded-lg p-3">
          <div className="text-2xl text-blue-600 font-bold">{summary.presentDays}</div>
          <div className="text-black text-sm">Present Days</div>
        </div>
        <div className="text-center text-blue-600 bg-white bg-opacity-20 rounded-lg p-3">
          <div className="text-2xl font-bold">{summary.absentDays}</div>
          <div className="text-black text-sm">Absent Days</div>
        </div>
        <div className="text-center text-blue-600 bg-white bg-opacity-20 rounded-lg p-3">
          <div className="text-2xl font-bold">{31 - summary.presentDays - summary.absentDays}</div>
          <div className="text-black text-sm">Other Days</div>
        </div>
        <div className="text-center text-blue-600 bg-white bg-opacity-20 rounded-lg p-3">
          <div className="text-2xl font-bold">{summary.totalHours}</div>
          <div className="text-black text-sm">Total Hours</div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeHeader;