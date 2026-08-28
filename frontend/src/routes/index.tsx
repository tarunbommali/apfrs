// frontend/src/routes/index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";
import { Calendar, AlertTriangle, Send, Table2, ArrowRight } from "lucide-react";
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
  batchesQuery,
  departmentsQuery,
} from "@/lib/queries";
import { calculateOverallStats } from "@/lib/attendance-helpers";
import { MONTH_NAMES } from "@/lib/constants";
import { getAttendancePct } from "@/lib/attendance-utils";
import { useMonthYearSelector } from "@/hooks/useMonthYearSelector";

// Import split components
import { DashboardSkeleton } from "./-dashboard/DashboardSkeleton";
import { KPIMetrics } from "./-dashboard/KPIMetrics";
import { AttendanceBreakdown } from "./-dashboard/AttendanceBreakdown";
import { AttentionList } from "./-dashboard/AttentionList";
import { RecentActivity } from "./-dashboard/RecentActivity";
import { StoredReportsList } from "./-dashboard/StoredReportsList";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — e-Office Jntugv" },
      {
        name: "description",
        content: "High-level monthly attendance summary, KPI metrics, and alert monitoring for e-Office Jntugv.",
      },
    ],
  }),
  component: DashboardPage,
});

interface AttendanceRecord {
  id?: string;
  cfmsId?: string;
  cfms_id?: string;
  name: string;
  department?: string;
  designation?: string;
  presentDays?: number;
  present_days?: number;
  absentDays?: number;
  absent_days?: number;
  leaveDays?: number;
  leave_days?: number;
  [key: string]: any;
}

function DashboardPage() {
  // Query available months in MySQL
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

  // Fetch monthly attendance from MySQL
  const { data: attendanceData } = useQuery(
    monthlyAttendanceQuery(selectedMonth, selectedYear)
  );

  const { data: deptsData } = useQuery(departmentsQuery());
  const dbDepartments = deptsData?.departments || [];

  // Fetch recent batches
  const { data: batchesData } = useQuery(batchesQuery({ limit: 5 }));
  const recentBatches = batchesData?.batches || [];

  const records = attendanceData?.records || [];
  const workingDays = attendanceData?.sheet?.workingDays || attendanceData?.workingDays || 27;
  const monthName = MONTH_NAMES[selectedMonth - 1] || "January";

  // Compute overall stats
  const overallStats = useMemo(() => {
    return calculateOverallStats(records, workingDays);
  }, [records, workingDays]);

  // Department counts
  const departmentCount = dbDepartments.length;

  const belowThresholdCount = useMemo(() => {
    return records.filter((r: AttendanceRecord) => getAttendancePct(r) < 75).length;
  }, [records]);

  if (monthsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle={`Attendance overview and operational status · ${monthName} ${selectedYear}`}
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

          <Button size="sm" asChild className="gap-1.5">
            <Link to="/detailed">
              <Table2 className="size-3.5" /> Attendance Data
            </Link>
          </Button>

          <Button size="sm" variant="outline" asChild className="gap-1.5">
            <Link to="/consolidated">
              <Send className="size-3.5" /> Dispatch
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Metrics Summary Strip */}
        <KPIMetrics
          facultyCount={records.length}
          departmentCount={departmentCount}
          workingDays={workingDays}
          avgAttendance={overallStats.avgAttendance}
          monthName={monthName}
        />

        {/* Attendance Summary & Breakdown */}
        <AttendanceBreakdown
          totalPresent={overallStats.totalPresent}
          totalAbsent={overallStats.totalAbsent}
          totalLeave={overallStats.totalLeave}
          avgAttendance={overallStats.avgAttendance}
          workingDays={workingDays}
          monthName={monthName}
          year={selectedYear}
        />

        {/* Two Column Layout: Attention Required & Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Attention Required Card */}
          <section className="surface-panel p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-rose-500" />
                <h2 className="text-base font-semibold text-foreground">Attention Required</h2>
              </div>
              <span className="rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 px-2 py-0.5 text-xs font-semibold">
                {belowThresholdCount} faculty below 75%
              </span>
            </div>

            <AttentionList records={records} workingDays={workingDays} />

            {belowThresholdCount > 6 && (
              <Button variant="ghost" size="sm" asChild className="w-full text-xs text-primary font-semibold">
                <Link to="/detailed">
                  View all {belowThresholdCount} faculty needing review <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            )}
          </section>

          {/* Recent Activity Card */}
          <RecentActivity
            records={records}
            batches={recentBatches}
            monthName={monthName}
            selectedYear={selectedYear}
            workingDays={workingDays}
          />
        </div>

        {/* Stored Reports Archive */}
        <StoredReportsList
          availableMonths={availableMonths}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onSelect={(m, y) => {
            setSelectedMonth(m);
            setSelectedYear(y);
          }}
          isLoading={monthsLoading}
        />
      </div>
    </AppShell>
  );
}

export default DashboardPage;
