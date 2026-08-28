// frontend/src/routes/reports.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Table2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  attendanceMonthsQuery,
  monthlyAttendanceQuery,
  departmentsQuery,
} from "@/lib/queries";
import { toast } from "sonner";
import { MONTH_NAMES } from "@/lib/constants";
import { useMonthYearSelector } from "@/hooks/useMonthYearSelector";
import { getAttendancePct } from "@/lib/attendance-utils";
import { exportAttendanceExcel } from "@/lib/export/exportAttendanceExcel";

// Import split components
import { StatementOverview } from "./-reports/StatementOverview";
import { StatementList } from "./-reports/StatementList";

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

function ReportsArchivePage() {
  // ── Queries ──
  const { data: monthsData, isLoading: monthsLoading } = useQuery(attendanceMonthsQuery());
  const availableMonths = monthsData?.months || [];

  const defaultMonth = availableMonths[0]?.month || 1;
  const defaultYear = availableMonths[0]?.year || 2025;

  const { month: selectedMonth, year: selectedYear, setMonth: setSelectedMonth, setYear: setSelectedYear } =
    useMonthYearSelector(defaultMonth, defaultYear);

  useEffect(() => {
    if (availableMonths.length > 0) {
      setSelectedMonth(availableMonths[0].month);
      setSelectedYear(availableMonths[0].year);
    }
  }, [availableMonths, setSelectedMonth, setSelectedYear]);

  // ── Attendance Query ──
  const { data: activeAttendance } = useQuery(
    monthlyAttendanceQuery(selectedMonth, selectedYear)
  );

  // ── Departments Query ──
  const { data: deptsData } = useQuery(departmentsQuery());
  const dbDepartments = deptsData?.departments || [];
  const registeredCodes = useMemo(() => new Set(dbDepartments.map((d) => d.code.toUpperCase())), [dbDepartments]);

  const activeRecords = activeAttendance?.records || [];
  const activeWorkingDays = activeAttendance?.sheet?.workingDays || activeAttendance?.workingDays || 27;
  const activeMonthName = MONTH_NAMES[selectedMonth - 1] || "Monthly";

  // ── Department Statistics ──
  const departmentStats = useMemo(() => {
    const deptsMap: Record<string, { totalPct: number; count: number; name: string }> = {};
    activeRecords.forEach((r: any) => {
      const dept = r.department || "General";
      if (!registeredCodes.has(dept.toUpperCase())) return;

      const pct = getAttendancePct(r);
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

  // ── Handlers ──
  const handleSelectMonth = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const handleExportExcel = (m: number, y: number) => {
    // In a real application, you'd fetch the specific month's records before exporting,
    // but here we align to the selected activeRecords array.
    exportAttendanceExcel(activeRecords, m, y, { 
      fallbackWorkingDays: activeWorkingDays, 
      sheetLabel: "Official" 
    })
      .then((count) => toast.success(`Exported ${count} faculty attendance records to Excel.`))
      .catch((e) => toast.error("Export failed: " + String(e.message ?? e)));
  };

  const handleExportSelected = () => {
    if (activeRecords.length === 0) {
      toast.error("No records to export.");
      return;
    }
    handleExportExcel(selectedMonth, selectedYear);
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
            onClick={handleExportSelected}
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
        {/* Statement Overview */}
        <StatementOverview
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={handleSelectMonth}
          availableMonths={availableMonths}
          records={activeRecords}
          workingDays={activeWorkingDays}
          departmentStats={departmentStats}
          activeMonthName={activeMonthName}
        />

        {/* Available Monthly Statements */}
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

          <StatementList
            availableMonths={availableMonths}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onSelect={handleSelectMonth}
            onExport={handleExportExcel}
            isLoading={monthsLoading}
          />
        </section>
      </div>
    </AppShell>
  );
}

export default ReportsArchivePage;
