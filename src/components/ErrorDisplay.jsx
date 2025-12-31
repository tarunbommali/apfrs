import React from 'react';

const ErrorDisplay = ({ error }) => {
  return (
    <div className="max-w-2xl mx-auto mb-8">
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-rose-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-rose-700 font-medium">{error}</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;