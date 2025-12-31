import React from 'react';

const LoadingIndicator = () => {
  return (
    <div className="max-w-2xl mx-auto mb-8">
      <div className="bg-white rounded-xl p-8 text-center shadow-md border border-slate-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
        <p className="text-slate-700 font-medium">Processing your attendance file...</p>
      </div>
    </div>
  );
};

export default LoadingIndicator;