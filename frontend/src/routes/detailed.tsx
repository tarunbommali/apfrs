import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  UploadCloud,
  Search,
  Filter,
  Calendar,
  Building2,
  CheckCircle2,
  Users,
  Download,
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
      { title: "Day-by-Day Detailed Attendance — e-Office Jntugv" },
      {
        name: "description",
        content: "Filterable day-by-day attendance matrix with faculty search, department filtering, cadre selection, and holiday indicators.",
      },
    ],
  }),
  component: DetailedViewRoute,
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

function DetailedViewRoute() {
  return (
    <Suspense fallback={<DetailedSkeleton />}>
      <DetailedViewPage />
    </Suspense>
  );
}

function DetailedSkeleton() {
  return (
    <AppShell title="Detailed View" subtitle="Loading day-by-day attendance grid…">
      <div className="space-y-6">
        <div className="surface-panel h-96 animate-pulse" />
      </div>
    </AppShell>
  );
}

function DetailedViewPage() {
  const { data: monthsData, isLoading: monthsLoading } = useQuery(attendanceMonthsQuery());
  const availableMonths = monthsData?.months || [];

  const defaultMonth = availableMonths[0]?.month || 1;
  const defaultYear = availableMonths[0]?.year || 2025;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);

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
        (r.cfmsId && r.cfmsId.includes(search)) ||
        (r.cfms_id && r.cfms_id.includes(search)) ||
        (r.department && r.department.toLowerCase().includes(search.toLowerCase())) ||
        (r.designation && r.designation.toLowerCase().includes(search.toLowerCase()));

      const matchDept = selectedDept === "all" || r.department === selectedDept;
      const matchCadre =
        selectedCadre === "all" ||
        (selectedCadre === "regular" && (r.jobStatus || r.job_status || "").toLowerCase() === "regular") ||
        (selectedCadre === "contract" && (r.jobStatus || r.job_status || "").toLowerCase() === "contract");

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

  const handleExportExcel = async () => {
    if (!filteredRecords.length) {
      toast.error("No records to export.");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const rows = filteredRecords.map((r: any, idx: number) => {
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

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Detailed_${monthName}_${selectedYear}`);
      XLSX.writeFile(wb, `Detailed_Attendance_${monthName}_${selectedYear}.xlsx`);
      toast.success(`Exported ${filteredRecords.length} records to Excel.`);
    } catch (e) {
      toast.error("Export failed: " + String(e));
    }
  };

  if (availableMonths.length === 0 && !monthsLoading) {
    return (
      <AppShell
        roles={["admin"]}
        title="Detailed View"
        subtitle="No attendance data loaded"
      >
        <div className="surface-panel flex flex-col items-center gap-4 p-16 text-center">
          <UploadCloud className="size-12 text-muted-foreground/40" strokeWidth={1} />
          <h2 className="text-lg font-semibold">No attendance sheets imported yet</h2>
          <p className="text-sm text-muted-foreground">
            Upload a monthly biometric sheet to view the day-by-day attendance grid.
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
      title="Detailed View"
      subtitle={`Day-by-day biometric attendance grid · ${monthName} ${selectedYear} (${records.length} enrolled, ${workingDays} working days)`}
      actions={
        <div className="flex items-center gap-2">
          {/* Month Chooser Dropdown */}
          <Select
            value={`${selectedMonth}-${selectedYear}`}
            onValueChange={(val) => {
              const [m, y] = val.split("-");
              if (m && y) {
                setSelectedMonth(parseInt(m, 10));
                setSelectedYear(parseInt(y, 10));
              }
            }}
          >
            <SelectTrigger className="h-8 w-44 text-xs bg-card">
              <Calendar className="mr-1.5 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((am: any) => (
                <SelectItem key={`${am.month}-${am.year}`} value={`${am.month}-${am.year}`}>
                  {MONTH_NAMES[am.month - 1]} {am.year} ({am.total_faculty || am.totalFaculty} faculty)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" variant="outline" onClick={handleExportExcel}>
            <Download className="mr-1.5 size-3.5" /> Export Grid
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Legend Banner ── */}
        <div className="surface-panel flex flex-wrap items-center justify-between gap-4 p-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-foreground">Status Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex size-5 items-center justify-center rounded bg-emerald-500/15 font-bold text-emerald-600 dark:text-emerald-400">P</span>
              Present
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex size-5 items-center justify-center rounded bg-rose-500/15 font-bold text-rose-600 dark:text-rose-400">A</span>
              Absent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex size-5 items-center justify-center rounded bg-amber-500/20 font-bold text-amber-600 dark:text-amber-400">L</span>
              Leave
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex size-5 items-center justify-center rounded bg-muted font-semibold text-muted-foreground">H</span>
              Holiday / Sunday
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex size-5 items-center justify-center rounded bg-indigo-500/15 font-bold text-indigo-600 dark:text-indigo-400">HD</span>
              Half-Day
            </span>
          </div>

          <div className="font-mono text-xs text-muted-foreground">
            Official Working Days: <strong className="text-foreground">{workingDays}</strong>
          </div>
        </div>

        {/* ── Main Grid Panel ── */}
        <section className="surface-panel overflow-hidden">
          {/* Controls Bar: Search, Department Filter, Cadre Filter, Month Chooser */}
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search faculty name, CFMS ID, designation…"
                className="h-8 pl-8 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
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

              <Select value={selectedCadre} onValueChange={setSelectedCadre}>
                <SelectTrigger className="h-8 w-32 text-xs bg-card">
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

          {/* Matrix Table */}
          <div className="relative isolate overflow-x-auto w-full">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-border bg-muted/60 font-medium text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-10 min-w-[200px] border-r border-border bg-muted px-4 py-2.5 font-medium text-foreground">
                    Faculty Member
                  </th>
                  <th className="min-w-[70px] border-r border-border px-2 py-2.5 text-center">
                    Cadre
                  </th>
                  {dayNumbers.map((day) => {
                    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isSunday = new Date(dateStr).getDay() === 0;

                    return (
                      <th
                        key={day}
                        className={`min-w-[32px] border-r border-border/60 px-1.5 py-2 text-center font-mono ${
                          isSunday ? "bg-muted text-muted-foreground" : "text-foreground"
                        }`}
                        title={dateStr}
                      >
                        {day}
                      </th>
                    );
                  })}
                  <th className="min-w-[90px] border-l border-border px-3 py-2.5 text-center">
                    P / Working
                  </th>
                  <th className="min-w-[70px] px-3 py-2.5 text-right">
                    %
                  </th>
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

                  const pDays = r.presentDays || r.present_days || 0;
                  const wDays = r.totalWorkingDays || r.total_working_days || workingDays;
                  const pct = parseFloat(r.attendancePercentage || r.percentage || "0");

                  return (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      {/* Sticky Faculty Info */}
                      <td className="sticky left-0 z-10 border-r border-border bg-card px-4 py-2">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{r.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {r.cfmsId || r.cfms_id || "—"} · {r.department || "General"}
                          </span>
                        </div>
                      </td>

                      {/* Cadre */}
                      <td className="border-r border-border px-2 py-2 text-center">
                        <span
                          className={`rounded-sm px-1 py-0.5 text-[9px] font-bold ${
                            (r.jobStatus || r.job_status || "").toLowerCase() === "regular"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {(r.jobStatus || r.job_status || "REG").slice(0, 3).toUpperCase()}
                        </span>
                      </td>

                      {/* Day Status Badges */}
                      {dayNumbers.map((dayNum) => {
                        const dayPad = String(dayNum).padStart(2, "0");
                        const dayRec = daily[dayNum - 1] || daily.find((d: any) => String(d?.date).endsWith(`-${dayPad}`));
                        const status = dayRec?.status || "A";
                        const inTime = dayRec?.inTime || "";
                        const outTime = dayRec?.outTime || "";
                        const timingTooltip = inTime || outTime ? `In: ${inTime || "—"} | Out: ${outTime || "—"}` : `Day ${dayNum}: ${status}`;

                        return (
                          <td
                            key={dayNum}
                            className="border-r border-border/40 p-1 text-center font-mono"
                            title={timingTooltip}
                          >
                            <span
                              className={`inline-flex size-6 items-center justify-center rounded text-[11px] ${
                                cellStyle[status] || cellStyle.A
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                        );
                      })}

                      {/* Summary P / Working */}
                      <td className="border-l border-border px-3 py-2 text-center font-mono font-semibold">
                        <span className="text-emerald-600 dark:text-emerald-400">{pDays}</span>
                        <span className="text-muted-foreground"> / {wDays}</span>
                      </td>

                      {/* % */}
                      <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>Showing {filteredRecords.length} of {records.length} faculty members</span>
            <span>Month: <strong>{monthName} {selectedYear}</strong></span>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
