import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Download,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { facultyProfileQuery, facultyMonthlyAttendanceQuery } from "@/lib/queries";
import { MONTH_NAMES } from "@/lib/constants";
import { useMonthYearSelector, getYearRange } from "@/hooks/useMonthYearSelector";
import {
  getAttendancePct,
  tierTextClassFromPct,
  getPresentDays,
  getAbsentDays,
  getLeaveDays,
  getWorkingDays,
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
  const {
    monthStr: selectedMonth,
    yearStr: selectedYear,
    setMonthStr: setSelectedMonth,
    setYearStr: setSelectedYear,
    month: selectedMonthNum,
    year: selectedYearNum,
  } = useMonthYearSelector();

  // 1. Fetch faculty profile
  const { data: profileData } = useQuery(facultyProfileQuery());
  const me = profileData?.profile;

  // 2. Fetch monthly attendance record
  const { data: attendanceData, isLoading, error } = useQuery(
    facultyMonthlyAttendanceQuery(selectedMonth, selectedYear)
  );

  const report = attendanceData?.monthlyRecords;
  const dailyRecords = report?.dailyRecords || [];

  const handleDownloadPdf = () => {
    window.open(
      `/api/faculty/attendance/report/pdf?month=${selectedMonth}&year=${selectedYear}`,
      "_blank"
    );
  };

  const pct = getAttendancePct(report);

  return (
    <AppShell
      roles={["faculty", "admin"]}
      title="My Attendance"
      subtitle="View your monthly attendance performance summary, check-in punch times, and export PDF statements"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Period selection cockpit */}
        <section className="surface-panel p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Select Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Select Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-28 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getYearRange(5, 2).map((y) => (
                      <SelectItem key={String(y)} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleDownloadPdf}
              disabled={!report}
              className="gap-2 h-9 text-xs"
            >
              <Download className="size-4" /> Download PDF Statement
            </Button>
          </div>
        </section>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3 surface-panel">
            <Clock className="size-8 text-indigo-400 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading attendance report data...</p>
          </div>
        ) : error || !report ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3 surface-panel border border-dashed border-border/80">
            <AlertCircle className="size-8 text-muted-foreground" />
            <p className="font-semibold text-sm">No attendance record found</p>
            <p className="text-xs text-muted-foreground text-center">
              There is no finalized attendance statement generated for the period{" "}
              <strong>
                {MONTH_NAMES[selectedMonthNum - 1]} {selectedYear}
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
