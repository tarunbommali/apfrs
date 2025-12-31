/* eslint-disable react-hooks/purity */
import React from 'react';
import { formatDate, formatTime } from './utility';

const EmailTemplate = ({
  employee,
  summary,
  config,
  totalPeriodDays,
  attendanceMetrics,
  calculatedPercentage,
  workingDaysCount,
  periodLabel = ''
}) => {
  const companyName = config?.companyName || 'APFRS';
  const systemName = config?.systemName || 'Attendance System';

  return (
    <div className="email-template">
      {/* Header */}
      <EmailHeader periodLabel={periodLabel} />

      {/* Employee Information */}
      <EmployeeInfo
        employee={employee}
        periodLabel={periodLabel}
      />

      {/* Key Metrics */}
      <MetricsGrid
        calculatedPercentage={calculatedPercentage}
        workingDaysCount={workingDaysCount}
        summary={summary}
        attendanceMetrics={attendanceMetrics}
      />

      {/* Summary Section */}
      <SummarySection
        summary={summary}
        totalPeriodDays={totalPeriodDays}
        workingDaysCount={workingDaysCount}
        calculatedPercentage={calculatedPercentage}
      />

      {/* Remarks Section */}
      <RemarksSection
        employee={employee}
        calculatedPercentage={calculatedPercentage}
        workingDaysCount={workingDaysCount}
        summary={summary}
      />

      {/* Footer */}
      <EmailFooter
        employee={employee}
        companyName={companyName}
        systemName={systemName}
      />
    </div>
  );
};

// Header Component
const EmailHeader = ({ periodLabel }) => (
  <div className="header">
    <div className="report-badge">REPORT</div>
    <h1>Attendance Report</h1>
    <p>{periodLabel} • Generated on {formatDate()}</p>
  </div>
);

// Employee Info Component
const EmployeeInfo = ({ employee, periodLabel }) => (
  <div className="employee-info">
    <div className="info-grid">
      <InfoItem label="Employee Name" value={employee.name} />
      <InfoItem label="Employee ID" value={employee.cfmsId || employee.employeeId || 'N/A'} />
      <InfoItem label="Department" value={employee.department || 'N/A'} />
      <InfoItem
        label="Designation"
        value={employee.designation || 'N/A'}
        subtext={`Period: ${periodLabel}`}
      />
    </div>
  </div>
);

// Info Item Component
const InfoItem = ({ label, value, subtext }) => (
  <div className="info-item">
    <span className="info-label">{label}</span>
    <span className="info-value">{value}</span>
    {subtext && <span className="info-subtext">{subtext}</span>}
  </div>
);

// Metrics Grid Component
const MetricsGrid = ({
  calculatedPercentage,
  workingDaysCount,
  summary,
  attendanceMetrics
}) => (
  <div className="metrics-grid">
    <h2 className="metrics-title">📊 Key Metrics</h2>
    <div className="metrics-container">
      <MetricCard
        type="primary"
        label="Attendance Rate"
        value={`${calculatedPercentage}%`}
        subtext={`${workingDaysCount} working days`}
      />
      <MetricCard
        type="success"
        label="Present Days"
        value={summary.presentDays}
        subtext={`out of ${workingDaysCount}`}
      />
      <MetricCard
        type="danger"
        label="Absent Days"
        value={summary.absentDays}
        subtext={`out of ${workingDaysCount}`}
      />
      <MetricCard
        type="warning"
        label="Late Arrivals"
        value={attendanceMetrics.lateArrivals}
        subtext={`Avg ${attendanceMetrics.averageLateTime} min`}
      />
      <MetricCard
        type="info"
        label="Total Hours"
        value={summary.totalHours}
        subtext="Recorded hours"
      />
      <MetricCard
        type="purple"
        label="Holidays"
        value={summary.holidays || 0}
        subtext="Non-working days"
      />
    </div>
  </div>
);

// Metric Card Component
const MetricCard = ({ type, label, value, subtext }) => (
  <div className={`metric-card metric-${type}`}>
    <div className="metric-label">{label}</div>
    <div className="metric-value">{value}</div>
    <div className="metric-subtext">{subtext}</div>
  </div>
);

// Summary Section Component
const SummarySection = ({
  summary,
  totalPeriodDays,
  workingDaysCount,
  calculatedPercentage
}) => (
  <div className="summary-section">
    <h2 className="section-title">📋 Detailed Summary</h2>
    <div className="summary-grid">
      <SummaryCard
        title="Attendance Breakdown"
        items={[
          { label: 'Present Days', value: summary.presentDays, className: 'present' },
          { label: 'Absent Days', value: summary.absentDays, className: 'absent' },
          { label: 'Leave Days', value: summary.leaveDays || 0, className: 'leave' },
          { label: 'Half Days', value: summary.halfDays || 0, className: 'halfday' },
          { label: 'Working Days', value: workingDaysCount, isTotal: true },
        ]}
      />
      <SummaryCard
        title="Period Details"
        items={[
          { label: 'Total Period Days', value: totalPeriodDays },
          { label: 'Working Days', value: workingDaysCount, className: 'success' },
          { label: 'Holidays', value: summary.holidays || 0, className: 'warning' },
          {
            label: 'Attendance %',
            value: `${calculatedPercentage}%`,
            className: calculatedPercentage >= 75 ? 'success' : calculatedPercentage >= 50 ? 'warning' : 'danger'
          },
          { label: 'Total Hours', value: summary.totalHours },
        ]}
      />
    </div>
  </div>
);

// Summary Card Component
const SummaryCard = ({ title, items }) => (
  <div className="summary-card">
    <h3>{title}</h3>
    <ul className="stats-list">
      {items.map((item, index) => (
        <li key={index} className={item.isTotal ? 'total-item' : ''}>
          <span className="stat-label">{item.label}</span>
          <span className={`stat-value ${item.className || ''}`}>
            {item.value}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

// Remarks Section Component
const RemarksSection = ({ employee, calculatedPercentage, workingDaysCount, summary }) => (
  <div className="remarks-section">
    <h2 className="section-title">💬 Summary & Remarks</h2>
    <div className="remarks-content">
      <p>
        <strong>{employee.name}</strong> recorded <strong>{calculatedPercentage}%</strong> attendance for the period.
        Out of <strong>{workingDaysCount}</strong> working days, they were present for <strong>{summary.presentDays}</strong> days,
        absent for <strong>{summary.absentDays}</strong> days, and took <strong>{summary.leaveDays || 0}</strong> leave days.
        Total recorded working hours: <strong>{summary.totalHours} hours</strong>.
      </p>
      <p className="note">
        Note: This calculation excludes {summary.holidays || 0} holiday(s) during the period.
      </p>
    </div>
  </div>
);

// Footer Component
const EmailFooter = ({ employee, companyName, systemName }) => {
  const reportId = `${employee.cfmsId || employee.employeeId || 'N/A'}-${Date.now().toString(36).toUpperCase()}`;

  return (
    <div className="footer">
      <div className="footer-content">
        <strong>{systemName}</strong> — Automated Attendance Reporting System
        <div className="footer-note">
          Report ID: {reportId}
          <br />
          Generated: {formatDate()} {formatTime()}
          <br /><br />
          © {new Date().getFullYear()} {companyName}. All rights reserved.
          <br />
          This is an automated report. Please contact HR for any queries.
        </div>
      </div>
    </div>
  );
};

export default EmailTemplate;
