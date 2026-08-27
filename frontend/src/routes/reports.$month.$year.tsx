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
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Filter,
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
  monthlyAttendanceQuery,
  attendanceMonthsQuery,
} from "@/lib/queries";
import { exportToExcelWorkbook } from "@/lib/attendance-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/reports/$month/$year")({
  head: ({ params }) => ({
    meta: [
      { title: `Attendance Report (${params.month}/${params.year}) — e-Office Jntugv` },
      {
        name: "description",
        content: `Monthly attendance report and faculty analytics for ${params.month} ${params.year}.`,
      },
    ],
  }),
  component: MonthReportRoute,
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_ALIASES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function parseMonthParam(param: string): number {
  const num = parseInt(param, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;
  const lower = param.toLowerCase().slice(0, 3);
  const idx = MONTH_ALIASES.indexOf(lower);
  return idx !== -1 ? idx + 1 : 1;
}

function MonthReportRoute() {
  const { month: rawMonth, year: rawYear } = Route.useParams();
  const numMonth = parseMonthParam(rawMonth);
  const numYear = parseInt(rawYear, 10) || 2025;

  return (
    <Suspense fallback={<ReportSkeleton />}>
      <MonthReportPage month={numMonth} year={numYear} />
    </Suspense>
  );
}

function ReportSkeleton() {
  return (
    <AppShell title="Attendance Report" subtitle="Loading monthly report…">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="surface-panel h-24 animate-pulse" />
          ))}
        </div>
        <div className="surface-panel h-96 animate-pulse" />
      </div>
    </AppShell>
  );
}

