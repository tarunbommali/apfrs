import { AppShell } from "@/components/app-shell";

export function RegistrySkeleton() {
  return (
    <AppShell title="Faculty Registry" subtitle="Loading…">
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="surface-panel h-24 animate-pulse" />
        ))}
      </div>
      <div className="surface-panel h-16 animate-pulse" />
      <div className="surface-panel mt-6 h-64 animate-pulse" />
    </AppShell>
  );
}
