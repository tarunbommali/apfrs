import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ArrowLeft } from "lucide-react";
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
  monthlyAttendanceQuery,
  attendanceMonthsQuery,
} from "@/lib/queries";
import { toast } from "sonner";
import { MONTH_NAMES } from "@/lib/constants";
import {
  getAttendancePct,
  getPresentDays,
  getAbsentDays,
  getLeaveDays,
  getJobStatus,
} from "@/lib/attendance-utils";
import { exportAttendanceExcel } from "@/lib/export/exportAttendanceExcel";

// Subcomponents
import { ReportSkeleton } from "./-reports-detail/ReportSkeleton";
import { MetricCards } from "./-reports-detail/MetricCards";
import { TabNavigation } from "./-reports-detail/TabNavigation";
import { FacultyFilters } from "./-reports-detail/FacultyFilters";
import { FacultyTable } from "./-reports-detail/FacultyTable";
import { DepartmentCards } from "./-reports-detail/DepartmentCards";
import { PDFPreviewModal } from "./-reports-detail/PDFPreviewModal";
import { EmptyState } from "./-reports-detail/EmptyState";

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

type ViewTab = "summary" | "departments";

function MonthReportPage({ month, year }: { month: number; year: number }) {
  const navigate = useNavigate();
  const monthName = MONTH_NAMES[month - 1] || "Monthly";

  // Queries
  const { data: attendanceData, isLoading, error } = useQuery(monthlyAttendanceQuery(month, year));
  const { data: monthsData } = useQuery(attendanceMonthsQuery());
  const availableMonths = monthsData?.months || [];

  // State
  const [activeTab, setActiveTab] = useState<ViewTab>("summary");
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

  const handlePreview = (cfmsId: string) => {
    setPreviewCfmsId(cfmsId);
  };

  const handleDownloadPDF = (cfmsId: string) => {
    window.open(
      `/api/admin/attendance/report/consolidated/pdf?month=${month}&year=${year}&cfmsIds=${cfmsId}`,
      "_blank"
    );
  };

  const handleViewDepartment = (department: string) => {
    setSelectedDept(department);
    setActiveTab("summary");
  };

  if (error || (!isLoading && records.length === 0)) {
    return <EmptyState monthName={monthName} year={year} />;
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

          {availableMonths.length > 1 && (
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
          )}

          <Button size="sm" variant="outline" onClick={handleExportExcel}>
            <Download className="mr-1.5 size-3.5" /> Export Excel
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        <MetricCards
          totalFaculty={totalFaculty}
          workingDays={workingDays}
          avgAttendance={overallAvgPct}
          departmentsCount={departments.length}
          totalPresent={totalPresentDays}
          totalAbsent={totalAbsentDays}
          totalLeaves={totalLeaves}
        />

        {/* Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          filteredCount={filteredRecords.length}
          departmentsCount={departments.length}
        />

        {/* Tab Content */}
        {activeTab === "summary" ? (
          <section className="surface-panel overflow-hidden">
            <FacultyFilters
              search={search}
              onSearchChange={setSearch}
              selectedDept={selectedDept}
              onDeptChange={setSelectedDept}
              selectedCadre={selectedCadre}
              onCadreChange={setSelectedCadre}
              departments={departments}
            />

            <FacultyTable
              records={filteredRecords}
              workingDays={workingDays}
              month={month}
              year={year}
              onPreview={handlePreview}
              onDownload={handleDownloadPDF}
            />

            <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
              <span>Showing {filteredRecords.length} of {records.length} faculty members</span>
              <span>Total Working Days: <strong>{workingDays}</strong></span>
            </div>
          </section>
        ) : (
          <DepartmentCards
            departments={departments}
            workingDays={workingDays}
            onViewFaculty={handleViewDepartment}
          />
        )}
      </div>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        cfmsId={previewCfmsId}
        onClose={() => setPreviewCfmsId(null)}
        month={month}
        year={year}
        monthName={monthName}
      />
    </AppShell>
  );
}

export default MonthReportRoute;
