import { type EmailBatch } from "@/lib/queries";
import { BatchStatusBadge } from "./BatchStatusBadge";

interface BatchHistoryTableProps {
  batches: EmailBatch[];
}

export function BatchHistoryTable({ batches }: BatchHistoryTableProps) {
  if (batches.length === 0) {
    return (
      <p className="px-5 py-12 text-center text-sm text-muted-foreground">
        No dispatch batches yet. Send the first batch from the Bulk Dispatch page.
      </p>
    );
  }

  return (
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
  );
}
