import { MONTH_NAMES } from "@/lib/constants";
import { BatchStatusBadge } from "./BatchStatusBadge";
import type { EmailBatch } from "@/lib/queries";

interface BatchHistoryTableProps {
  batches: EmailBatch[];
  isLoading: boolean;
}

export function BatchHistoryTable({ batches, isLoading }: BatchHistoryTableProps) {
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
            <th className="py-3 px-4 text-center">Status</th>
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
              <td className="py-3 px-4 text-center">
                <BatchStatusBadge status={b.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
