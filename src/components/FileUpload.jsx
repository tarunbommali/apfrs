import React from 'react';

const FileUpload = ({ onFileUpload, fileName, loading }) => {
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mb-12">
      <div 
        className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white hover:border-sky-400 transition-colors duration-300 cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload').click()}
      >
        <input
          type="file"
          id="file-upload"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            <p className="text-xl font-semibold text-slate-700 mb-2">
              {loading ? 'Processing File...' : 'Upload Excel File'}
            </p>
            <p className="text-slate-500">
              Drag & drop or click to upload .xlsx or .xls files
            </p>
          </div>
          
          {fileName && (
            <div className="mt-4 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-emerald-700 font-medium">Selected: {fileName}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;