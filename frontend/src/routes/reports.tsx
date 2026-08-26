import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { UploadCloud } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAttendance, type EmployeeRecord } from "@/lib/attendance-context";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Attendance Reports — Monthly, Weekly & Department | APFRS" },
      {
        name: "description",
        content:
          "Monthly faculty summaries, weekly breakdowns, department analytics and daily snapshots of attendance.",
      },
    ],
  }),
  component: ReportsPage,
});

const pieColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countStatus(record: EmployeeRecord, status: string) {
  return record.attendance.filter((d) => d.status === status).length;
}

function attendancePctFromRecord(record: EmployeeRecord) {
  const present = countStatus(record, "P");
  const halfDay = countStatus(record, "HD");
  const late = countStatus(record, "Late");
  const total = record.attendance.filter((d) => d.status !== "H").length;
  if (total === 0) return 0;
  return Math.round(((present + late + halfDay * 0.5) / total) * 100);
}

function buildWeeklyTrend(records: EmployeeRecord[]) {
  if (!records.length) return [];
  const days = records[0]!.attendance;
  const weeks: { week: string; present: number; absent: number; leave: number }[] = [];

  for (let w = 0; w < 4; w++) {
    const start = w * 7;
    const slice = days.slice(start, start + 7);
    if (!slice.length) break;
    let present = 0, absent = 0, leave = 0;
    for (const r of records) {
      const wdays = r.attendance.slice(start, start + 7);
      present += wdays.filter((d) => d.status === "P" || d.status === "Late").length;
      absent += wdays.filter((d) => d.status === "A").length;
      leave += wdays.filter((d) => d.status === "L").length;
    }
    weeks.push({ week: `Week ${w + 1}`, present, absent, leave });
  }
  return weeks;
}

function buildDeptStats(records: EmployeeRecord[]) {
  const map = new Map<string, EmployeeRecord[]>();
  for (const r of records) {
    const arr = map.get(r.department) ?? [];
    arr.push(r);
    map.set(r.department, arr);
  }
  return Array.from(map.entries()).map(([dept, rows]) => {
    const pct = Math.round(rows.reduce((a, r) => a + attendancePctFromRecord(r), 0) / rows.length);
    return {
      department: dept,
      total: rows.length,
      pct,
      present: rows.reduce((a, r) => a + countStatus(r, "P"), 0),
      absent: rows.reduce((a, r) => a + countStatus(r, "A"), 0),
    };
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

function ReportsPage() {
  const { records, month, year, hasData, fileName } = useAttendance();

  const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  if (!hasData) {
    return (
      <AppShell title="Reports" subtitle="No attendance data loaded">
        <div className="surface-panel flex flex-col items-center gap-4 p-16 text-center">
          <UploadCloud className="size-12 text-muted-foreground/40" strokeWidth={1} />
          <p className="text-lg font-semibold text-foreground">No data imported yet</p>
          <p className="text-sm text-muted-foreground">
            Upload the monthly biometric Excel sheet to generate reports.
          </p>
          <Button asChild>
            <Link to="/import">
              <UploadCloud className="size-4" /> Import data
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const weeklyTrend = buildWeeklyTrend(records);
  const deptStats = buildDeptStats(records);

  return (
    <AppShell
      title="Reports"
      subtitle={`${monthLabel} · ${records.length} faculty · ${fileName}`}
      actions={
        <>
          <Button variant="outline">Export PDF</Button>
          <Button variant="outline">Export Excel</Button>
        </>
      }
    >
      <Tabs defaultValue="monthly">
        <TabsList className="mb-6">
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="department">Department</TabsTrigger>
          <TabsTrigger value="daily">Daily</TabsTrigger>
        </TabsList>

        {/* Monthly summary table */}
        <TabsContent value="monthly">
          <div className="surface-panel overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Monthly faculty summary</h2>
              <p className="text-xs text-muted-foreground">
                {records[0]?.attendance.filter((d) => d.status !== "H").length ?? 0} working days ·{" "}
                {records.length} faculty
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["CFMS ID", "Faculty", "Department", "Designation", "P", "A", "L", "HD", "%"].map(
                      (h) => (
                        <th key={h} className="label-caps px-5 py-3">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={`${r.cfmsId || r.email}-${i}`} className="border-b border-border/60 last:border-0 hover:bg-muted/50">
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{r.cfmsId || "—"}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </td>
                      <td className="px-5 py-3">{r.department || "—"}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{r.designation || "—"}</td>
                      <td className="px-5 py-3 font-mono text-success">{countStatus(r, "P")}</td>
                      <td className="px-5 py-3 font-mono text-destructive">{countStatus(r, "A")}</td>
                      <td className="px-5 py-3 font-mono">{countStatus(r, "L")}</td>
                      <td className="px-5 py-3 font-mono">{countStatus(r, "HD")}</td>
                      <td className="px-5 py-3 font-mono font-semibold">{attendancePctFromRecord(r)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Weekly breakdown */}
        <TabsContent value="weekly">
          <div className="surface-panel p-5">
            <h2 className="text-base font-semibold">Weekly breakdown</h2>
            <p className="text-xs text-muted-foreground">Faculty-days recorded per week</p>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend}>
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
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="present" stroke="var(--color-chart-1)" strokeWidth={2} />
                  <Line type="monotone" dataKey="absent" stroke="var(--color-chart-5)" strokeWidth={2} />
                  <Line type="monotone" dataKey="leave" stroke="var(--color-chart-2)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* Department view */}
        <TabsContent value="department">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="surface-panel p-5">
              <h2 className="text-base font-semibold">Attendance by department</h2>
              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptStats}>
                    <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="department" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} width={34} unit="%" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-card)",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="pct" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="surface-panel p-5">
              <h2 className="text-base font-semibold">Faculty distribution</h2>
              <div className="mt-2 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptStats}
                      dataKey="total"
                      nameKey="department"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {deptStats.map((d, i) => (
                        <Cell key={d.department} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-card)",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Daily snapshot */}
        <TabsContent value="daily">
          <div className="surface-panel p-5">
            <h2 className="text-base font-semibold">Daily snapshot — today</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {deptStats.map((d) => (
                <div key={d.department} className="rounded-md border border-border p-4">
                  <p className="label-caps">{d.department}</p>
                  <p className="mt-2 font-mono text-2xl font-semibold">{d.present}</p>
                  <p className="text-xs text-muted-foreground">
                    total present · {d.absent} absent
                  </p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
