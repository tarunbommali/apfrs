import React, { useMemo, useState } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import EmailTemplate from '../utils/EmailTemplate';
import PageLayout from './PageLayout';
import { Mail, Eye, Download, Send, AlertCircle, FileSpreadsheet, FileText, Loader2, CheckCircle } from 'lucide-react';
import { calculateSummary } from '../utils/attendanceUtils';
import { getActiveSMTPConfig } from '../utils/smtpConfigStore';
import { downloadReport } from '../utils/reportGenerator';
import { sendIndividualReport } from '../utils/emailService';

const EmailPreview = () => {
    const { attendanceData, selectedMonth, selectedYear, ready, hasData } = useAttendance();
    const activeConfig = useMemo(() => getActiveSMTPConfig(), []);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendStatus, setSendStatus] = useState(null);
    const [downloadFormat, setDownloadFormat] = useState('pdf');

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
                holidays: 2,
            },
            config: {
                companyName: activeConfig?.fromName?.split(' ')[0] || 'JNTU-GV Vizianagaram',
                systemName: activeConfig?.fromName || 'APFRS'
            },
            totalPeriodDays: new Date(selectedYear, selectedMonth, 0).getDate(),
            attendanceMetrics: {
                lateArrivals: 2,
                averageLateTime: 15
            },
            calculatedPercentage: summary.attendancePercentage,
            workingDaysCount: summary.workingDays || 22,
            periodLabel
        };
    }, [sampleEmployee, summary, selectedMonth, selectedYear, periodLabel, activeConfig]);

    const handleDownload = async (format) => {
        if (!sampleEmployee || !summary) return;
        
        setIsDownloading(true);
        setDownloadFormat(format);
        
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

    const handleSendSample = async () => {
        if (!sampleEmployee || !activeConfig) {
            alert('Please configure SMTP settings first');
            return;
        }

        setIsSending(true);
        setSendStatus(null);

        try {
            await sendIndividualReport(sampleEmployee, activeConfig, selectedMonth, selectedYear);
            setSendStatus({ success: true, message: 'Sample email sent successfully!' });
        } catch (error) {
            console.error('Send failed:', error);
            setSendStatus({ success: false, message: error.message });
        } finally {
            setIsSending(false);
            // Clear status after 5 seconds
            setTimeout(() => setSendStatus(null), 5000);
        }
    };

    const bodyContent = (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Mail className="w-8 h-8 text-indigo-600" />
                        Email Template Preview
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Preview how the attendance report email looks for faculty members.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Download Dropdown */}
                    <div className="relative group">
                        <button 
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-all shadow-sm"
                            disabled={!hasData || isDownloading}
                            data-testid="download-btn"
                        >
                            {isDownloading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            Download
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                                onClick={() => handleDownload('pdf')}
                                disabled={!hasData || isDownloading}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-t-xl"
                                data-testid="download-pdf-btn"
                            >
                                <FileText className="w-4 h-4 text-red-500" />
                                Download PDF
                            </button>
                            <button
                                onClick={() => handleDownload('excel')}
                                disabled={!hasData || isDownloading}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                                data-testid="download-excel-btn"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-green-500" />
                                Download Excel
                            </button>
                            <button
                                onClick={() => handleDownload('csv')}
                                disabled={!hasData || isDownloading}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-b-xl"
                                data-testid="download-csv-btn"
                            >
                                <FileText className="w-4 h-4 text-blue-500" />
                                Download CSV
                            </button>
                        </div>
                    </div>
                    <button 
                        onClick={handleSendSample}
                        disabled={!hasData || isSending || !activeConfig}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid="send-sample-btn"
                    >
                        {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        {isSending ? 'Sending...' : 'Send Sample'}
                    </button>
                </div>
            </header>

            {/* Send Status Banner */}
            {sendStatus && (
                <div className={`rounded-xl p-4 flex items-center gap-3 ${
                    sendStatus.success 
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}>
                    {sendStatus.success ? (
                        <CheckCircle className="w-5 h-5" />
                    ) : (
                        <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-medium">{sendStatus.message}</span>
                </div>
            )}

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
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Attendance</p>
                                    <p className="text-sm font-medium text-slate-900">{summary?.attendancePercentage || 0}%</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">SMTP Status</p>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold mt-1 ${
                                        activeConfig 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {activeConfig ? 'CONFIGURED' : 'NOT CONFIGURED'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-6">
                            <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                Quick Tips
                            </h3>
                            <ul className="text-sm text-indigo-800 space-y-2 list-disc pl-4">
                                <li>Colors update based on performance</li>
                                <li>PDF attachment included with email</li>
                                <li>Responsive design for mobile viewing</li>
                                <li>Unique report ID for tracking</li>
                            </ul>
                        </div>

                        {/* Export Options */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Export Options</h3>
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

                    {/* Email Canvas */}
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

                                {/* The Actual Template Component */}
                                <div className="p-8 overflow-y-auto">
                                    <style>{`
                    .email-template {
                      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                      color: #1e293b;
                      line-height: 1.5;
                    }
                    .email-template .header {
                      text-align: center;
                      padding-bottom: 30px;
                      border-bottom: 2px solid #f1f5f9;
                      margin-bottom: 30px;
                    }
                    .email-template .report-badge {
                      display: inline-block;
                      background: #4f46e5;
                      color: white;
                      padding: 4px 12px;
                      border-radius: 20px;
                      font-size: 12px;
                      font-weight: 800;
                      margin-bottom: 12px;
                    }
                    .email-template h1 {
                      font-size: 28px;
                      font-weight: 800;
                      margin: 0;
                      color: #0f172a;
                    }
                    .email-template h2 {
                      font-size: 18px;
                      font-weight: 700;
                      margin-bottom: 16px;
                      color: #334155;
                      display: flex;
                      align-items: center;
                      gap: 8px;
                    }
                    .email-template .employee-info {
                      background: #f8fafc;
                      padding: 24px;
                      border-radius: 16px;
                      margin-bottom: 30px;
                    }
                    .email-template .info-grid {
                      display: grid;
                      grid-template-columns: 1fr 1fr;
                      gap: 20px;
                    }
                    .email-template .info-item {
                      display: flex;
                      flex-direction: column;
                    }
                    .email-template .info-label {
                      font-size: 12px;
                      font-weight: 600;
                      color: #64748b;
                      text-transform: uppercase;
                    }
                    .email-template .info-value {
                      font-size: 16px;
                      font-weight: 700;
                      color: #1e293b;
                    }
                    .email-template .metrics-container {
                      display: grid;
                      grid-template-columns: repeat(3, 1fr);
                      gap: 16px;
                      margin-bottom: 30px;
                    }
                    .email-template .metric-card {
                      padding: 20px;
                      border-radius: 16px;
                      text-align: center;
                    }
                    .email-template .metric-primary { background: #eef2ff; border: 1px solid #c7d2fe; }
                    .email-template .metric-success { background: #f0fdf4; border: 1px solid #bbf7d0; }
                    .email-template .metric-danger { background: #fef2f2; border: 1px solid #fecaca; }
                    .email-template .metric-warning { background: #fffbeb; border: 1px solid #fef3c7; }
                    .email-template .metric-info { background: #f0f9ff; border: 1px solid #bae6fd; }
                    .email-template .metric-purple { background: #faf5ff; border: 1px solid #e9d5ff; }
                    
                    .email-template .metric-label { font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px; }
                    .email-template .metric-value { font-size: 24px; font-weight: 800; color: #0f172a; }
                    .email-template .metric-subtext { font-size: 11px; color: #94a3b8; margin-top: 4px; }
                    
                    .email-template .summary-grid {
                      display: grid;
                      grid-template-columns: 1fr 1fr;
                      gap: 20px;
                      margin-bottom: 30px;
                    }
                    .email-template .summary-card {
                      background: white;
                      border: 1px solid #e2e8f0;
                      border-radius: 16px;
                      padding: 20px;
                    }
                    .email-template .summary-card h3 { font-size: 14px; font-weight: 700; margin-top: 0; margin-bottom: 16px; }
                    .email-template .stats-list { list-style: none; padding: 0; margin: 0; }
                    .email-template .stats-list li {
                      display: flex;
                      justify-content: space-between;
                      padding: 8px 0;
                      border-bottom: 1px solid #f1f5f9;
                    }
                    .email-template .stats-list li:last-child { border: none; }
                    .email-template .total-item { border-top: 2px solid #f1f5f9 !important; margin-top: 4px; padding-top: 12px !important; }
                    .email-template .stat-label { font-size: 13px; color: #64748b; }
                    .email-template .stat-value { font-size: 14px; font-weight: 700; }
                    .email-template .stat-value.success { color: #10b981; }
                    .email-template .stat-value.warning { color: #f59e0b; }
                    .email-template .stat-value.danger { color: #ef4444; }
                    
                    .email-template .remarks-section {
                      background: #f1f5f9;
                      padding: 24px;
                      border-radius: 16px;
                      margin-bottom: 30px;
                    }
                    .email-template .remarks-content p { margin-top: 0; font-size: 15px; color: #334155; }
                    .email-template .remarks-content .note { font-size: 12px; font-style: italic; color: #64748b; margin-bottom: 0; }
                    
                    .email-template .footer {
                      text-align: center;
                      padding-top: 30px;
                      border-top: 2px solid #f1f5f9;
                    }
                    .email-template .footer-content { font-size: 13px; color: #64748b; }
                    .email-template .footer-note { font-size: 11px; margin-top: 10px; color: #94a3b8; }
                  `}</style>
                                    {emailData && <EmailTemplate {...emailData} />}
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
