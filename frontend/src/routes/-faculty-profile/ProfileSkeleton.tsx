import { AppShell } from "@/components/app-shell";

export function ProfileSkeleton() {
  return (
    <AppShell roles={["faculty", "admin"]} title="My Profile" subtitle="Loading…">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="surface-panel h-64 animate-pulse" />
        <div className="space-y-4">
          <div className="surface-panel h-28 animate-pulse" />
          <div className="surface-panel h-48 animate-pulse" />
        </div>
      </div>
    </AppShell>
  );
}
