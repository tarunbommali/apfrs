import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import {
  CalendarCheck,
  GraduationCap,
  Percent,
  Building2,
  ArrowRight,
  UploadCloud,
  Calendar,
  Layers,
  Send,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
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
  statsQuery,
} from "@/lib/queries";
import { calculateOverallStats } from "@/lib/attendance-helpers";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Attendance Overview — e-Office Jntugv" },
      {
        name: "description",
        content:
          "Monitor faculty attendance, department performance and monthly report dispatch from the e-Office Jntugv console.",
      },
    ],
  }),
  component: () => (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview />
    </Suspense>
  ),
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const YEARS = ["2024", "2025", "2026", "2027", "2028"];

function OverviewSkeleton() {
  return (
    <AppShell title="Attendance Overview" subtitle="Loading metrics…">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-panel h-24 animate-pulse rounded-lg" />
        ))}
      </div>
    </AppShell>
  );
}

function Overview() {
  // Query available months in MySQL
  const { data: monthsData } = useQuery(attendanceMonthsQuery());
  const availableMonths = monthsData?.months || [];

  const defaultMonth = availableMonths[0]?.month || 1;
  const defaultYear = availableMonths[0]?.year || 2025;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  // Live Current Date
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  // Fetch monthly attendance from MySQL
  const { data: attendanceData, isLoading } = useQuery(
    monthlyAttendanceQuery(selectedMonth, selectedYear)
  );

  const records = attendanceData?.records || [];
  const workingDays = attendanceData?.sheet?.workingDays || attendanceData?.workingDays || 27;
  const monthName = MONTH_NAMES[selectedMonth - 1] || "January";

  // Compute overall stats
  const overallStats = useMemo(() => {
    return calculateOverallStats(records, workingDays);
  }, [records, workingDays]);

  // Compute department breakdown
  const departments = useMemo(() => {
    const map = new Map<string, any[]>();
    records.forEach((r: any) => {
      const dept = r.department || "General";
      const list = map.get(dept) || [];
      list.push(r);
      map.set(dept, list);
    });

    return Array.from(map.entries()).map(([dept, list]) => {
      const total = list.length;
      const totalPct = list.reduce(
        (sum: number, r: any) => sum + parseFloat(r.attendancePercentage || r.percentage || "0"),
        0
      );
      const avgPct = total > 0 ? Math.round((totalPct / total) * 10) / 10 : 0;
      const regularCount = list.filter(
        (r: any) => (r.jobStatus || r.job_status || "").toLowerCase() === "regular"
      ).length;

      return {
        department: dept,
        total,
        avgPct,
        regularCount,
        contractCount: total - regularCount,
      };
    }).sort((a, b) => b.total - a.total);
  }, [records]);

  // Build weekly attendance distribution
  const weeklyTrend = useMemo(() => {
    if (!records.length) {
      return [
        { week: "Week 1", present: 0, absent: 0, leave: 0 },
        { week: "Week 2", present: 0, absent: 0, leave: 0 },
        { week: "Week 3", present: 0, absent: 0, leave: 0 },
        { week: "Week 4", present: 0, absent: 0, leave: 0 },
      ];
    }

    const weeks = [
      { week: "Week 1 (1-7)", present: 0, absent: 0, leave: 0 },
      { week: "Week 2 (8-14)", present: 0, absent: 0, leave: 0 },
      { week: "Week 3 (15-21)", present: 0, absent: 0, leave: 0 },
      { week: "Week 4 (22-31)", present: 0, absent: 0, leave: 0 },
    ];

    records.forEach((r: any) => {
      const daily = Array.isArray(r.daily)
        ? r.daily
        : Array.isArray(r.daily_records)
        ? r.daily_records
        : Array.isArray(r.attendance)
        ? r.attendance
        : [];

      daily.forEach((d: any, idx: number) => {
        const dayNum = idx + 1;
        const status = d.status || (d.inTime ? "P" : "A");
        let wIdx = 0;
        if (dayNum <= 7) wIdx = 0;
        else if (dayNum <= 14) wIdx = 1;
        else if (dayNum <= 21) wIdx = 2;
        else wIdx = 3;

        if (status === "P") weeks[wIdx].present += 1;
        else if (status === "L" || status === "HD") weeks[wIdx].leave += 1;
        else if (status === "A") weeks[wIdx].absent += 1;
      });
    });

    return weeks;
  }, [records]);

  // Lowest attendance faculty
  const lowest = useMemo(() => {
    return [...records]
      .filter((r) => r.name)
      .sort((a, b) => {
        const pA = parseFloat(a.attendancePercentage || a.percentage || "0");
        const pB = parseFloat(b.attendancePercentage || b.percentage || "0");
        return pA - pB;
      })
      .slice(0, 5);
  }, [records]);

  return (
    <AppShell
      title="Attendance Overview"
      subtitle={`${monthName} ${selectedYear} · JNTU-GV College of Engineering Vizianagaram`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Top Date Badge */}
          <div className="hidden xl:flex items-center gap-1.5 rounded-lg border border-border bg-card/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
            <Calendar className="size-3.5 text-primary" />
            <span className="font-medium text-foreground">{todayFormatted}</span>
          </div>

          {/* Month Chooser */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card p-1 shadow-sm">
            <Select
              value={String(selectedMonth)}
              onValueChange={(val) => setSelectedMonth(parseInt(val, 10))}
            >
              <SelectTrigger className="h-7 border-0 bg-transparent text-xs font-semibold text-foreground focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((m, idx) => (
                  <SelectItem key={m} value={String(idx + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(selectedYear)}
              onValueChange={(val) => setSelectedYear(parseInt(val, 10))}
            >
              <SelectTrigger className="h-7 border-0 bg-transparent text-xs font-semibold text-foreground focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button asChild size="sm" variant="outline">
            <Link to="/import">
              <UploadCloud className="mr-1.5 size-3.5" /> Import Excel
            </Link>
          </Button>

          {records.length > 0 && (
            <Button asChild size="sm">
              <Link to="/consolidated">
                <Send className="mr-1.5 size-3.5" /> Dispatch reports
              </Link>
            </Button>
          )}
        </div>
      }
    >
      {/* ── Key Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="FACULTY ON ROLL"
          value={overallStats.totalEmployees}
          hint="Active records in database"
          icon={GraduationCap}
        />
        <StatCard
          label="DEPARTMENTS"
          value={departments.length}
          hint="Reporting academic units"
          icon={Building2}
        />
        <StatCard
          label="WORKING DAYS"
          value={workingDays}
          hint={`${monthName} ${selectedYear} (Academic Calendar)`}
          icon={CalendarCheck}
        />
        <StatCard
          label="AVG ATTENDANCE"
          value={records.length > 0 ? `${overallStats.averagePercentage}%` : "—"}
          hint={records.length > 0 ? "Overall monthly rate" : "No attendance data"}
          icon={Percent}
        />
      </div>

      {/* ── Visual Analytics & Attention Required ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="surface-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Weekly attendance distribution</h2>
              <p className="text-xs text-muted-foreground">
                Aggregated faculty punches across 4 academic cycles ({monthName} {selectedYear})
              </p>
            </div>
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrend} barGap={4}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={30} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="present" name="Present (P)" fill="var(--color-chart-3)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="absent" name="Absent (A)" fill="var(--color-chart-5)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="leave" name="Leave / Half-Day" fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface-panel p-5">
          <h2 className="text-base font-semibold text-foreground">Attention required</h2>
          <p className="text-xs text-muted-foreground">
            {lowest.length > 0 ? `Lowest attendance records for ${monthName} ${selectedYear}` : "No attendance data yet"}
          </p>
          {lowest.length > 0 ? (
            <ul className="mt-4 divide-y divide-border">
              {lowest.map((f) => {
                const pct = parseFloat(f.attendancePercentage || f.percentage || "0");
                const pDays = f.presentDays ?? f.present_days ?? f.pDays ?? 0;
                return (
                  <li key={f.id || f.cfmsId || f.cfms_id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.department} · {f.designation} ({pDays}/{workingDays} days)
                      </p>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                        pct < 50
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-6 text-center">
              <UploadCloud className="mx-auto size-10 text-muted-foreground/40" strokeWidth={1} />
              <p className="mt-2 text-sm text-muted-foreground">
                <Link to="/import" className="text-primary hover:underline font-semibold">
                  Import this month's Excel file
                </Link>{" "}
                to see individual faculty stats.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* ── Department Breakdown Table ── */}
      <section className="surface-panel mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Department summary</h2>
            <p className="text-xs text-muted-foreground">
              Attendance performance aggregated by academic department
            </p>
          </div>
          <Link
            to="/reports"
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-primary hover:underline"
          >
            Full reports <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left font-medium text-muted-foreground">
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Faculty Count</th>
                <th className="px-5 py-3">Regular Cadre</th>
                <th className="px-5 py-3">Contract Cadre</th>
                <th className="px-5 py-3 text-right">Avg Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departments.length > 0 ? (
                departments.map((d) => (
                  <tr key={d.department} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3 font-semibold text-foreground">{d.department}</td>
                    <td className="px-5 py-3 font-mono">{d.total}</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono">{d.regularCount}</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono">{d.contractCount}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {d.avgPct}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No attendance records found for {monthName} {selectedYear}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
