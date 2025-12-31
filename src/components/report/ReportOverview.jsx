import React from "react";
import { Mail, CheckCircle2, XCircle, Loader2, Send, Clock, Users, BarChart3 } from "lucide-react";

const ReportOverview = ({
  periodStats,
  overallStats,
  isSMTPConfigured,
  employeesAlreadySent,
  employeesWithEmail,
  bulkEmailProgress,
  sendingEmail,
  onBulkSend,
  selectedMonth = 11,
  selectedYear = 2025
}) => {
  const isProcessing = bulkEmailProgress?.processing;
  const progressPercent = isProcessing
    ? Math.round((bulkEmailProgress.current / bulkEmailProgress.total) * 100)
    : 0;

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  return (
    <div className="space-y-6">
      {/* Progress Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
              <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-sky-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>
          </div>

          <div className="relative w-full max-w-lg mx-auto p-8 text-center">
            <div className="bg-white rounded-3xl shadow-2xl p-10 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-slate-100">
                <div
                  className="h-full bg-linear-to-r from-indigo-600 to-violet-600 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mb-8">
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Send className="w-10 h-10 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Sending Bulk Reports</h2>
                <p className="text-slate-500">Processing faculty attendance reports...</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Success</p>
                  <p className="text-2xl font-black text-green-600">{bulkEmailProgress.success}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Failed</p>
                  <p className="text-2xl font-black text-rose-600">{bulkEmailProgress.fail}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-bold text-slate-700">Total Progress</span>
                  <span className="font-black text-indigo-600">{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-500 transition-all duration-500 bg-[length:200%_100%] animate-shimmer"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-sm font-medium text-slate-400">
                  {bulkEmailProgress.current} of {bulkEmailProgress.total} reports processed
                </p>
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 text-indigo-600 font-bold text-sm animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                Please do not close this window
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overall Attendance Stats */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Overall Attendance</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Faculty Count</p>
            <p className="text-xl font-black text-slate-900">{overallStats.totalEmployees}</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Avg Rate</p>
            <p className="text-xl font-black text-indigo-700">{overallStats.averageAttendancePercentage}%</p>
          </div>
        </div>

        <div className="space-y-3">
          <StatItem label="Present Days" value={overallStats.totalPresent} color="green" />
          <StatItem label="Absent Days" value={overallStats.totalAbsent} color="rose" />
          <StatItem label="Leave Days" value={overallStats.totalLeave} color="amber" />
          <StatItem label="Total Hours" value={overallStats.totalHours} color="blue" />
        </div>
      </div>

      {/* Working days section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-sky-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{monthLabel} Stats</h3>
        </div>

        <div className="space-y-3">
          <StatsCard label="Total Days" value={periodStats.totalPeriodDays} type="blue" />
          <StatsCard label="Working Days" value={periodStats.totalWorkingDays} type="green" />
          <StatsCard label="Working %" value={`${periodStats.workingDayPercentage}%`} type="amber" />
        </div>
      </div>

      {/* Email section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-violet-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Email Reports</h3>
        </div>

        <button
          onClick={onBulkSend}
          disabled={
            !isSMTPConfigured ||
            sendingEmail ||
            isProcessing ||
            employeesWithEmail === 0
          }
          className={`
            w-full px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all
            ${isProcessing || sendingEmail
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-linear-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98]'
            }
          `}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sending Reports...
            </>
          ) : (
            <>
              <Mail className="w-5 h-5" />
              Send Bulk Reports ({employeesWithEmail})
            </>
          )}
        </button>

        {employeesAlreadySent > 0 && (
          <div className="mt-4 flex items-center gap-2 justify-center p-3 bg-amber-50 rounded-xl border border-amber-100">
            <CheckCircle2 className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              {employeesAlreadySent} reports already sent today
            </p>
          </div>
        )}

        {!isSMTPConfigured && (
          <div className="mt-4 flex items-center gap-2 justify-center p-3 bg-rose-50 rounded-xl border border-rose-100">
            <XCircle className="w-4 h-4 text-rose-600" />
            <p className="text-xs font-bold text-rose-700 uppercase tracking-wider text-center">
              SMTP not configured. Check settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
const StatItem = ({ label, value, color }) => {
  const colorMap = {
    green: "text-green-600 bg-green-50 border-green-100",
    rose: "text-rose-600 bg-rose-50 border-rose-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    blue: "text-blue-600 bg-blue-50 border-blue-100",
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-slate-50/50">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className={`text-sm font-black px-3 py-1 rounded-lg ${colorMap[color]}`}>{value}</span>
    </div>
  );
};

const StatsCard = ({ label, value, type }) => {
  const typeMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-green-50 text-green-700 border-green-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border ${typeMap[type]}`}>
      <span className="text-sm font-bold uppercase tracking-wider opacity-80">{label}</span>
      <span className="text-xl font-black">{value}</span>
    </div>
  );
};

export default ReportOverview;
