// frontend/src/routes/detailed.tsx
import { Link } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { UploadCloud, Calendar, Download } from "lucide-react";
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
import { MONTH_NAMES } from "@/lib/constants";
import { useMonthYearSelector } from "@/hooks/useMonthYearSelector";
import { getAttendancePct, getJobStatus, normalizeDepartmentCode } from "@/lib/attendance-utils";
import { exportAttendanceExcel } from "@/lib/export/exportAttendanceExcel";

// Import split components
import { KPIMetrics } from "./KPIMetrics";
import { ViewModeTabs } from "./ViewModeTabs";
import { AttendanceFilters } from "./AttendanceFilters";
import { SummaryTable } from "./SummaryTable";
import { DailyTable } from "./DailyTable";
import { DepartmentView } from "./DepartmentView";
import { EmptyState } from "./EmptyState";

type ViewMode = "summary" | "daily" | "department";

function AttendancePage() {
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

  // Tab State: "summary" | "daily"
  const [viewMode, setViewMode] = useState<ViewMode>("summary");

  const { data: attendanceData, isLoading: recordsLoading } = useQuery(
    monthlyAttendanceQuery(selectedMonth, selectedYear)
  );

  const records = attendanceData?.records || [];
  const workingDays = attendanceData?.sheet?.workingDays || attendanceData?.workingDays || 27;
  const monthName = MONTH_NAMES[selectedMonth - 1] || "Monthly";

  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedCadre, setSelectedCadre] = useState("all");

  const { data: deptsData } = useQuery(departmentsQuery());
  const dbDepartments = deptsData?.departments || [];

  // Departments list for filter (strictly from active Department Management)
  const departmentsList = useMemo(() => {
    const list = (dbDepartments || [])
      .filter((d: any) => d.status === "active" || !d.status)
      .map((d: any) => d.code)
      .filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [dbDepartments]);

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

      const normalizedDept = normalizeDepartmentCode(r.department, dbDepartments);
      const matchDept =
        selectedDept === "all" ||
        normalizedDept.toLowerCase() === selectedDept.toLowerCase() ||
        (r.department && r.department.toLowerCase() === selectedDept.toLowerCase());

      const cadre = getJobStatus(r).toLowerCase();
      const matchCadre =
        selectedCadre === "all" ||
        (selectedCadre === "regular" && cadre === "regular") ||
        (selectedCadre === "contract" && cadre.includes("contract"));

      return matchSearch && matchDept && matchCadre;
    });
  }, [records, search, selectedDept, selectedCadre, dbDepartments]);

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
    const sum = records.reduce((acc: number, r: any) => acc + getAttendancePct(r), 0);
    return Math.round((sum / records.length) * 10) / 10;
  }, [records]);

  const handleExportExcel = () => {
    exportAttendanceExcel(
      filteredRecords,
      selectedMonth,
      selectedYear,
      viewMode === "daily" ? { dayNumbers, fallbackWorkingDays: workingDays } : { fallbackWorkingDays: workingDays }
    )
      .then((count) => toast.success(`Exported ${count} records to Excel.`))
      .catch((e) => toast.error("Export failed: " + String(e.message ?? e)));
  };

  if (availableMonths.length === 0 && !monthsLoading) {
    return <EmptyState />;
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
        {/* KPI metrics strip */}
        <KPIMetrics
          totalFaculty={totalFaculty}
          workingDays={workingDays}
          avgAttendance={avgAttendance}
          departmentsCount={departmentsList.length}
          monthName={monthName}
          year={selectedYear}
        />

        {/* View mode tabs & Filters */}
        <div className="surface-panel p-4 space-y-4">
          <ViewModeTabs
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            filteredCount={filteredRecords.length}
            totalCount={records.length}
            totalDays={totalDaysInMonth}
          />

          <AttendanceFilters
            search={search}
            onSearchChange={setSearch}
            selectedDept={selectedDept}
            onDeptChange={setSelectedDept}
            selectedCadre={selectedCadre}
            onCadreChange={setSelectedCadre}
            departmentsList={departmentsList}
          />
        </div>

        {/* Tables */}
        <div className="surface-panel overflow-hidden">
          {recordsLoading ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              Loading attendance records…
            </div>
          ) : viewMode === "summary" ? (
            <SummaryTable records={filteredRecords} workingDays={workingDays} />
          ) : viewMode === "daily" ? (
            <DailyTable records={filteredRecords} dayNumbers={dayNumbers} />
          ) : (
            <DepartmentView
              records={records}
              workingDays={workingDays}
              monthName={monthName}
              year={selectedYear}
              departments={dbDepartments}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default AttendancePage;
