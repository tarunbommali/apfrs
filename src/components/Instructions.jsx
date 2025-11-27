import React from 'react';

const Instructions = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">How to Use</h3>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center font-bold mr-3">
              1
            </div>
            <p className="text-slate-700">Click the upload area or drag & drop your Excel file</p>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center font-bold mr-3">
              2
            </div>
            <p className="text-slate-700">File should have columns for Name, CFMS ID, and daily attendance records</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center font-bold mr-3">
              3
            </div>
            <p className="text-slate-700">Daily records include In Time, Out Time, Status, and Duration</p>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center font-bold mr-3">
              4
            </div>
            <p className="text-slate-700">View attendance summaries and detailed records for all employees</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Instructions;