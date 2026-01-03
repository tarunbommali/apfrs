import React from "react";
import { Clock, Calendar } from "lucide-react";
import StatsCards from './StatsCards';

const ReportOverview = ({
  periodStats,
  selectedMonth,
  selectedYear,
  facultyData = [],
  overallStats = {},
  workingDays = []
}) => {
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  return (
    <div className="space-y-6">
      {/* Working days section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-sky-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{monthLabel} Stats</h3>
        </div>

        {/* Calendar Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{periodStats.totalPeriodDays || 0}</p>
                <p className="text-sm text-slate-600 font-semibold">Total Days</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{periodStats.totalWorkingDays || 0}</p>
                <p className="text-sm text-slate-600 font-semibold">Working Days</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-white rounded-xl border border-red-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{(periodStats.totalPeriodDays || 0) - (periodStats.totalWorkingDays || 0)}</p>
                <p className="text-sm text-slate-600 font-semibold">Holidays</p>
              </div>
            </div>
          </div>
        </div>


        <div className="my-6">
          {/* Month's Top Stats */}
          {facultyData && facultyData.length > 0 && (
            <div className="mb-6">
              <StatsCards
                facultyData={facultyData}
                overallStats={overallStats}
                filteredCount={facultyData.length}
                workingDays={workingDays}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
              />
            </div>
          )}

        </div>

      </div>
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
