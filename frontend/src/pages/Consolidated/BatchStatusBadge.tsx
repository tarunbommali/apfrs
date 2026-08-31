import type { EmailBatch } from "@/lib/queries";

interface BatchStatusBadgeProps {
  status: EmailBatch["status"];
}

export function BatchStatusBadge({ status }: BatchStatusBadgeProps) {
  const map: Record<EmailBatch["status"], string> = {
    completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    processing: "bg-primary/15 text-primary border-primary/30",
    failed: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    partial_failed: "bg-rose-500/10 text-orange-500 dark:text-orange-400 border-orange-500/30",
  };

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
        map[status] ?? "bg-muted text-muted-foreground border-border"
      }`}
    >
      {status}
    </span>
  );
}
