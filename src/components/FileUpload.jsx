import React, { useState, useRef } from 'react';
import { read, utils } from 'xlsx';
import { Upload, FileSpreadsheet, X, AlertCircle } from 'lucide-react';

/* ---------- MONTH UTILS ---------- */
const MONTHS = [
  { value: 'jan', label: 'January' },
  { value: 'feb', label: 'February' },
  { value: 'mar', label: 'March' },
  { value: 'apr', label: 'April' },
  { value: 'may', label: 'May' },
  { value: 'jun', label: 'June' },
  { value: 'jul', label: 'July' },
  { value: 'aug', label: 'August' },
  { value: 'sep', label: 'September' },
  { value: 'oct', label: 'October' },
  { value: 'nov', label: 'November' },
  { value: 'dec', label: 'December' },
];

const detectMonthFromFilename = (filename = '') => {
  const lower = filename.toLowerCase();
  const index = MONTHS.findIndex(m => lower.includes(m.value));
  return index !== -1 ? index + 1 : '';
};

const detectYearFromFilename = (filename = '') => {
  const yearMatch = filename.match(/20\d{2}/);
  return yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
};

const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 6; i++) {
    years.push(currentYear - i);
  }
  return years;
};

const isFutureMonth = (month, year) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year > currentYear) return true;
  if (year === currentYear && month > currentMonth) return true;
  return false;
};

const FileUpload = ({ onFileUpload, loading }) => {
  const currentYear = new Date().getFullYear();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(currentYear);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const readExcel = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const workbook = read(new Uint8Array(e.target.result), { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = utils.sheet_to_json(sheet, { header: 1, defval: '' });
        resolve(data);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(selectedFile.type)) {
      setError('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    setFile(selectedFile);
    setError('');

    const detectedMonth = detectMonthFromFilename(selectedFile.name);
    const detectedYear = detectYearFromFilename(selectedFile.name);

    if (detectedMonth) setMonth(detectedMonth);
    if (detectedYear) setYear(detectedYear);
  };

  const handleFileChange = (e) => {
    handleFileSelect(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const validateSelection = () => {
    if (!file) {
      setError('Please select a file');
      return false;
    }
    if (!month) {
      setError('Please select a month');
      return false;
    }
    if (!year) {
      setError('Please select a year');
      return false;
    }

    if (isFutureMonth(month, year)) {
      setError('Cannot import data for future months. Please select a previous or current month.');
      return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateSelection()) return;

    setProcessing(true);
    try {
      const rawData = await readExcel(file);
      await onFileUpload(file, rawData, month, year);

      setIsOpen(false);
      setFile(null);
      setMonth('');
      setYear(currentYear);
      setError('');
    } catch (err) {
      setError(err.message || 'Error processing file');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {/* Upload Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-200 group"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
            <Upload className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-700">Upload Excel File</p>
            <p className="text-sm text-slate-500 mt-1">Click to select month, year & upload attendance data</p>
          </div>
        </div>
      </button>

      {/* MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Background Blur */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setIsOpen(false);
              setError('');
              setFile(null);
            }}
          />

          {/* Modal Card */}
          <div className="relative z-50 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">
                Upload Attendance Data
              </h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setError('');
                  setFile(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Year and Month Selection */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Year Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Select Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                >
                  <option value="">-- Select Year --</option>
                  {getAvailableYears().map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Dropdown */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Select Month
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                >
                  <option value="">-- Select Month --</option>
                  {MONTHS.map((m, idx) => {
                    const monthValue = idx + 1;
                    const isDisabled = isFutureMonth(monthValue, year);
                    return (
                      <option
                        key={m.value}
                        value={monthValue}
                        disabled={isDisabled}
                        style={{ color: isDisabled ? '#cbd5e0' : 'inherit' }}
                      >
                        {m.label} {isDisabled ? '(Future)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Drag and Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                transition-all duration-200
                ${isDragging
                  ? 'border-indigo-500 bg-indigo-50'
                  : file
                    ? 'border-green-300 bg-green-50'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />

              {!file ? (
                <div className="flex flex-col items-center gap-4">
                  <div className={`
                    w-20 h-20 rounded-full flex items-center justify-center transition-colors
                    ${isDragging ? 'bg-indigo-200' : 'bg-slate-100'}
                  `}>
                    <Upload className={`w-10 h-10 ${isDragging ? 'text-indigo-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-700 mb-1">
                      {isDragging ? 'Drop file here' : 'Drag & drop your Excel file'}
                    </p>
                    <p className="text-sm text-slate-500">
                      or <span className="text-indigo-600 font-medium">click to browse</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Supports .xlsx and .xls files
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 bg-white rounded-lg p-4 border border-green-200">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">
                      {(file.size / 1024).toFixed(2)} KB
                      {month && year && (
                        <span className="ml-2">
                          • 📅 {MONTHS[month - 1]?.label} {year}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setMonth('');
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              )}
            </div>

            {/* Info Message */}
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              ℹ️ Note: You can only import data for previous or current months, not future months.
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setError('');
                  setFile(null);
                }}
                className="px-6 py-3 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={processing || loading || !file}
                className="px-6 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileUpload;
