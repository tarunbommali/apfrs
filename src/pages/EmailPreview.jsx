import React, { useMemo, useState } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import { generateEmailHTML } from '../utils/emailTemplateGenerator';
import PageLayout from './PageLayout';
import { Mail, Eye, Download, AlertCircle, FileSpreadsheet, FileText, Loader2, BarChart3 } from 'lucide-react';
import { calculateSummary } from '../utils/attendanceUtils';
import { getActiveSMTPConfig } from '../utils/smtpConfigStore';
import { downloadReport } from '../utils/reportGenerator';

const EmailPreview = () => {
    const { attendanceData, selectedMonth, selectedYear, hasData } = useAttendance();
    const activeConfig = useMemo(() => getActiveSMTPConfig(), []);
    const [isDownloading, setIsDownloading] = useState(false);

    // Pick the first employee as a sample
    const sampleEmployee = useMemo(() => {
        if (!hasData || !attendanceData.length) return null;
        return attendanceData[0];
    }, [hasData, attendanceData]);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const periodLabel = `${monthNames[selectedMonth - 1]} ${selectedYear}`;

    const summary = useMemo(() => {
        if (!sampleEmployee) return null;
        return calculateSummary(sampleEmployee, selectedMonth, selectedYear);
    }, [sampleEmployee, selectedMonth, selectedYear]);

    const emailData = useMemo(() => {
        if (!sampleEmployee || !summary) return null;

        return {
            employee: sampleEmployee,
            summary: {
                ...summary,
                holidays: summary.holidays,
            },
            config: {
                companyName: activeConfig?.fromName?.split(' ')[0] || 'JNTU-GV Vizianagaram',
                systemName: activeConfig?.fromName || 'APFRS'
            },
            periodLabel
        };
    }, [sampleEmployee, summary, selectedMonth, selectedYear, periodLabel, activeConfig]);

    const htmlContent = useMemo(() => {
        if (!emailData) return '';
        return generateEmailHTML(
            emailData.employee,
            emailData.summary,
            emailData.config,
            emailData.periodLabel
        );
    }, [emailData]);

    const handleDownload = async (format) => {
        if (!sampleEmployee || !summary) return;

        setIsDownloading(true);

        try {
            await downloadReport({
                employee: sampleEmployee,
                summary,
                month: selectedMonth,
                year: selectedYear,
                periodLabel
            }, format);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download report: ' + error.message);
        } finally {
            setIsDownloading(false);
        }
    };

    const bodyContent = (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Mail className="w-8 h-8 text-indigo-600" />
                        Email Template Preview
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Preview the attendance report email format.
                    </p>
                </div>
            </div>

            {/* Preview Section */}
            {!hasData ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-amber-900 mb-2">No Data Available</h3>
                    <p className="text-amber-700">
                        Please upload attendance data first to see a preview of the email template.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Controls/Info */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Preview Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Sample Faculty</p>
                                    <p className="text-sm font-medium text-slate-900">{sampleEmployee?.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Email</p>
                                    <p className="text-sm font-medium text-slate-700">{sampleEmployee?.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Period</p>
                                    <p className="text-sm font-medium text-slate-900">{periodLabel}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">SMTP Status</p>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold mt-1 ${activeConfig
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {activeConfig ? 'CONFIGURED' : 'NOT CONFIGURED'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Export Options */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Export Sample</h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => handleDownload('pdf')}
                                    disabled={isDownloading}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <FileText className="w-5 h-5 text-red-500" />
                                    <span className="text-sm font-medium text-slate-700">PDF Report</span>
                                </button>
                                <button
                                    onClick={() => handleDownload('excel')}
                                    disabled={isDownloading}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <FileSpreadsheet className="w-5 h-5 text-green-500" />
                                    <span className="text-sm font-medium text-slate-700">Excel Report</span>
                                </button>
                                <button
                                    onClick={() => handleDownload('csv')}
                                    disabled={isDownloading}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <FileText className="w-5 h-5 text-blue-500" />
                                    <span className="text-sm font-medium text-slate-700">CSV Report</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Email Canvas - Renamed to Preview */}
                    <div className="lg:col-span-3">
                        <div className="bg-slate-100 rounded-3xl p-4 md:p-8 border-4 border-slate-200 shadow-inner min-h-[800px]">
                            <div className="bg-white shadow-2xl rounded-2xl overflow-hidden mx-auto max-w-[800px] border border-slate-200">
                                {/* Simulated Email Client Header */}
                                <div className="bg-slate-50 border-b border-slate-200 p-4">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm">
                                            <span className="font-bold text-slate-500">From:</span> {activeConfig?.fromName || 'APFRS Reports'} ({activeConfig?.user || 'attendance@jntugv.edu.in'})
                                        </p>
                                        <p className="text-sm">
                                            <span className="font-bold text-slate-500">To:</span> {sampleEmployee?.email || (sampleEmployee?.name?.toLowerCase().replace(' ', '.') + '@jntugv.edu.in')}
                                        </p>
                                        <p className="text-sm font-bold text-slate-900 mt-2">
                                            Subject: {activeConfig?.subject || 'Attendance Performance Report'} - {periodLabel}
                                        </p>
                                    </div>
                                </div>

                                {/* The Actual Template Rendered */}
                                <div className="p-8 overflow-y-auto w-full">
                                    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return <PageLayout Sidebar={null} Body={bodyContent} />;
};

export default EmailPreview;
