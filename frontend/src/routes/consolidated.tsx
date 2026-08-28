// frontend/src/routes/consolidated.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  useRetryBatch,
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

  const qc = useQueryClient();
  const retryMutation = useRetryBatch();
  const [retryConfirm, setRetryConfirm] = useState<{ batchId: string; failedCount: number } | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

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

  // ── Batches Query Polling ──
  const [refetchInterval, setRefetchInterval] = useState<number | false>(false);
  const { data: batchesData, isLoading: batchesLoading } = useQuery({
    ...batchesQuery({ limit: 30 }),
    refetchInterval,
  });
  const batches = batchesData?.batches || [];

  useEffect(() => {
    const hasActive = batches.some(
      (b) => b.status === "pending" || b.status === "processing"
    );
    if (hasActive) {
      setRefetchInterval(3000);
    } else {
      setRefetchInterval(false);
    }
  }, [batches]);

  // ── Toast Status Transitions ──
  const [activeBatches, setActiveBatches] = useState<Record<string, { status: string; total: number; sent: number; failed: number }>>({});

  useEffect(() => {
    const nextActiveBatches: typeof activeBatches = {};
    
    batches.forEach((b) => {
      if (b.status === "pending" || b.status === "processing") {
        nextActiveBatches[b.id] = {
          status: b.status,
          total: b.total,
          sent: b.sent,
          failed: b.failed,
        };
      } else {
        const prev = activeBatches[b.id];
        if (prev && (prev.status === "pending" || prev.status === "processing")) {
          if (b.status === "completed" || b.status === "sent") {
            toast.success(`${b.total} attendance reports sent successfully.`);
          } else if (b.status === "partial_failed") {
            toast.warning(`${b.sent} reports sent. ${b.failed} reports failed.`, {
              duration: 5000,
            });
          } else if (b.status === "failed") {
            toast.error(`Dispatch failed. ${b.total} reports could not be sent.`, {
              duration: 5000,
            });
          }
        }
      }
    });

    setActiveBatches((prev) => {
      const merged = { ...prev, ...nextActiveBatches };
      batches.forEach((b) => {
        if (b.status !== "pending" && b.status !== "processing") {
          delete merged[b.id];
        }
      });
      return merged;
    });
  }, [batches]);

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
    if (isSending) return;
    if (selectedIds.size === 0) {
      toast.error("Please select at least one faculty recipient.");
      return;
    }

    const recipientsToSend = filteredRecords.filter((r: any) => selectedIds.has(r.id || r.cfmsId || r.cfms_id));
    
    // Check if any selected recipient has already been sent
    const hasAlreadySent = recipientsToSend.some((r: any) => r.dispatchStatus === "sent");
    let forceResend = false;
    if (hasAlreadySent) {
      const confirmResend = window.confirm(
        "One or more of the selected faculty members have already received their statements for this month. Do you want to send them again?"
      );
      if (!confirmResend) {
        return;
      }
      forceResend = true;
    }

    setIsSending(true);
    try {
      await sendMutation.mutateAsync({
        month: selectedMonth,
        year: selectedYear,
        facultyIds: Array.from(selectedIds),
        forceResend,
      });
      toast.success(`Dispatch queued for ${recipientsToSend.length} recipients.`, {
        duration: 4000
      });
      setSelectedIds(new Set());
      setViewTab("history");
    } catch (err: any) {
      const isGatewayError = err?.status === 502 || err?.status === 503 || err?.status === 504 || err?.message?.toLowerCase().includes("failed to fetch") || err?.message?.toLowerCase().includes("network error");
      if (isGatewayError) {
        toast.error("We couldn't confirm the dispatch request. Check Dispatch History before trying again.", {
          duration: 6000
        });
        qc.invalidateQueries({ queryKey: ["batches"] });
      } else {
        toast.error(err?.message || "Failed to dispatch statements.");
      }
    } finally {
      setIsSending(false);
    }
  };

  // ── Retry Handler ──
  const handleConfirmRetry = async () => {
    if (!retryConfirm || isRetrying) return;
    setIsRetrying(true);
    try {
      await retryMutation.mutateAsync(retryConfirm.batchId);
      toast.success(`Dispatch queued for ${retryConfirm.failedCount} recipients.`);
      setRetryConfirm(null);
      qc.invalidateQueries({ queryKey: ["batches"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to retry dispatch.");
    } finally {
      setIsRetrying(false);
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

              <BatchHistoryTable 
                batches={batches} 
                isLoading={batchesLoading} 
                onRetry={(batchId, failedCount) => setRetryConfirm({ batchId, failedCount })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Retry Confirmation Dialog */}
      {retryConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-popover p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-foreground">Retry failed reports?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {retryConfirm.failedCount} reports failed in this batch.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Only these {retryConfirm.failedCount} failed reports will be sent again.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRetryConfirm(null)}
                disabled={isRetrying}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Retrying…
                  </>
                ) : (
                  `Retry ${retryConfirm.failedCount} reports`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default DispatchPage;
