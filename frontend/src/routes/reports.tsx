import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  Layers,
  Search,
  UploadCloud,
  Users,
  Building2,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Table2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  attendanceMonthsQuery,
  monthlyAttendanceQuery,
  departmentsQuery,
} from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — e-Office Jntugv" },
      {
        name: "description",
        content: "View generated monthly attendance statements and export official Excel reports.",
      },
    ],
  }),
  component: ReportsArchivePage,
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ReportsArchivePage() {
  const navigate = useNavigate();
  const { data: monthsData, isLoading: monthsLoading } = useQuery(attendanceMonthsQuery());
  const availableMonths = monthsData?.months || [];

  const defaultMonth = availableMonths[0]?.month || 1;
  const defaultYear = availableMonths[0]?.year || 2025;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  const { data: activeAttendance, isLoading: recordsLoading } = useQuery(
    monthlyAttendanceQuery(selectedMonth, selectedYear)
  );

  const { data: deptsData } = useQuery(departmentsQuery());
  const dbDepartments = deptsData?.departments || [];
  const registeredCodes = useMemo(() => new Set(dbDepartments.map((d) => d.code.toUpperCase())), [dbDepartments]);

  const activeRecords = activeAttendance?.records || [];
  const activeWorkingDays = activeAttendance?.sheet?.workingDays || activeAttendance?.workingDays || 27;
  const activeMonthName = MONTH_NAMES[selectedMonth - 1] || "Monthly";

  const departmentStats = useMemo(() => {
    const deptsMap: Record<string, { totalPct: number; count: number; name: string }> = {};
    activeRecords.forEach((r: any) => {
      const dept = r.department || "General";
      if (!registeredCodes.has(dept.toUpperCase())) return;

      const pct = parseFloat(r.attendancePercentage || r.percentage || r.attendance_percentage || 0);
      if (!deptsMap[dept]) {
        deptsMap[dept] = { totalPct: 0, count: 0, name: dept };
      }
      deptsMap[dept].totalPct += pct;
      deptsMap[dept].count += 1;
    });

    return Object.values(deptsMap).map((d) => ({
      name: d.name,
      count: d.count,
      avgAttendance: d.count > 0 ? Math.round((d.totalPct / d.count) * 10) / 10 : 0,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeRecords, registeredCodes]);

  const handleExportExcel = async (m: number, y: number, recs: any[]) => {
    if (!recs.length) {
      toast.error("No records to export.");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const rows = recs.map((r: any, idx: number) => ({
        "S.No": idx + 1,
        "CFMS ID": r.cfmsId || r.cfms_id || "",
        "Faculty Name": r.name || "",
        "Department": r.department || "",
        "Designation": r.designation || "",
        "Cadre": r.jobStatus || r.job_status || "Regular",
        "Present Days": r.presentDays || r.present_days || 0,
        "Absent Days": r.absentDays || r.absent_days || 0,
        "Leave Days": r.leaveDays || r.leave_days || 0,
        "Total Working Days": r.totalWorkingDays || r.total_working_days || activeWorkingDays,
        "Attendance %": `${r.attendancePercentage || r.percentage || 0}%`,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      const mName = MONTH_NAMES[m - 1];
      XLSX.utils.book_append_sheet(wb, ws, `Attendance_${mName}_${y}`);
      XLSX.writeFile(wb, `Official_Attendance_Report_${mName}_${y}.xlsx`);
      toast.success(`Exported ${recs.length} faculty attendance records to Excel.`);
    } catch (e) {
      toast.error("Export failed: " + String(e));
    }
  };

  return (
    <AppShell
      roles={["admin"]}
      title="Reports"
      subtitle="Generated monthly statements, official archives, and Excel exports"
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleExportExcel(selectedMonth, selectedYear, activeRecords)}
            disabled={activeRecords.length === 0}
            className="gap-1.5"
          >
            <Download className="size-3.5" /> Export Selected Statement
          </Button>

          <Button size="sm" variant="outline" asChild className="gap-1.5">
            <Link to="/detailed">
              <Table2 className="size-3.5" /> Open Attendance Grid
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-5xl">
        {/* ── Section 1: Statement Month Selector & Quick KPI Banner ── */}
        <section className="surface-panel p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Monthly Statement Overview</h2>
              <p className="text-xs text-muted-foreground">Select an attendance cycle to generate reports</p>
            </div>

            <Select
              value={`${selectedMonth}-${selectedYear}`}
              onValueChange={(val) => {
                const [m, y] = val.split("-").map(Number);
                setSelectedMonth(m);
                setSelectedYear(y);
              }}
            >
              <SelectTrigger className="h-9 w-48 font-semibold text-xs">
                <Calendar className="mr-1.5 size-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((am) => (
                  <SelectItem key={`${am.month}-${am.year}`} value={`${am.month}-${am.year}`}>
                    {MONTH_NAMES[am.month - 1]} {am.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Enrolled Faculty</span>
                <Users className="size-4 text-primary" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-foreground">{activeRecords.length}</p>
              <p className="text-[11px] text-muted-foreground">{activeMonthName} {selectedYear}</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Working Days</span>
                <Calendar className="size-4 text-amber-500" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-foreground">{activeWorkingDays}</p>
              <p className="text-[11px] text-muted-foreground">Synchronized with calendar</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Status</span>
                <CheckCircle2 className="size-4 text-[var(--status-present-fg)]" />
              </div>
              <p className="mt-2 text-sm font-semibold text-[var(--status-present-fg)]">Statement Generated</p>
              <p className="text-[11px] text-muted-foreground">Ready for export and dispatch</p>
            </div>
          </div>

          {/* Department Breakdown Section */}
          {activeRecords.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Department Attendance Breakdown
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {departmentStats.map((dept) => (
                  <div key={dept.name} className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-muted-foreground" />
                      <div>
                        <span className="font-semibold text-foreground">{dept.name}</span>
                        <span className="text-[10px] text-muted-foreground block">
                          {dept.count} {dept.count === 1 ? "Faculty" : "Faculty"}
                        </span>
                      </div>
                    </div>
                    <span className={`font-mono font-bold ${
                      dept.avgAttendance >= 90
                        ? "text-[var(--status-present-fg)]"
                        : dept.avgAttendance < 75
                        ? "text-[var(--status-absent-fg)]"
                        : "text-foreground"
                    }`}>
                      {dept.avgAttendance}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Section 2: Available Monthly Statements Archive ── */}
        <section className="surface-panel p-6 space-y-4">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Available Monthly Statements</h2>
              <p className="text-xs text-muted-foreground">All processed biometric cycles stored in database</p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono font-medium text-foreground">
              {availableMonths.length} cycles
            </span>
          </div>

          {monthsLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading report archive…</div>
          ) : availableMonths.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <p>No monthly statements imported yet.</p>
              <Button asChild size="sm" className="mt-3">
                <Link to="/import">Import First Attendance Sheet</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {availableMonths.map((m) => {
                const isSelected = m.month === selectedMonth && m.year === selectedYear;
                const mName = MONTH_NAMES[m.month - 1];

                return (
                  <div
                    key={`${m.month}-${m.year}`}
                    className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                      isSelected ? "bg-muted/20 -mx-6 px-6" : ""
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">
                          {mName} {m.year}
                        </span>
                        {isSelected && (
                          <span className="rounded bg-[var(--badge-accent-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--badge-accent-fg)] border border-[rgba(94,106,210,0.2)]">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.recordCount || 71} Faculty enrolled · {m.workingDays || 27} Working Days
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedMonth(m.month);
                          setSelectedYear(m.year);
                        }}
                        className="gap-1 text-xs"
                      >
                        Select
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="gap-1 text-xs"
                      >
                        <Link to="/detailed">
                          <Table2 className="size-3.5" /> View Attendance
                        </Link>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleExportExcel(m.month, m.year, activeRecords)}
                        className="gap-1 text-xs"
                      >
                        <Download className="size-3.5" /> Export Excel
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
