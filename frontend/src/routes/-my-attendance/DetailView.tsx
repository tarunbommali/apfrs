import { AlertCircle } from "lucide-react";
import { MONTH_NAMES } from "@/lib/constants";
import {
  getAttendancePct,
  getPresentDays,
  getAbsentDays,
  getLeaveDays,
  getWorkingDays,
} from "@/lib/attendance-utils";

// Import split components
import { MetricsCards } from "./MetricsCards";
import { DailyBreakdownTable } from "./DailyBreakdownTable";
import { StatsSidebar } from "./StatsSidebar";

interface DetailViewProps {
  period: { month: number; year: number };
  report: any;
  profile: any;
  error: any;
}

export function DetailView({
  period,
  report,
  profile,
  error,
}: DetailViewProps) {
  const monthName = MONTH_NAMES[period.month - 1] || "Monthly";
  const dailyRecords = report?.dailyRecords || [];
  const pct = getAttendancePct(report);
  const workingDays = getWorkingDays(report);

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3 surface-panel border border-dashed border-border/80">
        <AlertCircle className="size-8 text-muted-foreground" />
        <p className="font-semibold text-sm">No attendance record found</p>
        <p className="text-xs text-muted-foreground text-center">
          There is no finalized attendance statement generated for the period{" "}
          <strong>{monthName} {period.year}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MetricsCards
        presentDays={getPresentDays(report)}
        workingDays={workingDays}
        absentDays={getAbsentDays(report)}
        leaveDays={getLeaveDays(report)}
        attendancePct={pct}
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <div className="surface-panel">
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">Day-wise Attendance Breakdown</h3>
              <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border">
                {dailyRecords.length} Days
              </span>
            </div>
            <DailyBreakdownTable dailyRecords={dailyRecords} />
          </div>
        </div>

        <StatsSidebar report={report} profile={profile} />
      </div>
    </div>
  );
}
