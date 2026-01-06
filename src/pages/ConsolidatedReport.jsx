import React, { useMemo, useState } from 'react';
import { Layers, Mail, Send, Download, AlertCircle, BarChart3, CheckCircle, Clock, XCircle } from 'lucide-react';
import PageLayout from './PageLayout';
import { useAttendance } from '../contexts/AttendanceContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardDescription, CardTitle } from '../components/ui/Card';
import { buildConsolidatedReport, downloadConsolidatedPDF, generateConsolidatedPDFBase64 } from '../utils/report/index';
import { getActiveSMTPConfig, validateSMTPConfig } from '../store/smtpConfig';
import { sendEmail } from '../utils/email/index';

const OFFICIAL_CONSOLIDATED_RECIPIENTS = [
  { name: 'Registrar', email: 'registar@jntugv.edu.in' },
  { name: 'Vice Chancellor', email: 'vc@jntugv.edu.in' }
];

const STATUS_META = {
  idle: {
    label: 'Not Sent',
    className: 'bg-slate-100 text-slate-600',
    Icon: Clock
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700',
    Icon: Clock
  },
  sent: {
    label: 'Sent',
    className: 'bg-emerald-100 text-emerald-700',
    Icon: CheckCircle
  },
  failed: {
    label: 'Failed',
    className: 'bg-rose-100 text-rose-700',
    Icon: XCircle
  }
};

