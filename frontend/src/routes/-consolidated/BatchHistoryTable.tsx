import { MONTH_NAMES } from "@/lib/constants";
import { BatchStatusBadge } from "./BatchStatusBadge";
import type { EmailBatch } from "@/lib/queries";
import { Button } from "@/components/ui/button";

interface BatchHistoryTableProps {
  batches: EmailBatch[];
  isLoading: boolean;
  onRetry: (batchId: string, failedCount: number) => void;
}

export function BatchHistoryTable({ batches, isLoading, onRetry }: BatchHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading batch history…
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground italic">
        No email dispatch batches recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="border-b border-border bg-muted/30 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
          <tr>
            <th className="py-3 px-4">Batch ID / Date</th>
            <th className="py-3 px-4">Statement Period</th>
            <th className="py-3 px-3 text-center">Total</th>
            <th className="py-3 px-3 text-center">Sent</th>
            <th className="py-3 px-3 text-center">Failed</th>
            <th className="py-3 px-3 text-center">Pending</th>
            <th className="py-3 px-4 text-center">Status</th>
            <th className="py-3 px-4 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {batches.map((b) => (
            <tr key={b.id} className="hover:bg-muted/20 transition-colors">
              <td className="py-3 px-4">
                <div className="font-mono font-medium text-foreground">{b.id}</div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  {new Date(b.created_at || (b as any).createdAt).toLocaleString("en-IN")}
                </div>
              </td>
              <td className="py-3 px-4 font-medium text-foreground">
                {MONTH_NAMES[(Number(b.month) || 1) - 1]} {b.year}
              </td>
              <td className="py-3 px-3 text-center font-mono font-bold text-foreground">{b.total}</td>
              <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {b.sent}
              </td>
              <td className="py-3 px-3 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                {b.failed}
              </td>
              <td className="py-3 px-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                {Math.max(0, b.total - b.sent - b.failed)}
              </td>
              <td className="py-3 px-4 text-center">
                <BatchStatusBadge status={b.status} />
                {(b.status === "processing" || b.status === "pending") && (
                  <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                    {b.sent} / {b.total} sent
                  </div>
                )}
                {b.status === "completed" && (
                  <div className="text-[10px] text-emerald-500/80 mt-1 font-mono">
                    {b.sent} / {b.total} sent
                  </div>
                )}
                {b.status === "partial_failed" && (
                  <div className="text-[10px] text-rose-500/80 mt-1 font-mono">
                    {b.sent} / {b.total} sent
                  </div>
                )}
              </td>
              <td className="py-3 px-4 text-center">
                {(b.status === "failed" || b.status === "partial_failed") && b.failed > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRetry(b.id, b.failed)}
                    className="h-7 text-[10px] py-1 px-2 border-rose-500/30 hover:bg-rose-500/10 text-rose-500 hover:text-rose-600"
                  >
                    Retry {b.failed}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
