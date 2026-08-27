import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  UploadCloud,
  Search,
  Calendar,
  Building2,
  Users,
  Download,
  Table2,
  ListFilter,
  CheckCircle2,
  Briefcase,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
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

export const Route = createFileRoute("/detailed")({
  head: () => ({
    meta: [
      { title: "Attendance — e-Office Jntugv" },
      {
        name: "description",
        content: "Manage faculty attendance data with Summary and Day-by-Day Daily views.",
      },
    ],
  }),
  component: AttendancePage,
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const cellStyle: Record<string, string> = {
  P: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold",
  A: "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold",
  L: "bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold",
  H: "bg-muted text-muted-foreground font-medium",
  HD: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold",
  Late: "bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold",
};

function AttendancePage() {
  const { data: monthsData, isLoading: monthsLoading } = useQuery(attendanceMonthsQuery());
  const availableMonths = monthsData?.months || [];

  const defaultMonth = availableMonths[0]?.month || 1;
  const defaultYear = availableMonths[0]?.year || 2025;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  // Tab State: "summary" | "daily"
  const [viewMode, setViewMode] = useState<"summary" | "daily">("summary");

  const { data: attendanceData, isLoading: recordsLoading } = useQuery(
    monthlyAttendanceQuery(selectedMonth, selectedYear)
  );

  const records = attendanceData?.records || [];
  const workingDays = attendanceData?.sheet?.workingDays || attendanceData?.workingDays || 27;
  const monthName = MONTH_NAMES[selectedMonth - 1] || "Monthly";

  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedCadre, setSelectedCadre] = useState("all");

  // Departments list for filter
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r: any) => {
      if (r.department) set.add(r.department);
    });
    return Array.from(set).sort();
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r: any) => {
      const matchSearch =
        search === "" ||
        (r.name && r.name.toLowerCase().includes(search.toLowerCase())) ||
        (r.cfmsId && String(r.cfmsId).includes(search)) ||
        (r.cfms_id && String(r.cfms_id).includes(search)) ||
        (r.department && r.department.toLowerCase().includes(search.toLowerCase())) ||
        (r.designation && r.designation.toLowerCase().includes(search.toLowerCase()));

      const matchDept = selectedDept === "all" || r.department === selectedDept;
      const matchCadre =
        selectedCadre === "all" ||
        (selectedCadre === "regular" && (r.jobStatus || r.job_status || "").toLowerCase() === "regular") ||
        (selectedCadre === "contract" && (r.jobStatus || r.job_status || "").toLowerCase().includes("contract"));

      return matchSearch && matchDept && matchCadre;
    });
  }, [records, search, selectedDept, selectedCadre]);

  // Extract day list (1..31 or dates from dailyRecords)
  const totalDaysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const dayNumbers = useMemo(() => {
    const list: number[] = [];
    for (let i = 1; i <= totalDaysInMonth; i++) {
      list.push(i);
    }
    return list;
  }, [totalDaysInMonth]);

  // High level KPIs
  const totalFaculty = records.length;
  const avgAttendance = useMemo(() => {
    if (!records.length) return 0;
    const sum = records.reduce((acc: number, r: any) => acc + (parseFloat(r.attendancePercentage || r.percentage || 0) || 0), 0);
    return Math.round((sum / records.length) * 10) / 10;
  }, [records]);

  const handleExportExcel = async () => {
    if (!filteredRecords.length) {
      toast.error("No records to export.");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      let rows: any[];

      if (viewMode === "daily") {
        rows = filteredRecords.map((r: any, idx: number) => {
          const daily = Array.isArray(r.attendance)
            ? r.attendance
            : Array.isArray(r.dailyRecords)
            ? r.dailyRecords
            : Array.isArray(r.daily_records)
            ? r.daily_records
            : [];

          const rowObj: Record<string, any> = {
            "S.No": idx + 1,
            "CFMS ID": r.cfmsId || r.cfms_id || "",
            "Faculty Name": r.name || "",
            "Department": r.department || "",
            "Designation": r.designation || "",
            "Cadre": r.jobStatus || r.job_status || "Regular",
          };

          dayNumbers.forEach((dayNum) => {
            const dayPad = String(dayNum).padStart(2, "0");
            const rec = daily[dayNum - 1] || daily.find((d: any) => String(d?.date).endsWith(`-${dayPad}`));
            rowObj[`Day ${dayNum}`] = rec?.status || "—";
          });

          rowObj["Present"] = r.presentDays || r.present_days || 0;
          rowObj["Absent"] = r.absentDays || r.absent_days || 0;
          rowObj["Leaves"] = r.leaveDays || r.leave_days || 0;
          rowObj["Working Days"] = r.totalWorkingDays || r.total_working_days || workingDays;
          rowObj["Attendance %"] = `${r.attendancePercentage || r.percentage || 0}%`;

          return rowObj;
        });
      } else {
        rows = filteredRecords.map((r: any, idx: number) => ({
          "S.No": idx + 1,
          "CFMS ID": r.cfmsId || r.cfms_id || "",
          "Faculty Name": r.name || "",
          "Department": r.department || "",
          "Designation": r.designation || "",
          "Cadre": r.jobStatus || r.job_status || "Regular",
          "Present": r.presentDays || r.present_days || 0,
          "Absent": r.absentDays || r.absent_days || 0,
          "Leaves": r.leaveDays || r.leave_days || 0,
          "Working Days": r.totalWorkingDays || r.total_working_days || workingDays,
          "Attendance %": `${r.attendancePercentage || r.percentage || 0}%`,
        }));
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${viewMode === "daily" ? "Daily" : "Summary"}_${monthName}_${selectedYear}`);
      XLSX.writeFile(wb, `Attendance_${viewMode === "daily" ? "Daily" : "Summary"}_${monthName}_${selectedYear}.xlsx`);
      toast.success(`Exported ${filteredRecords.length} records to Excel.`);
    } catch (e) {
      toast.error("Export failed: " + String(e));
    }
  };

  if (availableMonths.length === 0 && !monthsLoading) {
    return (
      <AppShell
        roles={["admin"]}
        title="Attendance"
        subtitle="No attendance data loaded"
      >
        <div className="surface-panel flex flex-col items-center gap-4 p-16 text-center">
          <UploadCloud className="size-12 text-muted-foreground/40" strokeWidth={1} />
          <h2 className="text-lg font-semibold">No attendance sheets imported yet</h2>
          <p className="text-sm text-muted-foreground">
            Upload a monthly biometric sheet to view attendance summary and daily records.
          </p>
          <Button asChild className="mt-4">
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
      title="Attendance"
      subtitle={`Monthly attendance records · ${monthName} ${selectedYear} (${records.length} faculty enrolled, ${workingDays} working days)`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Chooser Dropdown */}
          <Select
            value={`${selectedMonth}-${selectedYear}`}
            onValueChange={(val) => {
              const [m, y] = val.split("-").map(Number);
              setSelectedMonth(m);
              setSelectedYear(y);
            }}
          >
            <SelectTrigger className="h-9 w-44 font-semibold text-xs">
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

          {/* Export Excel Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-1.5"
            disabled={recordsLoading || filteredRecords.length === 0}
          >
            <Download className="size-3.5" /> Export Excel
          </Button>

          {/* Import Link */}
          <Button size="sm" asChild className="gap-1.5">
            <Link to="/import">
              <UploadCloud className="size-3.5" /> Import Data
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Summary Metric Strip ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="surface-panel p-4 flex items-center justify-between">
            <div>
              <p className="label-caps">Total Faculty</p>
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">{totalFaculty}</p>
              <p className="text-[11px] text-muted-foreground">{monthName} {selectedYear}</p>
            </div>
            <Users className="size-6 text-primary/80" />
          </div>

          <div className="surface-panel p-4 flex items-center justify-between">
            <div>
              <p className="label-caps">Working Days</p>
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">{workingDays}</p>
              <p className="text-[11px] text-muted-foreground">Synchronized with calendar</p>
            </div>
            <Calendar className="size-6 text-amber-500/80" />
          </div>

          <div className="surface-panel p-4 flex items-center justify-between">
            <div>
              <p className="label-caps">Average Attendance</p>
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">{avgAttendance}%</p>
              <p className="text-[11px] text-muted-foreground">College-wide rate</p>
            </div>
            <CheckCircle2 className="size-6 text-emerald-500/80" />
          </div>

          <div className="surface-panel p-4 flex items-center justify-between">
            <div>
              <p className="label-caps">Departments</p>
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">{departmentsList.length}</p>
              <p className="text-[11px] text-muted-foreground">Active in reporting</p>
            </div>
            <Building2 className="size-6 text-indigo-500/80" />
          </div>
        </div>

        {/* ── View Mode Tabs & Filter Bar ── */}
        <div className="surface-panel p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            {/* Segmented View Switcher: Summary vs Daily View */}
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setViewMode("summary")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "summary"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ListFilter className="size-3.5" /> Summary View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("daily")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "daily"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Table2 className="size-3.5" /> Daily View (Day 1..{totalDaysInMonth})
              </button>
            </div>

            <div className="text-xs text-muted-foreground font-mono">
              Showing <span className="font-bold text-foreground">{filteredRecords.length}</span> of {records.length} records
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search faculty name, CFMS ID, designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="h-9 text-xs">
                <Building2 className="mr-1.5 size-3.5 text-muted-foreground" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments ({departmentsList.length})</SelectItem>
                {departmentsList.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCadre} onValueChange={setSelectedCadre}>
              <SelectTrigger className="h-9 text-xs">
                <Briefcase className="mr-1.5 size-3.5 text-muted-foreground" />
                <SelectValue placeholder="Cadre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cadres</SelectItem>
                <SelectItem value="regular">Regular Faculty</SelectItem>
                <SelectItem value="contract">Contract / Adjunct</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Table Container ── */}
        <div className="surface-panel overflow-hidden">
          {recordsLoading ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              Loading attendance records…
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No matching records found.
            </div>
          ) : viewMode === "summary" ? (
            /* ── VIEW 1: SUMMARY TABLE ── */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="border-b border-border bg-muted/30 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">CFMS ID</th>
                    <th className="py-3 px-4">Faculty Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4 text-center">Cadre</th>
                    <th className="py-3 px-3 text-center">Present</th>
                    <th className="py-3 px-3 text-center">Absent</th>
                    <th className="py-3 px-3 text-center">Leaves</th>
                    <th className="py-3 px-3 text-center">Working</th>
                    <th className="py-3 px-4 text-right">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRecords.map((r: any, idx: number) => {
                    const pct = parseFloat(r.attendancePercentage || r.percentage || 0);
                    const isLow = pct < 75;
                    const isRegular = (r.jobStatus || r.job_status || "").toLowerCase() === "regular";

                    return (
                      <tr key={r.id || r.cfmsId || idx} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-medium text-foreground">{r.cfmsId || r.cfms_id || "—"}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{r.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{r.email || ""}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">{r.department || "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground">{r.designation || "—"}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isRegular
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {r.jobStatus || r.job_status || "Regular"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {r.presentDays || r.present_days || 0}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                          {r.absentDays || r.absent_days || 0}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-medium text-amber-600 dark:text-amber-400">
                          {r.leaveDays || r.leave_days || 0}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-muted-foreground">
                          {r.totalWorkingDays || r.total_working_days || workingDays}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              isLow
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
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
          ) : (
            /* ── VIEW 2: DAY-BY-DAY ATTENDANCE GRID ── */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="border-b border-border bg-muted/30 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center sticky left-0 bg-card z-10">#</th>
                    <th className="py-3 px-4 min-w-[200px] sticky left-10 bg-card z-10 border-r border-border">
                      Faculty / Cadre
                    </th>
                    {dayNumbers.map((d) => (
                      <th key={d} className="py-2.5 px-1.5 text-center min-w-[28px] font-mono">
                        {d}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center border-l border-border bg-card sticky right-16">P</th>
                    <th className="py-3 px-3 text-center bg-card sticky right-8">A</th>
                    <th className="py-3 px-3 text-right bg-card sticky right-0 font-bold">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRecords.map((r: any, idx: number) => {
                    const daily = Array.isArray(r.attendance)
                      ? r.attendance
                      : Array.isArray(r.dailyRecords)
                      ? r.dailyRecords
                      : Array.isArray(r.daily_records)
                      ? r.daily_records
                      : [];

                    const pct = parseFloat(r.attendancePercentage || r.percentage || 0);

                    return (
                      <tr key={r.id || r.cfmsId || idx} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono text-muted-foreground sticky left-0 bg-card z-10">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 sticky left-10 bg-card z-10 border-r border-border">
                          <div className="font-semibold text-foreground truncate">{r.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {r.department} · {r.jobStatus || r.job_status || "Regular"}
                          </div>
                        </td>

                        {dayNumbers.map((dayNum) => {
                          const dayPad = String(dayNum).padStart(2, "0");
                          const rec = daily[dayNum - 1] || daily.find((d: any) => String(d?.date).endsWith(`-${dayPad}`));
                          const status = rec?.status || "—";
                          const badge = cellStyle[status] || "bg-muted/30 text-muted-foreground";

                          return (
                            <td key={dayNum} className="py-2 px-1 text-center font-mono">
                              <span className={`inline-flex size-6 items-center justify-center rounded text-[11px] ${badge}`}>
                                {status}
                              </span>
                            </td>
                          );
                        })}

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 border-l border-border bg-card sticky right-16">
                          {r.presentDays || r.present_days || 0}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600 dark:text-rose-400 bg-card sticky right-8">
                          {r.absentDays || r.absent_days || 0}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold bg-card sticky right-0">
                          <span className={pct < 75 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