function MonthReportPage({ month, year }: { month: number; year: number }) {
  const navigate = useNavigate();
  const monthName = MONTH_NAMES[month - 1] || "Monthly";

  const { data: attendanceData, isLoading, error } = useQuery(monthlyAttendanceQuery(month, year));
  const { data: monthsData } = useQuery(attendanceMonthsQuery());
  const availableMonths = monthsData?.months || [];

  const [activeTab, setActiveTab] = useState<"summary" | "departments" | "weekly">("summary");
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedCadre, setSelectedCadre] = useState("all");

  const records = attendanceData?.records || [];
  const workingDays = attendanceData?.sheet?.workingDays || attendanceData?.workingDays || 27;
  const fileName = attendanceData?.sheet?.fileName || attendanceData?.fileName || `${monthName}_${year}_Biometric.xlsx`;

  // Compute department breakdown
  const departments = useMemo(() => {
    const map = new Map<string, typeof records>();
    records.forEach((r: any) => {
      const dept = r.department || "General";
      const list = map.get(dept) || [];
      list.push(r);
      map.set(dept, list);
    });

    return Array.from(map.entries()).map(([dept, list]) => {
      const total = list.length;
      const totalPct = list.reduce((sum: number, r: any) => sum + (parseFloat(r.attendancePercentage || r.percentage || "0")), 0);
      const avgPct = total > 0 ? Math.round((totalPct / total) * 10) / 10 : 0;
      const regularCount = list.filter((r: any) => (r.jobStatus || r.job_status || "").toLowerCase() === "regular").length;
      const contractCount = total - regularCount;

      return {
        department: dept,
        total,
        avgPct,
        regularCount,
        contractCount,
        list,
      };
    }).sort((a, b) => b.total - a.total);
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r: any) => {
      const matchSearch =
        search === "" ||
        (r.name && r.name.toLowerCase().includes(search.toLowerCase())) ||
        (r.cfmsId && r.cfmsId.includes(search)) ||
        (r.cfms_id && r.cfms_id.includes(search)) ||
        (r.department && r.department.toLowerCase().includes(search.toLowerCase()));

      const matchDept = selectedDept === "all" || r.department === selectedDept;
      const matchCadre =
        selectedCadre === "all" ||
        (selectedCadre === "regular" && (r.jobStatus || r.job_status || "").toLowerCase() === "regular") ||
        (selectedCadre === "contract" && (r.jobStatus || r.job_status || "").toLowerCase() === "contract");

      return matchSearch && matchDept && matchCadre;
    });
  }, [records, search, selectedDept, selectedCadre]);

  // Overall metrics
  const totalFaculty = records.length;
  const overallAvgPct = totalFaculty > 0
    ? Math.round(
        (records.reduce((sum: number, r: any) => sum + (parseFloat(r.attendancePercentage || r.percentage || "0")), 0) / totalFaculty) * 10
      ) / 10
    : 0;

  const totalPresentDays = records.reduce((sum: number, r: any) => sum + (parseInt(r.presentDays || r.present_days || "0", 10)), 0);
  const totalAbsentDays = records.reduce((sum: number, r: any) => sum + (parseInt(r.absentDays || r.absent_days || "0", 10)), 0);
  const totalLeaves = records.reduce((sum: number, r: any) => sum + (parseInt(r.leaveDays || r.leave_days || "0", 10)), 0);

  // Export to Excel handler (Multi-sheet workbook: Summary, Daily Matrix, Department Stats)
  const handleExportExcel = () => {
    if (!records.length) {
      toast.error("No records to export.");
      return;
    }

    try {
      const daysInMonth = new Date(year, month, 0).getDate();
      exportToExcelWorkbook(records, monthName, year, daysInMonth);
      toast.success(`Exported complete multi-sheet report for ${records.length} faculty.`);
    } catch (err: any) {
      toast.error("Export failed: " + String(err?.message || err));
    }
  };

  if (error || (!isLoading && records.length === 0)) {
    return (
      <AppShell
        roles={["admin"]}
        title={`Reports · ${monthName} ${year}`}
        subtitle="No attendance sheet found for this period"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/reports">
              <ArrowLeft className="mr-1.5 size-3.5" /> All Reports
            </Link>
          </Button>
        }
      >
        <div className="surface-panel p-12 text-center">
          <AlertCircle className="mx-auto size-10 text-muted-foreground/50" />
          <h2 className="mt-3 text-base font-semibold">No attendance sheet for {monthName} {year}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No biometric attendance sheet has been imported for this period yet.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" asChild>
              <Link to="/reports">View Available Reports</Link>
            </Button>
            <Button asChild>
              <Link to="/import">Import Biometric Sheet</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      roles={["admin"]}
      title={`Reports · ${monthName} ${year}`}
      subtitle={`${totalFaculty} faculty records · ${workingDays} working days · Source: ${fileName}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/reports">
              <ArrowLeft className="mr-1.5 size-3.5" /> All Reports
            </Link>
          </Button>

          {availableMonths.length > 1 ? (
            <Select
              value={`${month}-${year}`}
              onValueChange={(val) => {
                const [m, y] = val.split("-");
                if (m && y) void navigate({ to: `/reports/${m}/${y}` });
              }}
            >
              <SelectTrigger className="h-8 w-36 text-xs bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((am: any) => (
                  <SelectItem key={`${am.month}-${am.year}`} value={`${am.month}-${am.year}`}>
                    {MONTH_NAMES[am.month - 1]} {am.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <Button size="sm" variant="outline" onClick={handleExportExcel}>
            <Download className="mr-1.5 size-3.5" /> Export Excel
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Top Metric Stat Cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Faculty"
            value={totalFaculty}
            hint="Enrolled in sheet"
            icon={Users}
          />
          <StatCard
            label="Official Working Days"
            value={`${workingDays} Days`}
            hint="Calendar synced"
            icon={Calendar}
          />
          <StatCard
            label="Average Attendance"
            value={`${overallAvgPct}%`}
            hint={`${departments.length} departments`}
            icon={BarChart3}
          />
          <StatCard
            label="Cumulative Attendance"
            value={`${totalPresentDays} P / ${totalAbsentDays} A`}
            hint={`${totalLeaves} leaves recorded`}
            icon={CheckCircle2}
          />
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="flex border-b border-border text-sm font-medium">
          <button
            onClick={() => setActiveTab("summary")}
            className={`border-b-2 px-4 py-2.5 transition-colors ${
              activeTab === "summary"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Faculty Summary ({filteredRecords.length})
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={`border-b-2 px-4 py-2.5 transition-colors ${
              activeTab === "departments"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Department Breakdown ({departments.length})
          </button>
        </div>

        {/* ── Tab Content: Faculty Summary ── */}
        {activeTab === "summary" ? (
          <section className="surface-panel overflow-hidden">
            {/* Filters Bar */}
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, CFMS ID, department…"
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="h-8 w-36 text-xs bg-card">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.department} value={d.department}>
                        {d.department} ({d.total})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCadre} onValueChange={setSelectedCadre}>
                  <SelectTrigger className="h-8 w-28 text-xs bg-card">
                    <SelectValue placeholder="Cadre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cadres</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Faculty Table */}
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
                  {filteredRecords.map((r: any, idx: number) => {
                    const pct = parseFloat(r.attendancePercentage || r.percentage || "0");
                    const isHigh = pct >= 90;
                    const isLow = pct < 75;
                    const pDays = r.presentDays || r.present_days || 0;
                    const wDays = r.totalWorkingDays || r.total_working_days || workingDays;

                    return (
                      <tr key={idx} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-2 font-mono text-muted-foreground">{r.cfmsId || r.cfms_id || "—"}</td>
                        <td className="px-4 py-2">
                          <p className="font-medium text-foreground">{r.name}</p>
                          {r.email ? <p className="text-[10px] text-muted-foreground">{r.email}</p> : null}
                        </td>
                        <td className="px-4 py-2 font-medium text-foreground">{r.department || "General"}</td>
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
                        <td className="px-4 py-2 text-right">
                          <span
                            className={`font-mono text-xs font-bold ${
                              isHigh
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isLow
                                ? "text-rose-500"
                                : "text-foreground"
                            }`}
                          >
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
              <span>Showing {filteredRecords.length} of {records.length} faculty members</span>
              <span>Total Working Days: <strong>{workingDays}</strong></span>
            </div>
          </section>
        ) : null}

        {/* ── Tab Content: Department Breakdown ── */}
        {activeTab === "departments" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => (
              <div key={d.department} className="surface-panel p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-accent" />
                      <h3 className="font-semibold text-foreground">{d.department}</h3>
                    </div>
                    <span className="font-mono text-sm font-bold text-foreground">{d.avgPct}%</span>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.total} Faculty ({d.regularCount} Regular · {d.contractCount} Contract)
                  </p>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, Math.max(0, d.avgPct))}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                  <span>Working Days: {workingDays}</span>
                  <button
                    onClick={() => {
                      setSelectedDept(d.department);
                      setActiveTab("summary");
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    View Faculty ({d.total}) →
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
