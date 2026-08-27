import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Send,
  UploadCloud,
  Loader2,
  Search,
  CheckCircle2,
  Users,
  Calendar,
  Building2,
  Briefcase,
  History,
  Radio,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  type EmailBatch,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function BatchStatusBadge({ status }: { status: EmailBatch["status"] }) {
  const map: Record<EmailBatch["status"], string> = {
    completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    processing: "bg-primary/15 text-primary border-primary/30",
    failed: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
        map[status] ?? "bg-muted text-muted-foreground border-border"
      }`}
    >
      {status}
    </span>
  );
}

function DispatchPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: monthsData, isLoading: monthsLoading } = useQuery(attendanceMonthsQuery());
  const availableMonths = monthsData?.months || [];

  const defaultMonth = availableMonths[0]?.month || 1;
  const defaultYear = availableMonths[0]?.year || 2025;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  // Tab State: "recipients" | "history"
  const [viewTab, setViewTab] = useState<"recipients" | "history">("recipients");

  // Attendance query
  const { data: attendanceData, isLoading: recordsLoading } = useQuery(
    monthlyAttendanceQuery(selectedMonth, selectedYear)
  );

  // Batches history query
  const { data: batchesData, isLoading: batchesLoading } = useQuery(batchesQuery({ limit: 30 }));
  const batches = batchesData?.batches || [];

  const records = attendanceData?.records || [];
  const monthName = MONTH_NAMES[selectedMonth - 1] || "Monthly";

  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedCadre, setSelectedCadre] = useState("all");

  // Selected faculty IDs for dispatch
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: deptsData } = useQuery(departmentsQuery());
  const dbDepartments = deptsData?.departments || [];

  // Departments list for filter
  const departmentsList = useMemo(() => {
    const list = dbDepartments.map((d) => d.code);
    const cleanList = Array.from(new Set(list));
    if (!cleanList.some(code => code.toLowerCase() === "uncategorized")) {
      cleanList.push("Uncategorized");
    }
    return cleanList.sort();
  }, [dbDepartments]);

  // Filtered records
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
      const matchCadre =
        selectedCadre === "all" ||
        (selectedCadre === "regular" && (r.jobStatus || r.job_status || "").toLowerCase() === "regular") ||
        (selectedCadre === "contract" && (r.jobStatus || r.job_status || "").toLowerCase().includes("contract"));

      return matchSearch && matchDept && matchCadre;
    });
  }, [records, search, selectedDept, selectedCadre]);

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

  // Dispatch mutation
  const sendMutation = useSendAttendance();
  const [isSending, setIsSending] = useState(false);

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
      setViewTab("history"); // Switch to History tab after sending
    } catch (err: any) {
      toast.error(err?.message || "Failed to dispatch statements.");
    } finally {
      setIsSending(false);
    }
  };

  // Aggregated totals across all batches
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

  return (
    <AppShell
      roles={["admin"]}
      title="Dispatch"
      subtitle={`Prepare, send, and track monthly attendance statements · ${monthName} ${selectedYear}`}
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

          {/* Send Selected Button */}
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
        {/* ── Tab Switcher: Recipients vs History ── */}
        <div className="surface-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setViewTab("recipients")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewTab === "recipients"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="size-3.5" /> Recipients ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setViewTab("history")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewTab === "history"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="size-3.5" /> Delivery History ({batches.length} batches)
            </button>
          </div>

          {viewTab === "recipients" ? (
            <div className="text-xs text-muted-foreground font-mono">
              <span className="font-bold text-foreground">{selectedIds.size}</span> selected of {filteredRecords.length} filtered
            </div>
          ) : (
            <div className="text-xs text-muted-foreground flex items-center gap-3">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">● {batchTotals.sent} Delivered</span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold font-mono">● {batchTotals.failed} Failed</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold font-mono">● {batchTotals.pending} Pending</span>
            </div>
          )}
        </div>

        {/* ── TAB 1: RECIPIENTS PREPARATION & SELECTION ── */}
        {viewTab === "recipients" && (
          <div className="space-y-4">
            {/* Filters Row */}
            <div className="surface-panel p-4 grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search recipient by name, email, CFMS..."
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

            {/* Recipients Table */}
            <div className="surface-panel overflow-hidden">
              {recordsLoading ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  Loading recipient list…
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  No matching faculty found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="border-b border-border bg-muted/30 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">
                          <Checkbox
                            checked={
                              filteredRecords.length > 0 && selectedIds.size === filteredRecords.length
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                        <th className="py-3 px-4">Faculty Recipient</th>
                        <th className="py-3 px-4">Department & Cadre</th>
                        <th className="py-3 px-3 text-center">Present / Working</th>
                        <th className="py-3 px-3 text-center">Attendance %</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredRecords.map((r: any) => {
                        const recId = r.id || r.cfmsId;
                        const isChecked = selectedIds.has(recId);
                        const pct = parseFloat(r.attendancePercentage || r.percentage || 0);

                        return (
                          <tr
                            key={recId}
                            onClick={() => toggleSelectId(recId)}
                            className={`cursor-pointer transition-colors ${
                              isChecked ? "bg-primary/5" : "hover:bg-muted/20"
                            }`}
                          >
                            <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleSelectId(recId)}
                              />
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-foreground">{r.name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{r.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground">{r.department}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {r.jobStatus || r.job_status || "Regular"} · {r.designation}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-foreground">
                              {r.presentDays || r.present_days || 0} / {r.totalWorkingDays || r.total_working_days || 27}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold">
                              <span className={pct < 75 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                                {pct}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                Ready to send
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
        )}

        {/* ── TAB 2: DISPATCH HISTORY & BATCHES ── */}
        {viewTab === "history" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="surface-panel p-4 flex items-center justify-between">
                <div>
                  <p className="label-caps">Total Delivered</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {batchTotals.sent}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Successful deliveries</p>
                </div>
                <CheckCircle2 className="size-6 text-emerald-500/80" />
              </div>

              <div className="surface-panel p-4 flex items-center justify-between">
                <div>
                  <p className="label-caps">Failed / Bounced</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-rose-600 dark:text-rose-400">
                    {batchTotals.failed}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Requires attention</p>
                </div>
                <XCircle className="size-6 text-rose-500/80" />
              </div>

              <div className="surface-panel p-4 flex items-center justify-between">
                <div>
                  <p className="label-caps">Pending in Queue</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {batchTotals.pending}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Processing in background</p>
                </div>
                <Clock className="size-6 text-amber-500/80" />
              </div>
            </div>

            {/* Batches Table */}
            <div className="surface-panel overflow-hidden">
              <div className="border-b border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">Recent Dispatch Batches</h3>
                <p className="text-xs text-muted-foreground">Audit log of automated and manual statement dispatches</p>
              </div>

              {batchesLoading ? (
                <div className="py-16 text-center text-sm text-muted-foreground">Loading batch history…</div>
              ) : batches.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground italic">
                  No email dispatch batches recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="border-b border-border bg-muted/30 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Batch ID / Date</th>
                        <th className="py-3 px-4">Statement Period</th>
                        <th className="py-3 px-3 text-center">Total</th>
                        <th className="py-3 px-3 text-center">Sent</th>
                        <th className="py-3 px-3 text-center">Failed</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {batches.map((b) => (
                        <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-mono font-medium text-foreground">{b.id}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {new Date(b.createdAt).toLocaleString("en-IN")}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-foreground">
                            {MONTH_NAMES[(b.month ?? 1) - 1]} {b.year}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-foreground">{b.total}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {b.sent}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                            {b.failed}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <BatchStatusBadge status={b.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
