import React, { useMemo } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import EmailTemplate from '../utils/EmailTemplate';
import PageLayout from './PageLayout';
import { Mail, Eye, Download, Send, AlertCircle } from 'lucide-react';
import { calculateSummary } from '../utils/attendanceUtils';
import { getActiveSMTPConfig } from '../utils/smtpConfigStore';

const EmailPreview = () => {
    const { attendanceData, selectedMonth, selectedYear, ready, hasData } = useAttendance();
    const activeConfig = useMemo(() => getActiveSMTPConfig(), []);

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

    const emailData = useMemo(() => {
        if (!sampleEmployee) return null;

        // In a real scenario, these would be passed from the actual calculation logic
        // For preview, we calculate them on the fly
        const workingDays = []; // This should be fetched from context or utils
        // For simplicity in preview, we'll use 22 days as a default if not fully available
        const mockWorkingDays = Array.from({ length: 22 }, (_, i) => i + 1);

        const summary = calculateSummary(sampleEmployee, selectedMonth, selectedYear);

        return {
            employee: sampleEmployee,
            summary: {
                ...summary,
                holidays: 2, // Mock holiday count
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
            workingDaysCount: mockWorkingDays.length,
            periodLabel
        };
    }, [sampleEmployee, selectedMonth, periodLabel, activeConfig]);

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
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-all shadow-sm">
                        <Download className="w-4 h-4" />
                        Download PDF
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
                        <Send className="w-4 h-4" />
                        Send Sample
                    </button>
                </div>
            </header>

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
                                    <p className="text-sm font-medium text-slate-900">{sampleEmployee.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Period</p>
                                    <p className="text-sm font-medium text-slate-900">{periodLabel}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Status</p>
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-bold mt-1">
                                        READY TO SEND
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
                                <li>Holidays are automatically excluded</li>
                                <li>Responsive design for mobile viewing</li>
                                <li>Unique report ID for tracking</li>
                            </ul>
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
                                            <span className="font-bold text-slate-500">To:</span> {sampleEmployee.email || (sampleEmployee.name.toLowerCase().replace(' ', '.') + '@jntugv.edu.in')}
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
                                    <EmailTemplate {...emailData} />
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
