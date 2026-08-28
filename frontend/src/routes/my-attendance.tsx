import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  AlertCircle,
  Clock,
  ArrowLeft,
  Eye,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { facultyProfileQuery, facultyMonthlyAttendanceQuery } from "@/lib/queries";
import { MONTH_NAMES } from "@/lib/constants";
import {
  getAttendancePct,
  tierTextClassFromPct,
  getPresentDays,
  getAbsentDays,
  getLeaveDays,
  getWorkingDays,
  calculateTotalWorkingHours,
} from "@/lib/attendance-utils";

export const Route = createFileRoute("/my-attendance")({
  head: () => ({
    meta: [
      { title: "My Attendance Statement — e-Office Jntugv" },
      {
        name: "description",
        content: "View your personal biometric monthly attendance breakdown, check-in punch times, and download PDF statements.",
      },
    ],
  }),
  component: MyAttendancePage,
});

function MyAttendancePage() {
  const [viewDetailsPeriod, setViewDetailsPeriod] = useState<{ month: number; year: number } | null>(null);

  // 1. Fetch faculty profile
  const { data: profileData } = useQuery(facultyProfileQuery());
  const me = profileData?.profile;

  // 2. Fetch monthly attendance data
  const { data: attendanceData, isLoading, error } = useQuery(
    facultyMonthlyAttendanceQuery(
      viewDetailsPeriod ? String(viewDetailsPeriod.month) : undefined,
      viewDetailsPeriod ? String(viewDetailsPeriod.year) : undefined
    )
  );

  const report = attendanceData?.monthlyRecords;
  const dailyRecords = report?.dailyRecords || [];
  const history = attendanceData?.history || [];

  const handleDownloadPdf = () => {
    if (!viewDetailsPeriod) return;
    window.open(
      `/api/faculty/attendance/report/pdf?month=${viewDetailsPeriod.month}&year=${viewDetailsPeriod.year}`,
      "_blank"
    );
  };

  // ── VIEW 1: MASTER ATTENDANCE SHEETS HISTORY ──
  if (!viewDetailsPeriod) {
    return (
      <AppShell
        roles={["faculty", "admin"]}
        title="My Attendance"
        subtitle="Manage and view all your monthly attendance records uploaded in the registry"
      >
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="surface-panel p-6 space-y-4">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Available Monthly Statements</h2>
                <p className="text-xs text-muted-foreground">All biometric cycles stored in database for your account</p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono font-medium text-foreground">
                {history.length} cycles
              </span>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-20 gap-3">
                <Clock className="size-8 text-indigo-400 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading attendance history...</p>
              </div>
            ) : error || history.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 gap-3 border border-dashed border-border/80">
                <AlertCircle className="size-8 text-muted-foreground" />
                <p className="font-semibold text-sm">No attendance records found</p>
                <p className="text-xs text-muted-foreground text-center">
                  There are no attendance statements uploaded for your CFMS ID or email yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="border-b border-border bg-muted/30 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4 text-center">Present / Working Days</th>
                      <th className="py-3 px-4 text-center">Absent Days</th>
                      <th className="py-3 px-4 text-center">Holidays & Sundays</th>
                      <th className="py-3 px-4 text-center">Working Hours</th>
                      <th className="py-3 px-4 text-center">Attendance %</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.map((row: any, idx: number) => {
                      const pct = getAttendancePct(row);
                      return (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {MONTH_NAMES[row.month - 1]} {row.year}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-medium text-foreground">
                            {getPresentDays(row)} / {getWorkingDays(row)}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-medium text-[var(--status-absent-fg)]">
                            {getAbsentDays(row)}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                            {row.holidayDays ?? row.holiday_days ?? 0}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                            {calculateTotalWorkingHours(row.dailyRecords || row.attendance)}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono">
                            <span className={tierTextClassFromPct(pct)}>{pct}%</span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewDetailsPeriod({ month: row.month, year: row.year })}
                              className="gap-1.5 h-8 text-xs font-semibold"
                            >
                              <Eye className="size-3.5" /> Open Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </AppShell>
    );
  }

  // ── VIEW 2: MONTH DAY-WISE PUNCH TIMES BREAKDOWN ──
  const pct = getAttendancePct(report);

  return (
    <AppShell
      roles={["faculty", "admin"]}
      title="My Attendance Details"
      subtitle={`${MONTH_NAMES[viewDetailsPeriod.month - 1]} ${viewDetailsPeriod.year} · Personal breakdown`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewDetailsPeriod(null)}
            className="gap-1.5 h-9 text-xs"
          >
            <ArrowLeft className="size-4" /> Back to History
          </Button>

          <Button
            onClick={handleDownloadPdf}
            disabled={!report}
            className="gap-2 h-9 text-xs"
          >
            <Download className="size-4" /> Download PDF Statement
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3 surface-panel">
            <Clock className="size-8 text-indigo-400 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading attendance report details...</p>
          </div>
        ) : error || !report ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3 surface-panel border border-dashed border-border/80">
            <AlertCircle className="size-8 text-muted-foreground" />
            <p className="font-semibold text-sm">No attendance record found</p>
            <p className="text-xs text-muted-foreground text-center">
              There is no finalized attendance statement generated for the period{" "}
              <strong>
                {MONTH_NAMES[viewDetailsPeriod.month - 1]} {viewDetailsPeriod.year}
              </strong>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header info & metrics */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="surface-panel p-4 flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Present Days</span>
                <strong className="text-2xl font-mono text-[var(--status-present-fg)] mt-2">
                  {getPresentDays(report)} <span className="text-xs font-sans text-muted-foreground">/ {getWorkingDays(report)}</span>
                </strong>
              </div>

              <div className="surface-panel p-4 flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Absent Days</span>
                <strong className="text-2xl font-mono text-[var(--status-absent-fg)] mt-2">
                  {getAbsentDays(report)}
                </strong>
              </div>

              <div className="surface-panel p-4 flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Leave Days</span>
                <strong className="text-2xl font-mono text-[var(--status-leave-fg)] mt-2">
                  {getLeaveDays(report)}
                </strong>
              </div>

              <div className="surface-panel p-4 flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Attendance Rate</span>
                <strong className={`text-2xl font-mono mt-2 ${tierTextClassFromPct(pct)}`}>
                  {pct}%
                </strong>
              </div>
            </div>

            {/* Main breakdown */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-6 md:col-span-2">
                <div className="surface-panel">
                  <div className="border-b border-border px-5 py-4 flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-foreground">Day-wise Attendance Breakdown</h3>
                    <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border">
                      {dailyRecords.length} Days
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-muted/30 font-medium text-muted-foreground">
                        <tr>
                          <th className="px-5 py-3">Day</th>
                          <th className="px-5 py-3">In Time</th>
                          <th className="px-5 py-3">Out Time</th>
                          <th className="px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {dailyRecords.map((d: any, idx: number) => {
                          const dateObj = new Date(d.date);
                          const isWeekend = d.status === "Weekend" || d.status === "SS" || dateObj.getDay() === 0;
                          const isHoliday = d.status === "Holiday" || d.status === "H";
                          
                          const inTimeDisp = d.inTime || (isWeekend ? "Weekend" : isHoliday ? "Holiday" : "—");
                          const outTimeDisp = d.outTime || (isWeekend ? "Weekend" : isHoliday ? "Holiday" : "—");

                          let statusStyle = "text-muted-foreground";
                          if (d.status === "P" || d.status === "Present") statusStyle = "text-[var(--status-present-fg)] font-semibold";
                          else if (d.status === "A" || d.status === "Absent") statusStyle = "text-[var(--status-absent-fg)] font-semibold";
                          else if (d.status === "L" || d.status === "Leave") statusStyle = "text-[var(--status-leave-fg)] font-semibold";

                          return (
                            <tr key={idx} className="hover:bg-muted/30 transition-colors">
                              <td className="px-5 py-2.5 font-mono text-muted-foreground">Day {idx + 1}</td>
                              <td className="px-5 py-2.5 font-mono">{inTimeDisp}</td>
                              <td className="px-5 py-2.5 font-mono">{outTimeDisp}</td>
                              <td className={`px-5 py-2.5 ${statusStyle}`}>{d.status}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sidebar stats panel */}
              <div className="space-y-6">
                <div className="surface-panel p-5 space-y-4">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Additional Statistics</h4>
                  
                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Working Days</span>
                      <span className="font-bold font-mono">{getWorkingDays(report)} Days</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                      <span className="text-muted-foreground">Holidays & Sundays</span>
                      <span className="font-bold font-mono">{report.holidayDays} Days</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                      <span className="text-muted-foreground">Half Days</span>
                      <span className="font-bold font-mono">{report.halfDays || 0} Days</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                      <span className="text-muted-foreground">Late Check-ins</span>
                      <span className="font-bold font-mono">{report.lateDays || 0} Days</span>
                    </div>
                  </div>
                </div>

                <div className="surface-panel p-5 space-y-3">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Employee Details</h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground">Designation</span>
                      <p className="font-medium text-foreground mt-0.5">{me?.designation || report.designation || "Assistant Professor"}</p>
                    </div>
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] uppercase text-muted-foreground">Department</span>
                      <p className="font-medium text-foreground mt-0.5">{me?.department || report.department}</p>
                    </div>
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] uppercase text-muted-foreground">CFMS ID</span>
                      <p className="font-medium font-mono mt-0.5">{me?.cfms_id || me?.cfmsId || report.cfmsId}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
