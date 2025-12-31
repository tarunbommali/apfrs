import React from "react";
import FacultyTable from "./FacultyTable";

const ReportBody = ({
  filteredData,
  effectiveWorkingDays,
  periodStats,
  sendingEmail,
  bulkEmailProgress,
  onBulkSend,
  onSendEmail,
  emailStatus,
  searchValue,
  onSearchChange,
  selectedMonth,
  selectedYear
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold">Faculty Attendance Details</h3>

          <div className="flex items-center gap-4">
            <input
              type="search"
              placeholder="Search by name, CFMS ID, department, designation..."
              className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={searchValue || ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />

            <button
              onClick={onBulkSend}
              disabled={sendingEmail || bulkEmailProgress.processing}
              className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 transition shadow"
            >
              {bulkEmailProgress.processing ? "Sending..." : "Send Bulk Email"}
            </button>
          </div>
        </div>

        <FacultyTable
          facultyData={filteredData}
          workingDays={effectiveWorkingDays}
          totalWorkingDays={periodStats.totalWorkingDays}
          onSendEmail={onSendEmail}
          emailStatus={emailStatus}
          sendingEmail={sendingEmail}
          bulkEmailProgress={bulkEmailProgress}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </div>
    </div>
  );
};

export default ReportBody;
