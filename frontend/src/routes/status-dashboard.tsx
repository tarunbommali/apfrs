import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { batchesQuery, type EmailBatch } from "@/lib/queries";

export const Route = createFileRoute("/status-dashboard")({
  head: () => ({
    meta: [
      { title: "Email Delivery Status — e-Office Jntugv" },
      {
        name: "description",
        content: "Live delivery board for attendance report emails with retry controls and batch history.",
      },
    ],
  }),
  component: StatusDashboard,
});

function StatusSkeleton() {
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

function BatchStatusBadge({ status }: { status: EmailBatch["status"] }) {
  const map: Record<EmailBatch["status"], string> = {
    completed: "bg-success/10 text-success border-success/30",
    pending: "bg-warning/10 text-warning border-warning/30",
    processing: "bg-primary/10 text-primary border-primary/30",
    failed: "bg-destructive/10 text-destructive border-destructive/30",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}
    >
      {status}
    </span>
  );
}

function StatusDashboard() {
  const { data, isLoading } = useQuery(batchesQuery({ limit: 20 }));

  if (isLoading) {
    return <StatusSkeleton />;
  }

  const batches = data?.batches ?? [];

  // Aggregate sent/failed/pending across all batches
  const totals = batches.reduce(
    (acc, b) => ({
      sent: acc.sent + (b.sent ?? 0),
      failed: acc.failed + (b.failed ?? 0),
      pending: acc.pending + (b.total - b.sent - b.failed),
    }),
    { sent: 0, failed: 0, pending: 0 },
  );

  return (
    <AppShell title="Delivery Status" subtitle="History of all dispatch batches">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Delivered" value={totals.sent} hint="SMTP accepted" icon={CheckCircle2} />
        <StatCard label="Failed" value={totals.failed} hint="Across all batches" icon={XCircle} />
        <StatCard label="Pending" value={totals.pending} hint="Queued for send" icon={Clock} />
      </div>

      <div className="surface-panel mt-6 overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Batch history</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each batch corresponds to one month's dispatch run
          </p>
        </div>
        {batches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Batch ID", "Period", "Triggered by", "Sent", "Failed", "Total", "Date", "Status"].map(
                    (h) => (
                      <th key={h} className="label-caps px-5 py-3">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b border-border/60 last:border-0 hover:bg-muted/50">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{b.id}</td>
                    <td className="px-5 py-3 font-medium">
                      {b.month} {b.year}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{b.triggered_by}</td>
                    <td className="px-5 py-3 font-mono text-success">{b.sent}</td>
                    <td className="px-5 py-3 font-mono text-destructive">{b.failed}</td>
                    <td className="px-5 py-3 font-mono">{b.total}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <BatchStatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            No dispatch batches yet. Send the first batch from the Bulk Dispatch page.
          </p>
        )}
      </div>
    </AppShell>
  );
}
