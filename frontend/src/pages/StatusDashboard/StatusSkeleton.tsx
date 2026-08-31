import { AppShell } from "@/components/app-shell";

export function StatusSkeleton() {
  return (
    <AppShell title="Delivery Status" subtitle="Loading…">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="surface-panel h-24 animate-pulse" />
        ))}
      </div>
    </AppShell>
  );
}
