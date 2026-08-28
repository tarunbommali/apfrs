// frontend/src/routes/consolidated.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Loader2, Calendar, Download } from "lucide-react";
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
  useSendAttendance,
  departmentsQuery,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { MONTH_NAMES } from "@/lib/constants";
import { useMonthYearSelector } from "@/hooks/useMonthYearSelector";
import { getJobStatus } from "@/lib/attendance-utils";

// Import split components
import { TabSwitcher } from "./-consolidated/TabSwitcher";
import { RecipientFilters } from "./-consolidated/RecipientFilters";
import { RecipientTable } from "./-consolidated/RecipientTable";
import { BatchKPICards } from "./-consolidated/BatchKPICards";
import { BatchHistoryTable } from "./-consolidated/BatchHistoryTable";

export const Route = createFileRoute("/consolidated")({
  head: () => ({
    meta: [
      { title: "Dispatch — e-Office Jntugv" },
      {
        name: "description",
        content: "Dispatch monthly attendance reports to faculty and monitor delivery batches.",
      },
    ],
  }),
  component: DispatchPage,
});

type ViewTab = "recipients" | "history";

function DispatchPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // ── Data Queries ──
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

  // ── Tab State ──
  const [viewTab, setViewTab] = useState<ViewTab>("recipients");

  // ── Attendance Query ──
  const { data: attendanceData, isLoading: recordsLoading } = useQuery(
    monthlyAttendanceQuery(selectedMonth, selectedYear)
  );

  // ── Batches Query ──
  const { data: batchesData, isLoading: batchesLoading } = useQuery(batchesQuery({ limit: 30 }));
  const batches = batchesData?.batches || [];

  const records = attendanceData?.records || [];
  const workingDays = attendanceData?.sheet?.workingDays || attendanceData?.workingDays || 27;
  const monthName = MONTH_NAMES[selectedMonth - 1] || "Monthly";

  // ── Filter State ──
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedCadre, setSelectedCadre] = useState("all");

  // ── Selected Faculty IDs ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Departments Query ──
  const { data: deptsData } = useQuery(departmentsQuery());
  const dbDepartments = deptsData?.departments || [];

  const departmentsList = useMemo(() => {
    const list = dbDepartments.map((d) => d.code);
    const cleanList = Array.from(new Set(list));
    if (!cleanList.some((code) => code.toLowerCase() === "uncategorized")) {
      cleanList.push("Uncategorized");
    }
    return cleanList.sort();
  }, [dbDepartments]);

  // ── Filtered Records ──
  const filteredRecords = useMemo(() => {
    return records.filter((r: any) => {
      const matchSearch =
        search === "" ||
        (r.name && r.name.toLowerCase().includes(search.toLowerCase())) ||
        (r.email && r.email.toLowerCase().includes(search.toLowerCase())) ||
        (r.cfmsId && String(r.cfmsId).includes(search)) ||
        (r.department && r.department.toLowerCase().includes(search.toLowerCase()));

      const rDept = (r.department || "Uncategorized").toLowerCase();
      const matchDept = selectedDept === "all" || rDept === selectedDept.toLowerCase();
      const cadre = getJobStatus(r).toLowerCase();
      const matchCadre =
        selectedCadre === "all" ||
        (selectedCadre === "regular" && cadre === "regular") ||
        (selectedCadre === "contract" && cadre.includes("contract"));

      return matchSearch && matchDept && matchCadre;
    });
  }, [records, search, selectedDept, selectedCadre]);

  // ── Dispatch Mutation ──
  const sendMutation = useSendAttendance();
  const [isSending, setIsSending] = useState(false);

  // ── Batch Totals ──
  const batchTotals = useMemo(() => {
    return batches.reduce(
      (acc, b) => ({
        sent: acc.sent + (b.sent ?? 0),
        failed: acc.failed + (b.failed ?? 0),
        pending: acc.pending + Math.max(0, (b.total ?? 0) - (b.sent ?? 0) - (b.failed ?? 0)),
      }),
      { sent: 0, failed: 0, pending: 0 }
    );
  }, [batches]);

  // ── Selection Handlers ──
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map((r: any) => r.id || r.cfmsId)));
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Dispatch Handler ──
  const handleSendSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one faculty recipient.");
      return;
    }

    const recipientsToSend = filteredRecords.filter((r: any) => selectedIds.has(r.id || r.cfmsId));
    setIsSending(true);
    try {
      await sendMutation.mutateAsync({
        month: selectedMonth,
        year: selectedYear,
        facultyIds: Array.from(selectedIds),
      });
      toast.success(`Dispatched ${recipientsToSend.length} attendance statements!`);
      setSelectedIds(new Set());
      setViewTab("history");
    } catch (err: any) {
      toast.error(err?.message || "Failed to dispatch statements.");
    } finally {
      setIsSending(false);
    }
  };

  // ── Download Handler ──
  const handleDownloadPDF = () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one faculty member.");
      return;
    }
    const idsString = Array.from(selectedIds).join(",");
    window.open(
      `/api/admin/attendance/report/consolidated/pdf?month=${selectedMonth}&year=${selectedYear}&cfmsIds=${idsString}`,
      "_blank"
    );
  };

  return (
    <AppShell
      roles={["admin"]}
      title="Dispatch"
      subtitle={`Prepare, send, and track monthly attendance statements · ${monthName} ${selectedYear}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Chooser */}
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

          {/* Download PDF */}
          {viewTab === "recipients" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={selectedIds.size === 0}
              className="gap-1.5"
            >
              <Download className="size-3.5" /> Download Consolidated PDF ({selectedIds.size})
            </Button>
          )}

          {/* Send Button */}
          {viewTab === "recipients" && (
            <Button
              size="sm"
              onClick={handleSendSelected}
              disabled={selectedIds.size === 0 || isSending}
              className="gap-1.5"
            >
              {isSending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Dispatching…
                </>
              ) : (
                <>
                  <Send className="size-3.5" /> Send Selected ({selectedIds.size})
                </>
              )}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Tab Switcher */}
        <TabSwitcher
          viewTab={viewTab}
          onTabChange={setViewTab}
          recordsCount={records.length}
          batchesCount={batches.length}
          selectedCount={selectedIds.size}
          filteredCount={filteredRecords.length}
          totals={batchTotals}
        />

        {/* TAB 1: Recipients */}
        {viewTab === "recipients" && (
          <div className="space-y-4">
            <RecipientFilters
              search={search}
              onSearchChange={setSearch}
              selectedDept={selectedDept}
              onDeptChange={setSelectedDept}
              selectedCadre={selectedCadre}
              onCadreChange={setSelectedCadre}
              departmentsList={departmentsList}
            />

            <div className="surface-panel overflow-hidden">
              <RecipientTable
                records={filteredRecords}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelectId}
                onToggleSelectAll={toggleSelectAll}
                workingDays={workingDays}
                isLoading={recordsLoading}
              />
            </div>
          </div>
        )}

        {/* TAB 2: History */}
        {viewTab === "history" && (
          <div className="space-y-6">
            <BatchKPICards totals={batchTotals} />

            <div className="surface-panel overflow-hidden">
              <div className="border-b border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">Recent Dispatch Batches</h3>
                <p className="text-xs text-muted-foreground">Audit log of automated and manual statement dispatches</p>
              </div>

              <BatchHistoryTable batches={batches} isLoading={batchesLoading} />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default DispatchPage;
