import React, { useState } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import { Upload, Database, FileSpreadsheet, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import PageLayout from './PageLayout';
import FileUpload from '../components/FileUpload';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const ImportData = () => {
    const {
        selectedMonth,
        selectedYear,
        handleFileUpload,
        fileName,
        attendanceData,
        loading,
        error,
        resetData
    } = useAttendance();

    const [uploadSuccess, setUploadSuccess] = useState(false);

    // Upload Handler
    const onUpload = async (file, data, month, year) => {
        setUploadSuccess(false);
        const success = await handleFileUpload(file, data, month, year);
        setUploadSuccess(success);
        return success;
    };

    const bodyContent = (
        <div className="space-y-8 max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Import Attendance Data</h1>
                    <p className="text-slate-500 mt-1">Upload Excel files to import faculty attendance records.</p>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="space-y-6">
                {/* Upload Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                        Import Attendance Data
                    </h2>
                    <FileUpload
                        onFileUpload={onUpload}
                        fileName={fileName}
                        loading={loading}
                    />
                    {error && (
                        <div className="mt-4 rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-700 font-medium flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                    {uploadSuccess && !error && (
                        <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-700 font-medium flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>Successfully imported attendance data.</span>
                        </div>
                    )}
                </div>

                {/* Logs Summary */}
                {attendanceData.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Database className="w-5 h-5 text-indigo-600" />
                                Attendance Logs Summary
                            </h2>
                            <button
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to remove this attendance data?')) {
                                        resetData();
                                        setUploadSuccess(false);
                                    }
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100"
                                title="Remove File"
                            >
                                <Trash2 className="w-4 h-4" />
                                Remove File
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-sm text-slate-500">Total Records</p>
                                <p className="text-2xl font-bold text-slate-900">{attendanceData.length}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-sm text-slate-500">Period Detected</p>
                                <p className="text-2xl font-bold text-slate-900">{MONTHS[(selectedMonth - 1) || 0]} {selectedYear}</p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Sample Data (First 3 Records)</h3>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium">
                                        <tr>
                                            <th className="p-3">ID</th>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Designation</th>
                                            <th className="p-3">Department</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {attendanceData.slice(0, 3).map((emp, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-3 text-slate-600">{emp.cfmsId || idx + 1}</td>
                                                <td className="p-3 font-medium text-slate-900">{emp.name}</td>
                                                <td className="p-3 text-slate-600">{emp.designation}</td>
                                                <td className="p-3 text-slate-600">{emp.department}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Instructions Card */}
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-6">
                    <h3 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        How to Import Data
                    </h3>
                    <ul className="space-y-2 text-sm text-indigo-800">
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-600 font-bold">1.</span>
                            <span>Prepare your Excel file with attendance data in the correct format.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-600 font-bold">2.</span>
                            <span>Click the "Upload Excel File" button above.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-600 font-bold">3.</span>
                            <span>Select the year and month for the attendance data.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-600 font-bold">4.</span>
                            <span>Choose your Excel file (.xlsx or .xls format).</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-600 font-bold">5.</span>
                            <span>Click "Upload" to process the file.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-600 font-bold">⚠️</span>
                            <span className="font-semibold">Note: You can only import data for previous or current months, not future months.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );

    return <PageLayout Sidebar={null} Body={bodyContent} />;
};

export default ImportData;
