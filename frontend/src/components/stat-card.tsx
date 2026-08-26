import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="surface-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="label-caps">{label}</p>
        <Icon className="size-4 text-accent" strokeWidth={1.75} />
      </div>
      <p className="mt-3 font-mono text-3xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function StatusPill({ status }: { status: "sent" | "failed" | "pending" }) {
  const map = {
    sent: "bg-success/12 text-success border-success/30",
    failed: "bg-destructive/12 text-destructive border-destructive/30",
    pending: "bg-warning/15 text-warning-foreground border-warning/40",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${map[status]}`}
    >
      {status}
    </span>
  );
}
