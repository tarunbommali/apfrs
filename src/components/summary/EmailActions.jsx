/* eslint-disable no-unused-vars */
import React from 'react';

const EmailActions = ({ 
  employeesWithEmail, 
  isSMTPConfigured, 
  onBulkEmail, 
  bulkEmailProgress, 
  sendingEmail 
}) => {
  if (employeesWithEmail === 0) return null;

  const alertStyle = bulkEmailProgress.status === 'success'
    ? 'bg-green-50 text-green-700 border border-green-200'
    : bulkEmailProgress.status === 'error'
      ? 'bg-red-50 text-red-700 border border-red-200'
      : 'bg-blue-50 text-blue-700 border border-blue-200';

  return (
    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-blue-800">Email Reports</h3>
          <p className="text-sm text-blue-600">
            Send attendance reports to {employeesWithEmail} faculty members with email addresses
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Progress Display */}
          {bulkEmailProgress.processing && (
            <div className="text-sm text-blue-700 font-medium">
              Processing: {bulkEmailProgress.sent}/{bulkEmailProgress.total}
            </div>
          )}
          {bulkEmailProgress.sent > 0 && !bulkEmailProgress.processing && (
            <div className="text-sm text-green-700 font-medium">
              Completed: {bulkEmailProgress.sent}/{bulkEmailProgress.total}
            </div>
          )}
          <button
            onClick={onBulkEmail}
            disabled={sendingEmail || bulkEmailProgress.processing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {bulkEmailProgress.processing ? 'Sending...' : 'Send Bulk Emails'}
          </button>
        </div>
      </div>
      {bulkEmailProgress.error && (
        <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${alertStyle}`}>
          {bulkEmailProgress.error}
        </div>
      )}
      {!isSMTPConfigured && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
          SMTP not configured. Please configure email settings to send reports.
        </div>
      )}
    </div>
  );
};

export default EmailActions;