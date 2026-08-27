import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense, useMemo, useState } from "react";
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
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/lib/queries";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Attendance Reports — e-Office Jntugv" },
      {
        name: "description",
        content: "View monthly attendance report cards, faculty statistics, department breakdowns, and export attendance records.",
      },
    ],
  }),
  component: ReportsMainRoute,
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ReportsMainRoute() {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <ReportsOverviewPage />
    </Suspense>
  );
}

function ReportsSkeleton() {
  return (
    <AppShell title="Attendance Reports" subtitle="Loading reports…">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="surface-panel h-48 animate-pulse" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function ReportsOverviewPage() {
  const navigate = useNavigate();
  const { data: monthsData, isLoading: monthsLoading } = useQuery(attendanceMonthsQuery());
  const availableMonths = monthsData?.months || [];

  // Default to the first available month if present
  const defaultMonth = availableMonths[0]?.month || new Date().getMonth() + 1;
  const defaultYear = availableMonths[0]?.year || new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  const { data: activeAttendance } = useQuery(
    monthlyAttendanceQuery(selectedMonth, selectedYear)
  );

  const activeRecords = activeAttendance?.records || [];
  const activeWorkingDays = activeAttendance?.sheet?.workingDays || activeAttendance?.workingDays || 27;
  const activeMonthName = MONTH_NAMES[selectedMonth - 1] || "Monthly";

  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

  const filteredActiveRecords = useMemo(() => {
    return activeRecords.filter((r: any) => {
      const matchSearch =
        search === "" ||
        (r.name && r.name.toLowerCase().includes(search.toLowerCase())) ||
        (r.cfmsId && r.cfmsId.includes(search)) ||
        (r.cfms_id && r.cfms_id.includes(search)) ||
        (r.department && r.department.toLowerCase().includes(search.toLowerCase()));
      const matchDept = selectedDept === "all" || r.department === selectedDept;
      return matchSearch && matchDept;
    });
  }, [activeRecords, search, selectedDept]);

  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    activeRecords.forEach((r: any) => {
      if (r.department) set.add(r.department);
    });
    return Array.from(set).sort();
  }, [activeRecords]);

  const handleExportExcel = async () => {
    if (!activeRecords.length) {
      toast.error("No records to export.");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const rows = activeRecords.map((r: any, i: number) => ({
        "S.No": i + 1,
        "CFMS ID": r.cfmsId || r.cfms_id || "",
        "Faculty Name": r.name || "",
        "Department": r.department || "",
        "Designation": r.designation || "",
        "Cadre": r.jobStatus || r.job_status || "Regular",
        "Present (P)": r.presentDays || r.present_days || 0,
        "Absent (A)": r.absentDays || r.absent_days || 0,
        "Leave (L)": r.leaveDays || r.leave_days || 0,
        "Half-Day (HD)": r.halfDays || r.half_days || 0,
        "Attendance %": `${r.attendancePercentage || r.percentage || 0}%`,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${activeMonthName}_${selectedYear}`);
      XLSX.writeFile(wb, `Attendance_Report_${activeMonthName}_${selectedYear}.xlsx`);
      toast.success("Exported attendance report to Excel.");
    } catch (e) {
      toast.error("Export failed: " + String(e));
    }
  };

  if (availableMonths.length === 0 && !monthsLoading) {
    return (
      <AppShell
        roles={["admin"]}
        title="Attendance Reports"
        subtitle="No monthly sheets found in database"
      >
        <div className="surface-panel p-16 text-center">
          <UploadCloud className="mx-auto size-12 text-muted-foreground/40" />
          <h2 className="mt-4 text-lg font-semibold">No attendance sheets imported yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload the monthly biometric Excel sheet to generate reports.
          </p>
          <Button className="mt-6" asChild>
            <Link to="/import">
              <UploadCloud className="mr-2 size-4" /> Import Biometric Data
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      roles={["admin"]}
      title="Attendance Reports"
      subtitle="Monthly attendance report cards, faculty statistics, and departmental analytics"
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/import">
            <UploadCloud className="mr-1.5 size-3.5" /> Import New Sheet
          </Link>
        </Button>
      }
    >
      <div className="space-y-8">
        {/* ── Section: Monthly Report Cards ── */}
        <section>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Monthly Attendance Report Cards</h2>
              <p className="text-xs text-muted-foreground">
                Select any monthly report card to view its dedicated report or path <code className="rounded bg-muted px-1.5 py-0.5 text-foreground font-mono">/reports/[month]/[year]</code>
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableMonths.map((m: any) => {
              const name = MONTH_NAMES[m.month - 1] || `Month ${m.month}`;
              const isSelected = selectedMonth === m.month && selectedYear === m.year;

              return (
                <div
                  key={`${m.month}-${m.year}`}
                  className={`surface-panel p-5 flex flex-col justify-between transition-all hover:border-primary/50 ${
                    isSelected ? "border-primary ring-1 ring-primary/20 bg-primary/5" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {name} {m.year}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" /> Synced
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-bold text-foreground">
                      {name} {m.year}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate" title={m.file_name || m.fileName}>
                      {m.file_name || m.fileName || `${name}_${m.year}.xlsx`}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2 border-y border-border/60 py-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Faculty Records</p>
                        <p className="font-mono text-sm font-bold text-foreground">{m.total_faculty || m.totalFaculty || 71}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Working Days</p>
                        <p className="font-mono text-sm font-bold text-foreground">{m.working_days || m.workingDays || 27}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setSelectedMonth(m.month);
                        setSelectedYear(m.year);
                      }}
                    >
                      {isSelected ? "Currently Viewing" : "Quick View"}
                    </Button>

                    <Button size="sm" asChild>
                      <Link to={`/reports/${m.month}/${m.year}`}>
                        Open Report <ArrowRight className="ml-1 size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section: Active Selected Month Detail View ── */}
        {activeRecords.length > 0 ? (
          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Report Preview: {activeMonthName} {selectedYear}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Showing {filteredActiveRecords.length} of {activeRecords.length} records · {activeWorkingDays} working days
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleExportExcel}>
                  <Download className="mr-1.5 size-3.5" /> Export Excel
                </Button>
                <Button size="sm" asChild>
                  <Link to={`/reports/${selectedMonth}/${selectedYear}`}>
                    Full Page View <ExternalLink className="ml-1.5 size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Quick Preview Table */}
            <div className="surface-panel overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by faculty name, CFMS ID, dept…"
                    className="h-8 pl-8 text-xs"
                  />
                </div>

                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="h-8 w-40 text-xs bg-card">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departmentsList.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">CFMS ID</th>
                      <th className="px-4 py-2.5">Faculty Name</th>
                      <th className="px-4 py-2.5">Department</th>
                      <th className="px-4 py-2.5">Designation</th>
                      <th className="px-3 py-2.5 text-center">Cadre</th>
                      <th className="px-4 py-2.5 text-center">Present / Working</th>
                      <th className="px-3 py-2.5 text-right">P</th>
                      <th className="px-3 py-2.5 text-right">A</th>
                      <th className="px-3 py-2.5 text-right">L</th>
                      <th className="px-3 py-2.5 text-right">HD</th>
                      <th className="px-4 py-2.5 text-right">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredActiveRecords.slice(0, 20).map((r: any, idx: number) => {
                      const pct = parseFloat(r.attendancePercentage || r.percentage || "0");
                      const pDays = r.presentDays || r.present_days || 0;
                      const wDays = r.totalWorkingDays || r.total_working_days || activeWorkingDays;

                      return (
                        <tr key={idx} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-2 font-mono text-muted-foreground">{r.cfmsId || r.cfms_id || "—"}</td>
                          <td className="px-4 py-2 font-medium text-foreground">{r.name}</td>
                          <td className="px-4 py-2 text-foreground">{r.department || "General"}</td>
                          <td className="px-4 py-2 text-muted-foreground">{r.designation || "Assistant Professor"}</td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${
                                (r.jobStatus || r.job_status || "").toLowerCase() === "regular"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {(r.jobStatus || r.job_status || "Regular").toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center font-mono font-semibold text-foreground">
                            <span className="text-emerald-600 dark:text-emerald-400">{pDays}</span>
                            <span className="text-muted-foreground"> / {wDays}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {pDays}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                            {r.absentDays || r.absent_days || 0}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                            {r.leaveDays || r.leave_days || 0}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                            {r.halfDays || r.half_days || 0}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-foreground">
                            {pct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                <span>Showing first {Math.min(20, filteredActiveRecords.length)} of {activeRecords.length} records</span>
                <Link
                  to={`/reports/${selectedMonth}/${selectedYear}`}
                  className="font-semibold text-primary hover:underline"
                >
                  View full report with all records →
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
