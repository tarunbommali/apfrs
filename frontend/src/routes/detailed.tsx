import { createFileRoute, Link } from "@tanstack/react-router";
import { UploadCloud } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAttendance } from "@/lib/attendance-context";

export const Route = createFileRoute("/detailed")({
  head: () => ({
    meta: [
      { title: "Day-by-Day Attendance Grid — APFRS" },
      {
        name: "description",
        content: "Colour-coded day-by-day attendance grid showing present, absent, leave and holiday codes.",
      },
      { property: "og:title", content: "Day-by-Day Attendance Grid — APFRS" },
      { property: "og:description", content: "Per-faculty daily status codes for the reporting month." },
    ],
  }),
  component: DetailedView,
});

const cellStyle: Record<string, string> = {
  P: "bg-success/12 text-success",
  A: "bg-destructive/12 text-destructive",
  L: "bg-warning/20 text-warning-foreground",
  H: "bg-muted text-muted-foreground",
  HD: "bg-primary/10 text-primary",
  Late: "bg-orange-500/15 text-orange-600",
};

function DetailedView() {
  const { records, hasData, month, year } = useAttendance();

  const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  if (!hasData) {
    return (
      <AppShell title="Detailed View" subtitle="No attendance data loaded">
        <div className="surface-panel flex flex-col items-center gap-4 p-16 text-center">
          <UploadCloud className="size-12 text-muted-foreground/40" strokeWidth={1} />
          <p className="text-lg font-semibold">No data imported yet</p>
          <p className="text-sm text-muted-foreground">
            Upload the monthly biometric Excel sheet to view the day-by-day grid.
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

  // All unique day labels from the first record
  const dayLabels = records[0]?.attendance.map((d, i) => {
    const match = d.date.match(/-(\d{2})$/);
    return match ? parseInt(match[1]!, 10) : i + 1;
  }) ?? [];

  return (
    <AppShell title="Detailed View" subtitle={`Day-by-day attendance codes · ${monthLabel}`}>
      <div className="surface-panel overflow-hidden">
        <div className="flex flex-wrap gap-4 border-b border-border px-5 py-4 text-xs">
          {Object.entries({ P: "Present", A: "Absent", L: "Leave", H: "Holiday", HD: "Half-day", Late: "Late" }).map(
            ([k, v]) => (
              <span key={k} className="inline-flex items-center gap-2">
                <span
                  className={`flex size-5 items-center justify-center rounded font-mono text-[10px] font-semibold ${cellStyle[k] ?? ""}`}
                >
                  {k}
                </span>
                {v}
              </span>
            ),
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="label-caps sticky left-0 z-10 bg-card px-5 py-3 text-left">Faculty</th>
                {dayLabels.map((d) => (
                  <th key={d} className="label-caps px-1.5 py-3 text-center">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.email || r.cfmsId || r.name} className="border-b border-border/60 last:border-0">
                  <td className="sticky left-0 z-10 min-w-52 bg-card px-5 py-2">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.department}</p>
                  </td>
                  {r.attendance.map((a, di) => {
                    const code = a.status;
                    return (
                      <td key={di} className="px-1 py-2 text-center">
                        <span
                          className={`inline-flex size-6 items-center justify-center rounded font-mono text-[10px] font-semibold ${cellStyle[code] ?? "border border-border"}`}
                        >
                          {code}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
