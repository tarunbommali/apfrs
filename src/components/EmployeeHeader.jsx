import React from 'react';
import * as XLSX from 'xlsx';

const EmployeeHeader = ({ employee, summary, percentage, attendance }) => {
  const totalTrackedDays = summary.workingDays || summary.totalDays || attendance.length || 0;
  const otherDays = Math.max(totalTrackedDays - summary.presentDays - summary.absentDays, 0);

  const getStatusColor = (percent) => {
    if (percent >= 75) return 'text-green-600 bg-green-100';
    if (percent >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };


  const downloadExcel = () => {
    // Prepare data for Excel export
    const excelData = attendance.map(day => ({
      'Day': day.day,
      'In Time': day.inTime || '-',
      'Out Time': day.outTime || '-',
      'Status': day.status,
      'Duration': day.duration || '-'
    }));

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, `attendance_${employee.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="bg-linear-to-r from-indigo-500 to-purple-600 p-6 text-white">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">{employee.name}</h3>
              <div className="flex flex-wrap gap-4 text-indigo-100">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  ID: {employee.cfmsId}
                </span>
                <span>Designation: {employee.designation}</span>
                <span>Type: {employee.empType}</span>
              </div>
            </div>

            {/* Attendance Percentage */}
            <div className="mt-4 lg:mt-0 lg:ml-6 flex items-center">
              <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-bold ${getStatusColor(percentage)}`}>
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {percentage.toFixed(1)}%
              </div>
              <button
                onClick={downloadExcel}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-full flex items-center space-x-2 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download Excel</span>
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="text-center bg-white rounded-lg p-3 shadow">
          <div className="text-2xl text-blue-600 font-bold">{summary.presentDays}</div>
          <div className="text-slate-600 text-sm">Present Days</div>
        </div>
        <div className="text-center bg-white rounded-lg p-3 shadow">
          <div className="text-2xl font-bold text-red-600">{summary.absentDays}</div>
          <div className="text-slate-600 text-sm">Absent Days</div>
        </div>
        <div className="text-center bg-white rounded-lg p-3 shadow">
          <div className="text-2xl font-bold text-gray-600">{otherDays}</div>
          <div className="text-slate-600 text-sm">Other Days</div>
        </div>
        <div className="text-center bg-white rounded-lg p-3 shadow">
          <div className="text-2xl font-bold text-purple-600">{summary.totalHours}</div>
          <div className="text-slate-600 text-sm">Total Hours</div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeHeader;