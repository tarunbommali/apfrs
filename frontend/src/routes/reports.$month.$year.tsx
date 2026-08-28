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
  Eye,
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
import { toast } from "sonner";
import { MONTH_NAMES } from "@/lib/constants";
import { getAttendancePct, tierTextClassFromPct } from "@/lib/attendance-utils";
import { exportAttendanceExcel } from "@/lib/export/exportAttendanceExcel";

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

  const [previewCfmsId, setPreviewCfmsId] = useState<string | null>(null);

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
      const totalPct = list.reduce((sum: number, r: any) => sum + getAttendancePct(r), 0);
      const avgPct = total > 0 ? Math.round((totalPct / total) * 10) / 10 : 0;
      const regularCount = list.filter((r: any) => getJobStatus(r).toLowerCase() === "regular").length;
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
      const cadre = getJobStatus(r).toLowerCase();
      const matchCadre =
        selectedCadre === "all" ||
        (selectedCadre === "regular" && cadre === "regular") ||
        (selectedCadre === "contract" && cadre.includes("contract"));

      return matchSearch && matchDept && matchCadre;
    });
  }, [records, search, selectedDept, selectedCadre]);

  // Overall metrics
  const totalFaculty = records.length;
  const overallAvgPct = totalFaculty > 0
    ? Math.round(
        (records.reduce((sum: number, r: any) => sum + getAttendancePct(r), 0) / totalFaculty) * 10
      ) / 10
    : 0;

  const totalPresentDays = records.reduce((sum: number, r: any) => sum + getPresentDays(r), 0);
  const totalAbsentDays = records.reduce((sum: number, r: any) => sum + getAbsentDays(r), 0);
  const totalLeaves = records.reduce((sum: number, r: any) => sum + getLeaveDays(r), 0);

  // Export to Excel handler
  const handleExportExcel = () => {
    exportAttendanceExcel(records, month, year, { fallbackWorkingDays: workingDays })
      .then((count) => toast.success(`Exported complete report for ${count} faculty.`))
      .catch((e) => toast.error("Export failed: " + String(e.message ?? e)));
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
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRecords.map((r: any, idx: number) => {
                    const pct = getAttendancePct(r);
                    const pDays = getPresentDays(r);
                    const wDays = getWorkingDays(r, workingDays);

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
                            className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold border ${
                              getJobStatus(r).toLowerCase() === "regular"
                                ? "bg-[var(--badge-accent-bg)] text-[var(--badge-accent-fg)] border-[rgba(94,106,210,0.2)]"
                                : "bg-[var(--badge-muted-bg)] text-[var(--badge-muted-fg)] border-[rgba(255,255,255,0.08)]"
                            }`}
                          >
                            {getJobStatus(r).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center font-mono font-semibold text-foreground">
                          <span className="text-[var(--status-present-fg)]">{pDays}</span>
                          <span className="text-muted-foreground"> / {wDays}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-[var(--status-present-fg)]">
                          {pDays}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                          {getAbsentDays(r)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                          {getLeaveDays(r)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                          {r.halfDays || r.half_days || 0}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={`font-mono text-xs font-bold ${tierTextClassFromPct(pct)}`}
                          >
                            {pct}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setPreviewCfmsId(r.cfmsId || r.cfms_id)}
                              title="Preview Report"
                              className="size-6 text-muted-foreground hover:text-indigo-400"
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => window.open(`/api/admin/attendance/report/consolidated/pdf?month=${month}&year=${year}&cfmsIds=${r.cfmsId || r.cfms_id}`, '_blank')}
                              title="Download PDF"
                              className="size-6 text-muted-foreground hover:text-indigo-400"
                            >
                              <Download className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {previewCfmsId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-[#12121a] border border-white/10 w-full max-w-4xl h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-white/10 p-4 bg-[#1a1a25]">
                    <div>
                      <h3 className="font-bold text-sm text-[#e8e8ed]">Report Preview</h3>
                      <p className="text-[11px] text-white/50">Month: {monthName} {year} · CFMS ID: {previewCfmsId}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setPreviewCfmsId(null)} className="text-white/60 hover:text-white">
                      Close
                    </Button>
                  </div>
                  <div className="flex-1 bg-white p-2">
                    <iframe
                      src={`/api/admin/attendance/report/${previewCfmsId}/preview?month=${month}&year=${year}`}
                      className="w-full h-full border-0 rounded"
                      title="Attendance Statement Preview"
                    />
                  </div>
                </div>
              </div>
            )}

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
