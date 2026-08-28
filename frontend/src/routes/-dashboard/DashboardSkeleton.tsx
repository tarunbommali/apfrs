import { AppShell } from "@/components/app-shell";

export function DashboardSkeleton() {
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
