import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useMemo, useState } from "react";
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
  Filter,
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
  useSendAttendance,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/consolidated")({
  head: () => ({
    meta: [
      { title: "Bulk Report Dispatch — e-Office Jntugv" },
      {
        name: "description",
        content: "Select faculty recipients from the database and dispatch individual monthly attendance statements by email.",
      },
    ],
  }),
  component: ConsolidatedRoute,
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ConsolidatedRoute() {
  return (
    <Suspense fallback={<ConsolidatedSkeleton />}>
      <ConsolidatedPage />
    </Suspense>
  );
}

function ConsolidatedSkeleton() {
  return (
    <AppShell title="Bulk Report Dispatch" subtitle="Loading faculty database…">
      <div className="space-y-6">
        <div className="surface-panel h-96 animate-pulse" />
      </div>
    </AppShell>
  );
}

function ConsolidatedPage() {
  const { user } = useAuth();
  const sendAttendance = useSendAttendance();

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
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [sent, setSent] = useState(0);
  const [dispatching, setDispatching] = useState(false);

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
        (r.email && r.email.toLowerCase().includes(search.toLowerCase())) ||
        (r.department && r.department.toLowerCase().includes(search.toLowerCase()));

      const matchDept = selectedDept === "all" || r.department === selectedDept;
      const matchCadre =
        selectedCadre === "all" ||
        (selectedCadre === "regular" && (r.jobStatus || r.job_status || "").toLowerCase() === "regular") ||
        (selectedCadre === "contract" && (r.jobStatus || r.job_status || "").toLowerCase() === "contract");

      return matchSearch && matchDept && matchCadre;
    });
  }, [records, search, selectedDept, selectedCadre]);

  const filteredEmails = useMemo(() => {
    return filteredRecords.map((r: any) => r.email).filter(Boolean);
  }, [filteredRecords]);

  const isAllFilteredSelected =
    filteredEmails.length > 0 &&
    filteredEmails.every((e: string) => selectedEmails.includes(e));

  const toggleEmail = (email: string) => {
    if (!email) return;
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((x) => x !== email) : [...prev, email]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedEmails((prev) => prev.filter((e) => !filteredEmails.includes(e)));
    } else {
      setSelectedEmails((prev) => Array.from(new Set([...prev, ...filteredEmails])));
    }
  };

  const handleDispatch = async () => {
    if (!selectedEmails.length || dispatching) return;

    const toSend = records.filter((r: any) => selectedEmails.includes(r.email));
    if (!toSend.length) {
      toast.error("Please select valid faculty records with email addresses.");
      return;
    }

    setDispatching(true);
    setSent(0);

    try {
      await sendAttendance.mutateAsync({
        attendanceData: toSend.map((r: any) => ({
          employeeId: r.cfmsId || r.cfms_id || "",
          employeeName: r.name || "",
          email: r.email,
          month: monthName,
          year: String(selectedYear),
          department: r.department,
          designation: r.designation,
          presentDays: r.presentDays || r.present_days || 0,
          absentDays: r.absentDays || r.absent_days || 0,
          workingDays,
          attendancePercentage: r.attendancePercentage || r.percentage || 0,
        })),
        sentBy: user?.email || "admin@apfrs.in",
        triggeredBy: user?.name || "Administrator",
      });

      setSent(toSend.length);
      toast.success(`Dispatched ${toSend.length} attendance statements successfully.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dispatch failed. Please verify SMTP configuration.");
    } finally {
      setDispatching(false);
    }
  };

  if (availableMonths.length === 0 && !monthsLoading) {
    return (
      <AppShell
        roles={["admin"]}
        title="Bulk Report Dispatch"
        subtitle="No attendance data in database"
      >
        <div className="surface-panel flex flex-col items-center gap-4 p-16 text-center">
          <UploadCloud className="size-12 text-muted-foreground/40" strokeWidth={1} />
          <h2 className="text-lg font-semibold">No attendance sheets imported yet</h2>
          <p className="text-sm text-muted-foreground">
            Please import a monthly biometric sheet to dispatch faculty attendance statements.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/import">
              <UploadCloud className="mr-2 size-4" /> Import Data
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      roles={["admin"]}
      title="Bulk Report Dispatch"
      subtitle={`Send faculty members their individual ${monthName} ${selectedYear} attendance statement (${records.length} enrolled in database)`}
      actions={
        <div className="flex items-center gap-2">
          {availableMonths.length > 1 ? (
            <Select
              value={`${selectedMonth}-${selectedYear}`}
              onValueChange={(val) => {
                const [m, y] = val.split("-");
                if (m && y) {
                  setSelectedMonth(parseInt(m, 10));
                  setSelectedYear(parseInt(y, 10));
                  setSelectedEmails([]);
                }
              }}
            >
              <SelectTrigger className="h-8 w-40 text-xs bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((am: any) => (
                  <SelectItem key={`${am.month}-${am.year}`} value={`${am.month}-${am.year}`}>
                    {MONTH_NAMES[am.month - 1]} {am.year} ({am.total_faculty || am.totalFaculty} faculty)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <Button
            disabled={selectedEmails.length === 0 || dispatching}
            onClick={handleDispatch}
            size="sm"
          >
            {dispatching ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Send className="mr-2 size-4" />
            )}
            {dispatching ? "Dispatching…" : `Send to ${selectedEmails.length} recipients`}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Progress Card if Dispatch Initiated ── */}
        {sent > 0 && (
          <div className="surface-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="label-caps">Dispatch Status</p>
                <p className="mt-1 font-mono text-sm font-semibold">{monthName} {selectedYear} Batch</p>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{sent}</span> of{" "}
                {records.length} queued for delivery
              </p>
            </div>
            <Progress value={100} className="mt-4" />
          </div>
        )}

        {/* ── Main Dispatch Faculty Panel ── */}
        <section className="surface-panel overflow-hidden">
          {/* Controls & Filter Bar */}
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by faculty name, CFMS ID, email, dept…"
                className="h-8 pl-8 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="h-8 w-36 text-xs bg-card">
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
                <SelectTrigger className="h-8 w-28 text-xs bg-card">
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

          {/* Select All Row */}
          <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-5 py-3 text-xs">
            <Checkbox
              checked={isAllFilteredSelected}
              onCheckedChange={toggleSelectAllFiltered}
              aria-label="Select all recipients"
            />
            <span className="font-semibold text-foreground">Select all visible recipients</span>
            <span className="ml-auto font-mono text-muted-foreground">
              {selectedEmails.length} / {records.length} selected
            </span>
          </div>

          {/* Faculty List from Database */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/20 font-medium text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-2.5"></th>
                  <th className="px-3 py-2.5">CFMS ID</th>
                  <th className="px-4 py-2.5">Faculty Member</th>
                  <th className="px-4 py-2.5">Department</th>
                  <th className="px-4 py-2.5">Designation</th>
                  <th className="px-3 py-2.5 text-center">Cadre</th>
                  <th className="px-4 py-2.5 text-center">Present / Working</th>
                  <th className="px-4 py-2.5 text-right">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map((r: any) => {
                  const isSelected = selectedEmails.includes(r.email);
                  const pct = parseFloat(r.attendancePercentage || r.percentage || "0");
                  const pDays = r.presentDays || r.present_days || 0;
                  const wDays = r.totalWorkingDays || r.total_working_days || workingDays;

                  return (
                    <tr
                      key={r.cfmsId || r.cfms_id || r.email}
                      className={`hover:bg-muted/40 transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEmail(r.email)}
                          aria-label={`Select ${r.name}`}
                          disabled={dispatching}
                        />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">
                        {r.cfmsId || r.cfms_id || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground">{r.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {r.email || "no official email"}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {r.department || "General"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {r.designation || "Assistant Professor"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${
                            (r.jobStatus || r.job_status || "").toLowerCase() === "regular"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {(r.jobStatus || r.job_status || "Regular").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono font-semibold text-foreground">
                        <span className="text-emerald-600 dark:text-emerald-400">{pDays}</span>
                        <span className="text-muted-foreground"> / {wDays}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <span>Showing {filteredRecords.length} of {records.length} faculty members</span>
            <span>Selected: <strong>{selectedEmails.length} recipients</strong></span>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
