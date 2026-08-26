import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import {
  CalendarCheck,
  GraduationCap,
  Percent,
  Building2,
  ArrowRight,
  UploadCloud,
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
import { statsQuery, facultyListQuery } from "@/lib/queries";
import { attendancePct } from "@/lib/apfrs-data";
import { useAttendance } from "@/lib/attendance-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "APFRS Overview — Faculty Attendance & Payroll Reporting" },
      {
        name: "description",
        content:
          "Monitor faculty attendance, department performance and monthly payroll report dispatch from a single APFRS console.",
      },
    ],
  }),
  component: () => (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview />
    </Suspense>
  ),
});

function OverviewSkeleton() {
  return (
    <AppShell title="Attendance Overview" subtitle="Loading…">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-panel h-24 animate-pulse rounded-lg" />
        ))}
      </div>
    </AppShell>
  );
}

function Overview() {
  const { data: statsData } = useSuspenseQuery(statsQuery());
  const { data: facultyData } = useSuspenseQuery(facultyListQuery({ limit: 50 }));
  const { hasData, month, year } = useAttendance();

  const stats = statsData?.stats;
  const facultyList = facultyData?.faculty ?? [];
  const totalFaculty = stats?.faculty?.total ?? facultyList.length;
  const departments = stats?.faculty?.byDepartment ?? [];
  const totalDepts = departments.length;

  // Build weekly trend from attendance if available, else show zeros
  const weeklyTrend = [
    { week: "Week 1", present: 0, absent: 0, leave: 0 },
    { week: "Week 2", present: 0, absent: 0, leave: 0 },
    { week: "Week 3", present: 0, absent: 0, leave: 0 },
    { week: "Week 4", present: 0, absent: 0, leave: 0 },
  ];

  // Lowest attendance faculty
  const lowest = [...facultyList]
    .sort((a, b) => attendancePct(a) - attendancePct(b))
    .slice(0, 5);

  const avgAttendance =
    facultyList.length > 0
      ? Math.round(
          facultyList.reduce((a, f) => a + attendancePct(f), 0) / facultyList.length,
        )
      : 0;

  const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  // Department table from API stats
  const deptTable = departments.map((d) => ({
    department: d.department,
    total: d.count,
    pct: 0, // attendance % comes from parsed Excel data, not DB
  }));

  return (
    <AppShell
      title="Attendance Overview"
      subtitle={`${monthLabel} · JNTU-GV College of Engineering`}
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/import">
              <UploadCloud className="size-4" /> Import Excel
            </Link>
          </Button>
          {hasData && (
            <Button asChild>
              <Link to="/consolidated">Dispatch reports</Link>
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faculty on roll" value={totalFaculty} hint="Active records" icon={GraduationCap} />
        <StatCard label="Departments" value={totalDepts} hint="Reporting units" icon={Building2} />
        <StatCard label="Working days" value={24} hint={monthLabel} icon={CalendarCheck} />
        <StatCard
          label="Avg attendance"
          value={hasData ? `${avgAttendance}%` : "—"}
          hint={hasData ? "From imported data" : "Import data to see"}
          icon={Percent}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="surface-panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Weekly attendance distribution</h2>
              <p className="text-xs text-muted-foreground">
                {hasData ? "Aggregated faculty-days per week" : "Import attendance data to see chart"}
              </p>
            </div>
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrend} barGap={4}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={30} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="present" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="absent" fill="var(--color-chart-5)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="leave" fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface-panel p-5">
          <h2 className="text-base font-semibold">Attention required</h2>
          <p className="text-xs text-muted-foreground">
            {lowest.length > 0 ? "Lowest attendance this cycle" : "No attendance data yet"}
          </p>
          {lowest.length > 0 ? (
            <ul className="mt-4 divide-y divide-border">
              {lowest.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.department} · {f.designation}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {attendancePct(f)}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 text-center">
              <UploadCloud className="mx-auto size-10 text-muted-foreground/40" strokeWidth={1} />
              <p className="mt-2 text-sm text-muted-foreground">
                <Link to="/import" className="text-primary hover:underline">
                  Import this month's Excel file
                </Link>{" "}
                to see individual faculty stats.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Department summary table */}
      <section className="surface-panel mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Department summary</h2>
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
              <tr className="border-b border-border text-left">
                {["Department", "Faculty count"].map((h) => (
                  <th key={h} className="label-caps px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deptTable.length > 0 ? (
                deptTable.map((d) => (
                  <tr key={d.department} className="border-b border-border/60 last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3 font-medium">{d.department}</td>
                    <td className="px-5 py-3 font-mono">{d.total}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No faculty records found.
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