const ConsolidatedReport = () => {
  const { attendanceData, selectedMonth, selectedYear, hasData } = useAttendance();
  const [recipientInput, setRecipientInput] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [recipientStatuses, setRecipientStatuses] = useState(() =>
    OFFICIAL_CONSOLIDATED_RECIPIENTS.map((recipient) => ({
      name: recipient.name,
      email: recipient.email,
      status: 'idle',
      error: null
    }))
  );

  const officialEmailSet = useMemo(
    () => new Set(OFFICIAL_CONSOLIDATED_RECIPIENTS.map((recipient) => recipient.email.toLowerCase())),
    []
  );

  const officialStatusList = useMemo(
    () => recipientStatuses.filter((entry) => officialEmailSet.has(entry.email.toLowerCase())),
    [recipientStatuses, officialEmailSet]
  );

  const additionalStatusList = useMemo(
    () => recipientStatuses.filter((entry) => !officialEmailSet.has(entry.email.toLowerCase())),
    [recipientStatuses, officialEmailSet]
  );

  const resetStatusesForBatch = (recipients) => {
    setRecipientStatuses(
      recipients.map((recipient) => ({
        name: recipient.name || recipient.email,
        email: recipient.email,
        status: 'pending',
        error: null
      }))
    );
  };

  const updateRecipientStatus = (email, status, errorMessage = null) => {
    setRecipientStatuses((previous) =>
      previous.map((entry) =>
        entry.email.toLowerCase() === email.toLowerCase()
          ? { ...entry, status, error: errorMessage }
          : entry
      )
    );
  };

  const activeConfig = useMemo(() => getActiveSMTPConfig(), []);

  const report = useMemo(() => buildConsolidatedReport(attendanceData, selectedMonth, selectedYear), [attendanceData, selectedMonth, selectedYear]);

  const derivedDefaults = useMemo(() => {
    const baseSubject = import.meta.env.VITE_CONSOLIDATED_SUBJECT || import.meta.env.VITE_SMTP_SUBJECT || 'APFRS Attendance Report';
    const defaultMessage = `Please find attached the consolidated attendance report for ${report.periodLabel}.`;
    return {
      subject: subject || `${baseSubject} - Consolidated (${report.periodLabel})`,
      message: message || defaultMessage
    };
  }, [report.periodLabel, subject, message]);

  const departmentTotals = useMemo(() => {
    const totals = report.departments.reduce(
      (acc, dept) => {
        acc.faculty += dept.totalEmployees;
        acc.hours += dept.hoursSum;
        acc.present += dept.presentSum;
        acc.working += dept.totalSum;
        return acc;
      },
      { faculty: 0, hours: 0, present: 0, working: 0 }
    );
    const overallPct = totals.working > 0 ? (totals.present / totals.working) * 100 : 0;
    return {
      ...totals,
      percentage: Number(overallPct.toFixed(1))
    };
  }, [report.departments]);

  const parseRecipients = (value) => value
    .split(/[\n,;]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry && entry.includes('@'));

  const handleDownload = async () => {
    if (!report.departments.length) {
      alert('No attendance data available to download.');
      return;
    }
    setIsDownloading(true);
    try {
      await downloadConsolidatedPDF(report);
    } catch (error) {
      console.error('Failed to download consolidated report:', error);
      alert('Unable to download the consolidated report: ' + error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const buildEmailBody = (customMessage) => {
    const safeMessage = customMessage
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<p>${line}</p>`)
      .join('') || '<p>Please find the consolidated attendance report attached.</p>';

    const tableRows = report.departments
      .map((dept) => `
        <tr>
          <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0;">${dept.department}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0;">${dept.totalEmployees}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0;">${dept.presentSum}/${dept.totalSum}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; text-align:right;">${dept.hoursSum}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid #e2e8f0; text-align:right;">${dept.averagePercentage}%</td>
        </tr>`)
      .join('');

    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a;">
        ${safeMessage}
        <div style="margin: 16px 0; padding: 12px; background: #f1f5f9; border-radius: 12px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 8px; font-weight: 600;">Quick Snapshot (${report.periodLabel})</p>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #e2e8f0;">
                <th style="padding: 6px 12px; text-align:left;">Department</th>
                <th style="padding: 6px 12px; text-align:left;">Faculty</th>
                <th style="padding: 6px 12px; text-align:left;">Present/Total</th>
                <th style="padding: 6px 12px; text-align:right;">Hours</th>
                <th style="padding: 6px 12px; text-align:right;">Avg %</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
        <p style="margin-top: 16px;">Regards,<br/>${activeConfig?.fromName || 'APFRS Reports'}</p>
      </div>
    `;
  };

  const renderRecipientStatus = (entry) => {
    const meta = STATUS_META[entry.status] || STATUS_META.idle;
    const Icon = meta.Icon;

    return (
      <div key={entry.email} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{entry.name}</p>
            <p className="text-xs text-slate-500">{entry.email}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.className}`}>
            <Icon className="w-3.5 h-3.5" />
            {meta.label}
          </span>
        </div>
        {entry.error && (
          <p className="mt-2 text-xs text-rose-600">{entry.error}</p>
        )}
      </div>
    );
  };

  const handleSend = async () => {
    if (!report.departments.length) {
      alert('Upload attendance data before sending the consolidated report.');
      return;
    }
    const smtpConfig = activeConfig;
    if (!smtpConfig) {
      alert('Configure SMTP settings before sending emails.');
      return;
    }

    const validation = validateSMTPConfig(smtpConfig);
    if (!validation.isValid) {
      alert('Invalid SMTP configuration: ' + validation.error);
      return;
    }

    const additionalEmails = parseRecipients(recipientInput);
    const combinedList = [
      ...OFFICIAL_CONSOLIDATED_RECIPIENTS,
      ...additionalEmails.map((email) => ({ name: email, email }))
    ];

    const uniqueRecipients = [];
    const seen = new Set();
    combinedList.forEach((recipient) => {
      const emailKey = recipient.email.toLowerCase();
      if (!seen.has(emailKey)) {
        seen.add(emailKey);
        uniqueRecipients.push({
          name: recipient.name || recipient.email,
          email: recipient.email
        });
      }
    });

    if (!uniqueRecipients.length) {
      alert('No valid recipients available for the consolidated report.');
      return;
    }

    resetStatusesForBatch(uniqueRecipients);
    setIsSending(true);

    try {
      const base64Attachment = generateConsolidatedPDFBase64(report);
      const filename = `consolidated_attendance_${report.year}_${report.month}.pdf`;
      const finalSubject = derivedDefaults.subject;
      const htmlBody = buildEmailBody(derivedDefaults.message);

      let successCount = 0;
      let failureCount = 0;

      for (const recipient of uniqueRecipients) {
        try {
          await sendEmail(
            {
              recipients: [{ email: recipient.email, name: recipient.name }],
              subject: finalSubject,
              body: htmlBody,
              isHtml: true,
              attachments: [
                {
                  filename,
                  content: base64Attachment,
                  encoding: 'base64',
                  contentType: 'application/pdf'
                }
              ]
            },
            smtpConfig
          );

          successCount += 1;
          updateRecipientStatus(recipient.email, 'sent');
        } catch (error) {
          failureCount += 1;
          updateRecipientStatus(recipient.email, 'failed', error.message || 'Unable to send email');
          console.error(`Failed to send consolidated report to ${recipient.email}:`, error);
        }
      }

      if (failureCount === 0) {
        alert('Consolidated report sent successfully.');
      } else if (successCount > 0) {
        alert(`Consolidated report sent to ${successCount} recipient(s); ${failureCount} failed.`);
      } else {
        alert('Failed to send the consolidated report.');
      }
    } catch (error) {
      console.error('Failed to send consolidated report:', error);
      alert('Unable to send the consolidated report: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const bodyContent = (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Layers className="w-8 h-8 text-indigo-600" />
            Consolidated Report
          </h1>
          <p className="text-slate-500 mt-1">
            Generate and email department-wise consolidated attendance for {report.periodLabel}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleDownload}
            disabled={!hasData || isDownloading}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Preparing...' : 'Download PDF'}
          </Button>
          <Button onClick={handleSend} disabled={!hasData || isSending} className="gap-2">
            {isSending ? (
              <>
                <BarChart3 className="w-4 h-4 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Send Consolidated Email
              </>
            )}
          </Button>
        </div>
      </header>

      {!hasData ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-amber-900 mb-2">No Data Available</h3>
          <p className="text-amber-700">
            Upload attendance data to generate the consolidated report.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase">Departments</CardTitle>
                <CardDescription className="text-3xl font-bold text-slate-900">{report.departments.length}</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase">Faculty Covered</CardTitle>
                <CardDescription className="text-3xl font-bold text-slate-900">{departmentTotals.faculty}</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase">Average Attendance</CardTitle>
                <CardDescription className="text-3xl font-bold text-slate-900">{departmentTotals.percentage}%</CardDescription>
              </CardHeader>
            </Card>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" /> Email Configuration
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Recipients</label>
                  <Input
                    placeholder="Enter comma or newline separated email addresses"
                    value={recipientInput}
                    onChange={(event) => setRecipientInput(event.target.value)}
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Separate multiple emails with commas or new lines. Registrar and Vice Chancellor are included automatically.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Subject</label>
                  <Input
                    value={derivedDefaults.subject}
                    onChange={(event) => setSubject(event.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Message</label>
                  <textarea
                    className="w-full min-h-[150px] rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                    value={derivedDefaults.message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">SMTP Status</h3>
                <p className="text-sm text-slate-600">
                  Active account: <strong>{activeConfig?.user || 'Not configured'}</strong>
                </p>
                <p className="text-sm text-slate-600">
                  From name: <strong>{activeConfig?.fromName || 'APFRS Reports'}</strong>
                </p>
                <p className="text-sm text-slate-600">
                  Attachment name: <strong>{`consolidated_attendance_${report.year}_${report.month}.pdf`}</strong>
                </p>
                <p className="text-sm text-slate-600">
                  Overall hours logged: <strong>{departmentTotals.hours.toFixed(1)} hrs</strong>
                </p>
                <div className="pt-4 space-y-3 border-t border-slate-200">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Official Recipients</h4>
                  <div className="space-y-2">
                    {officialStatusList.map(renderRecipientStatus)}
                  </div>
                  {additionalStatusList.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Additional Recipients</h4>
                      <div className="space-y-2">
                        {additionalStatusList.map(renderRecipientStatus)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            {report.departments.map((dept) => (
              <div key={dept.department} className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{dept.department}</h3>
                    <p className="text-sm text-slate-500">{dept.totalEmployees} faculty • {dept.presentSum}/{dept.totalSum} present • {dept.averagePercentage}% average attendance</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">S.No</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Faculty Member</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Stats [P/T]</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Hours</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {dept.employees.map((emp) => (
                        <tr key={`${dept.department}-${emp.serial}-${emp.name}`}>
                          <td className="px-4 py-3 text-sm text-slate-700">{emp.serial}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{emp.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {emp.designation}
                            {emp.cfmsId && emp.cfmsId !== 'N/A' ? ` • ${emp.cfmsId}` : ''}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 text-center">{emp.statsLabel}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 text-right">{emp.hoursLabel}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 text-right">{emp.percentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );

  return <PageLayout Sidebar={null} Body={bodyContent} />;
};

export default ConsolidatedReport;
