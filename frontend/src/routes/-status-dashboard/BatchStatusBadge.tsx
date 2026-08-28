import { type EmailBatch } from "@/lib/queries";

type BatchStatus = EmailBatch["status"];

interface BatchStatusBadgeProps {
  status: BatchStatus;
}

export function BatchStatusBadge({ status }: BatchStatusBadgeProps) {
  const map: Record<BatchStatus, string> = {
    completed: "bg-success/10 text-success border-success/30",
    pending: "bg-warning/10 text-warning border-warning/30",
    processing: "bg-primary/10 text-primary border-primary/30",
    failed: "bg-destructive/10 text-destructive border-destructive/30",
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
