import { AppShell } from "@/components/app-shell";

export function ReportSkeleton() {
  return (
    <AppShell title="Attendance Report" subtitle="Loading monthly report…">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="surface-panel h-24 animate-pulse" />
          ))}
        </div>
        <div className="surface-panel h-96 animate-pulse" />
      </div>
    </AppShell>
  );
}
