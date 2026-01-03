export const emailStyles = `
/* Base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333333;
  background-color: #ffffff;
  margin: 0;
  padding: 0;
}

.email-container {
  max-width: 600px;
  margin: 0 auto;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Header */
.header {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #ffffff;
  padding: 30px 20px;
  text-align: center;
  position: relative;
}

.header h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #ffffff;
}

.header p {
  font-size: 14px;
  opacity: 0.9;
  color: #ffffff;
}

.report-badge {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
}

/* Employee Info */
.employee-info {
  padding: 24px 20px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 480px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  font-weight: 500;
}

.info-value {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.info-subtext {
  font-size: 12px;
  color: #4b5563;
  margin-top: 2px;
}

/* Metrics Grid */
.metrics-grid {
  padding: 24px 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.metrics-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.metrics-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (min-width: 480px) {
  .metrics-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

.metric-card {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 8px 0;
}

.metric-label {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.metric-subtext {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
}

/* Color classes for metrics */
.metric-primary { border-top: 3px solid #4f46e5; }
.metric-success { border-top: 3px solid #10b981; }
.metric-danger { border-top: 3px solid #ef4444; }
.metric-warning { border-top: 3px solid #f59e0b; }
.metric-info { border-top: 3px solid #3b82f6; }
.metric-purple { border-top: 3px solid #8b5cf6; }

/* Summary Section */
.summary-section {
  padding: 24px 20px;
  background-color: #f9fafb;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 480px) {
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.summary-card {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}

.summary-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.stats-list {
  list-style: none;
}

.stats-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
}

.stats-list li:last-child {
  border-bottom: none;
}

.stats-list .total-item {
  padding-top: 12px;
  border-top: 2px solid #e5e7eb;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.present { color: #10b981; }
.absent { color: #ef4444; }
.leave { color: #8b5cf6; }
.late { color: #f59e0b; }
.halfday { color: #3b82f6; }
.success { color: #10b981; }
.warning { color: #f59e0b; }
.danger { color: #ef4444; }

/* Remarks Section */
.remarks-section {
  padding: 24px 20px;
  background-color: #ffffff;
  border-top: 1px solid #e5e7eb;
}

.remarks-content {
  background-color: #f3f4f6;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #4f46e5;
}

.remarks-content p {
  font-size: 15px;
  line-height: 1.6;
  color: #374151;
}

.remarks-content .note {
  margin-top: 10px;
  font-style: italic;
}

/* Footer */
.footer {
  padding: 24px 20px;
  background-color: #1f2937;
  color: #ffffff;
  text-align: center;
}

.footer-content {
  font-size: 14px;
  line-height: 1.6;
}

.footer-note {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #374151;
  font-size: 12px;
  color: #9ca3af;
}

/* Status badges */
.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-present { background-color: #d1fae5; color: #065f46; }
.status-absent { background-color: #fee2e2; color: #991b1b; }
.status-late { background-color: #fef3c7; color: #92400e; }
.status-leave { background-color: #f3e8ff; color: #6b21a8; }
.status-halfday { background-color: #dbeafe; color: #1e40af; }

/* Utility classes */
.text-center { text-align: center; }
.mb-4 { margin-bottom: 16px; }
.mt-4 { margin-top: 16px; }
.mb-8 { margin-bottom: 32px; }
.mt-8 { margin-top: 32px; }
`;