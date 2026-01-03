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

  const showProgressInfo = bulkEmailProgress.processing || bulkEmailProgress.sent > 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Default state - simple message */}
          {!showProgressInfo && (
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Email Reports</h4>
                <p className="text-sm text-slate-600">
                  Ready to send to {employeesWithEmail} faculty members
                </p>
              </div>
            </div>
          )}

          {/* Progress/Results state */}
          {showProgressInfo && (
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">{bulkEmailProgress.total}</div>
                <div className="text-xs text-slate-500 font-medium">TOTAL</div>
              </div>

              <div className="text-center">
                <div className={`text-2xl font-bold ${bulkEmailProgress.sent === bulkEmailProgress.total ? 'text-emerald-600' : 'text-sky-600'
                  }`}>
                  {bulkEmailProgress.sent}
                </div>
                <div className="text-xs text-slate-500 font-medium">SENT</div>
              </div>

              {bulkEmailProgress.total > bulkEmailProgress.sent && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-rose-600">{bulkEmailProgress.total - bulkEmailProgress.sent}</div>
                  <div className="text-xs text-slate-500 font-medium">FAILED</div>
                </div>
              )}
            </div>
          )}

          {/* Status Indicators */}
          {bulkEmailProgress.processing && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-sky-50 rounded-lg border border-sky-200">
              <div className="w-2 h-2 bg-sky-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-sky-700">Sending {bulkEmailProgress.sent}/{bulkEmailProgress.total}</span>
            </div>
          )}

          {!bulkEmailProgress.processing && bulkEmailProgress.sent === bulkEmailProgress.total && bulkEmailProgress.total > 0 && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-emerald-700">All emails sent successfully</span>
            </div>
          )}

          {!bulkEmailProgress.processing && bulkEmailProgress.sent > 0 && bulkEmailProgress.sent < bulkEmailProgress.total && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-rose-50 rounded-lg border border-rose-200">
              <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium text-rose-700">Some emails failed to send</span>
            </div>
          )}
        </div>

        {/* Send Report Button */}
        <div className="flex items-center space-x-4">
          {!isSMTPConfigured && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium text-amber-700">SMTP Not Configured</span>
            </div>
          )}

          <button
            onClick={() => onBulkEmail()}
            disabled={sendingEmail || bulkEmailProgress.processing || !isSMTPConfigured}
            className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center shadow-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {bulkEmailProgress.processing ? 'Sending...' : 'Send Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailActions;