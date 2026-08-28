import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { batchesQuery } from "@/lib/queries";

import { StatusSkeleton } from "./-status-dashboard/StatusSkeleton";
import { DeliveryMetrics } from "./-status-dashboard/DeliveryMetrics";
import { BatchHistoryTable } from "./-status-dashboard/BatchHistoryTable";

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
      pending: acc.pending + Math.max(0, b.total - (b.sent ?? 0) - (b.failed ?? 0)),
    }),
    { sent: 0, failed: 0, pending: 0 },
  );

  return (
    <AppShell title="Delivery Status" subtitle="History of all dispatch batches">
      {/* ── Metrics ── */}
      <DeliveryMetrics totals={totals} />

      {/* ── Batch History ── */}
      <div className="surface-panel mt-6 overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Batch history</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each batch corresponds to one month's dispatch run
          </p>
        </div>
        <BatchHistoryTable batches={batches} />
      </div>
    </AppShell>
  );
}

export default StatusDashboard;
