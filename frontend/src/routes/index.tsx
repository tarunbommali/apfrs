import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Users,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Send,
  Table2,
  BarChart3,
  ArrowRight,
  TrendingUp,
  Briefcase,
  Layers,
  History,
} from "lucide-react";
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
} from "@/lib/queries";
import { calculateOverallStats } from "@/lib/attendance-helpers";

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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function DashboardSkeleton() {
  return (
    <AppShell title="Dashboard" subtitle="Loading metrics…">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-panel h-24 animate-pulse rounded-lg" />
        ))}
      </div>
    </AppShell>
  );
}

function DashboardPage() {
  // Query available months in MySQL
  const { data: monthsData, isLoading: monthsLoading } = useQuery(attendanceMonthsQuery());
  const availableMonths = monthsData?.months || [];

  const defaultMonth = availableMonths[0]?.month || 1;
  const defaultYear = availableMonths[0]?.year || 2025;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  // Fetch monthly attendance from MySQL
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery(
    monthlyAttendanceQuery(selectedMonth, selectedYear)
  );

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

  // Compute faculty needing attention (attendance < 75%)
  const attentionList = useMemo(() => {
    return records
      .filter((r: any) => {
        const pct = parseFloat(r.attendancePercentage || r.percentage || 0);
        return pct < 75;
      })
      .sort((a: any, b: any) => {
        const pA = parseFloat(a.attendancePercentage || a.percentage || 0);
        const pB = parseFloat(b.attendancePercentage || b.percentage || 0);
        return pA - pB;
      });
  }, [records]);

  // Department counts
  const departmentCount = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r: any) => {
      if (r.department) set.add(r.department);
    });
    return set.size;
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
        {/* ── 1. Top KPI Summary Strip ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="surface-panel p-5 flex items-center justify-between">
            <div>
              <p className="label-caps">Faculty Members</p>
              <p className="mt-1 font-mono text-3xl font-bold text-foreground">{records.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Enrolled in {monthName}</p>
            </div>
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Users className="size-5" />
            </div>
          </div>

          <div className="surface-panel p-5 flex items-center justify-between">
            <div>
              <p className="label-caps">Departments</p>
              <p className="mt-1 font-mono text-3xl font-bold text-foreground">{departmentCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Reporting branches</p>
            </div>
            <div className="rounded-full bg-indigo-500/10 p-3 text-indigo-500">
              <Building2 className="size-5" />
            </div>
          </div>

          <div className="surface-panel p-5 flex items-center justify-between">
            <div>
              <p className="label-caps">Working Days</p>
              <p className="mt-1 font-mono text-3xl font-bold text-foreground">{workingDays}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Academic calendar</p>
            </div>
            <div className="rounded-full bg-amber-500/10 p-3 text-amber-500">
              <Calendar className="size-5" />
            </div>
          </div>

          <div className="surface-panel p-5 flex items-center justify-between">
            <div>
              <p className="label-caps">Average Attendance</p>
              <p className="mt-1 font-mono text-3xl font-bold text-foreground">{overallStats.avgAttendance}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">College-wide rate</p>
            </div>
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-500">
              <TrendingUp className="size-5" />
            </div>
          </div>
        </div>

        {/* ── 2. Attendance Summary & Breakdown ── */}
        <section className="surface-panel p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Attendance Breakdown</h2>
              <p className="text-xs text-muted-foreground">Cumulative biometric totals for {monthName} {selectedYear}</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs gap-1 text-primary">
              <Link to="/detailed">
                View detailed matrix <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-4 pt-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Present Days</span>
              <p className="mt-2 font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {overallStats.totalPresent}
              </p>
              <p className="text-[11px] text-muted-foreground">Logged biometric punches</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Absent Days</span>
              <p className="mt-2 font-mono text-2xl font-bold text-rose-600 dark:text-rose-400">
                {overallStats.totalAbsent}
              </p>
              <p className="text-[11px] text-muted-foreground">Unexcused absences</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Sanctioned Leaves</span>
              <p className="mt-2 font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
                {overallStats.totalLeave}
              </p>
              <p className="text-[11px] text-muted-foreground">Casual / academic / OD</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Compliance Rate</span>
              <p className="mt-2 font-mono text-2xl font-bold text-primary">
                {overallStats.avgAttendance}%
              </p>
              <p className="text-[11px] text-muted-foreground">Against {workingDays} working days</p>
            </div>
          </div>
        </section>

        {/* ── 3. Two Column Layout: Attention Required & Recent Activity ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Attention Required Card */}
          <section className="surface-panel p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-rose-500" />
                <h2 className="text-base font-semibold text-foreground">Attention Required</h2>
              </div>
              <span className="rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 px-2 py-0.5 text-xs font-semibold">
                {attentionList.length} faculty below 75%
              </span>
            </div>

            {attentionList.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" /> All faculty meet the 75% minimum threshold!
              </div>
            ) : (
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {attentionList.slice(0, 6).map((f: any) => {
                  const pct = parseFloat(f.attendancePercentage || f.percentage || 0);
                  return (
                    <div key={f.id || f.cfmsId} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-semibold text-foreground">{f.name}</span>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {f.department} · {f.cfmsId || f.cfms_id || "CFMS missing"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          {pct}%
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          {f.presentDays || f.present_days || 0} / {workingDays} days
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {attentionList.length > 6 && (
              <Button variant="ghost" size="sm" asChild className="w-full text-xs text-primary">
                <Link to="/detailed">
                  View all {attentionList.length} faculty needing review <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            )}
          </section>

          {/* Recent Activity Card */}
          <section className="surface-panel p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <History className="size-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
              </div>
              <span className="text-xs text-muted-foreground font-mono">Workflow audit</span>
            </div>

            <div className="space-y-3">
              {/* Latest Import Info */}
              <div className="rounded-lg border border-border bg-card p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <UploadCloud className="size-3.5 text-primary" /> Active Biometric Sheet
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">{monthName} {selectedYear}</span>
                </div>
                <p className="text-muted-foreground">
                  {records.length} faculty attendance records loaded ({workingDays} working days).
                </p>
              </div>

              {/* Latest Dispatch Info */}
              <div className="rounded-lg border border-border bg-card p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Send className="size-3.5 text-amber-500" /> Recent Dispatch Batches
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {recentBatches.length} recorded
                  </span>
                </div>
                {recentBatches.length > 0 ? (
                  <p className="text-muted-foreground font-mono text-[11px]">
                    Last batch: {recentBatches[0].sent} sent, {recentBatches[0].failed} failed
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">No dispatches executed yet this cycle.</p>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <Button size="sm" variant="outline" asChild className="w-full text-xs gap-1.5">
                <Link to="/reports">
                  <BarChart3 className="size-3.5" /> Open Reports
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild className="w-full text-xs gap-1.5">
                <Link to="/consolidated">
                  <Send className="size-3.5" /> Dispatch Statements
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
