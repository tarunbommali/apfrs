/* eslint-disable no-unused-vars */
import React from 'react';
import { calculateSummary } from '../../utils/attendanceUtils';

const FacultyTable = ({ 
  facultyData, 
  onSendEmail, 
  emailStatus, 
  sendingEmail,
  bulkEmailProgress 
}) => {
  const totalDays = 31;

  if (facultyData.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-500 text-lg">No faculty members match your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Faculty Member
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Department
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Designation
            </th>
            <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Days
            </th>
            <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Present
            </th>
            <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Absent
            </th>
            <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Hours
            </th>
            <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Percentage
            </th>
            <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {facultyData.map((employee, index) => {
            const summary = calculateSummary(employee);
            const percentage = ((summary.presentDays / totalDays) * 100).toFixed(1);
            const status = percentage >= 75 ? 'Good' : percentage >= 50 ? 'Average' : 'Poor';
            const emailStatusForEmployee = emailStatus[employee.cfmsId];

            const getEmailButtonText = () => {
              if (emailStatusForEmployee === 'sending') return 'Sending...';
              if (emailStatusForEmployee === 'sent') return 'Sent ✓';
              if (emailStatusForEmployee === 'error') return 'Error!';
              return 'Send Email';
            };

            return (
              <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                    <div className="text-sm text-gray-500">ID: {employee.cfmsId}</div>
                    {employee.email && employee.email !== 'N/A' && (
                      <div className="text-xs text-blue-600 truncate max-w-xs">{employee.email}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    employee.department === 'N/A' 
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {employee.department}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {employee.designation || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center font-medium">
                  {totalDays}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {summary.presentDays}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    {summary.absentDays}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center font-medium">
                  {summary.totalHours}h
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <span className={`text-sm font-bold ${
                      percentage >= 75 ? 'text-green-700' : 
                      percentage >= 50 ? 'text-yellow-700' : 'text-red-700'
                    }`}>
                      {percentage}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    status === 'Good' 
                      ? 'bg-green-100 text-green-800' 
                      : status === 'Average'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {employee.email && employee.email !== 'N/A' ? (
                    <button
                      onClick={() => onSendEmail(employee)}
                      disabled={sendingEmail || emailStatusForEmployee === 'sending' || bulkEmailProgress.processing}
                      className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium transition-colors duration-200 ${
                        emailStatusForEmployee === 'sent'
                          ? 'bg-green-100 text-green-700'
                          : emailStatusForEmployee === 'error'
                          ? 'bg-red-100 text-red-700'
                          : emailStatusForEmployee === 'sending'
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {getEmailButtonText()}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">No Email</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FacultyTable;