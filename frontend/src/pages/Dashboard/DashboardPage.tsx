// frontend/src/routes/index.tsx
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";
import { Calendar, Send, Table2 } from "lucide-react";
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
import { MONTH_NAMES } from "@/lib/constants";
import { getAttendancePct } from "@/lib/attendance-utils";
import { useMonthYearSelector } from "@/hooks/useMonthYearSelector";

// Import split components
import { DashboardSkeleton } from "./DashboardSkeleton";
import { KPIMetrics } from "./KPIMetrics";
import { RecentActivity } from "./RecentActivity";
import { StoredReportsList } from "./StoredReportsList";

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

  // Average attendance calculation
  const avgAttendance = useMemo(() => {
    if (!records.length) return 0;
    const sum = records.reduce((acc: number, r: any) => acc + getAttendancePct(r), 0);
    return Math.round((sum / records.length) * 10) / 10;
  }, [records]);

  // Department counts
  const departmentCount = dbDepartments.length;

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
          avgAttendance={avgAttendance}
          monthName={monthName}
        />

        {/* Recent Activity */}
        <RecentActivity
          records={records}
          batches={recentBatches}
          monthName={monthName}
          selectedYear={selectedYear}
          workingDays={workingDays}
        />

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
