import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  MailCheck,
} from "lucide-react";
import { batchItemsQuery, useRetryItem, type BatchItem, type EmailBatch } from "@/lib/queries";
import { MONTH_NAMES } from "@/lib/constants";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface BatchDetailPanelProps {
  batch: EmailBatch;
  onClose: () => void;
}

function StatusIcon({ status }: { status: BatchItem["status"] }) {
  switch (status) {
    case "sent":
      return <CheckCircle2 className="size-3.5 text-[var(--status-present-fg)] shrink-0" />;
    case "failed":
      return <XCircle className="size-3.5 text-[var(--status-absent-fg)] shrink-0" />;
    case "processing":
      return <Loader2 className="size-3.5 text-[var(--linear-accent)] animate-spin shrink-0" />;
    default:
      return <Clock className="size-3.5 text-muted-foreground shrink-0" />;
  }
}

function StatusLabel({ status }: { status: BatchItem["status"] }) {
  const map: Record<BatchItem["status"], { label: string; cls: string }> = {
    sent: { label: "Sent", cls: "bg-[var(--status-present-bg)] text-[var(--status-present-fg)]" },
    failed: { label: "Failed", cls: "bg-[var(--status-absent-bg)] text-[var(--status-absent-fg)]" },
    processing: { label: "Processing", cls: "bg-[var(--linear-accent-subtle)] text-[var(--linear-accent)]" },
    queued: { label: "Queued", cls: "bg-muted text-muted-foreground" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-block font-mono font-semibold px-2 py-0.5 rounded text-[10px] ${cls}`}>
      {label}
    </span>
  );
}

export function BatchDetailPanel({ batch, onClose }: BatchDetailPanelProps) {
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const retryItem = useRetryItem();

  // Poll while batch is active
  const isActive = batch.status === "pending" || batch.status === "processing";
  const { data, isLoading } = useQuery({
    ...batchItemsQuery(batch.id),
    refetchInterval: isActive ? 3000 : false,
  });

  const items = data?.items ?? [];
  const monthName = MONTH_NAMES[(Number(batch.month) || 1) - 1];

  const handleRetry = async (item: BatchItem) => {
    if (retryingId) return;
    const confirmed = window.confirm(
      `Retry sending attendance report to ${item.employee_name || item.email}?`
    );
    if (!confirmed) return;

    setRetryingId(item.id);
    try {
      await retryItem.mutateAsync(item.id);
      toast.success(`Retry queued for ${item.employee_name || item.email}.`);
    } catch (err: any) {
      toast.error(err?.message || "Retry failed.");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="border-t border-border bg-muted/20">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MailCheck className="size-4 text-[var(--linear-accent)]" />
          <div>
            <span className="text-sm font-semibold text-foreground">
              {monthName} {batch.year}
            </span>
            <span className="ml-2 font-mono text-[10px] text-muted-foreground">{batch.id}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Counts */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-[var(--status-present-fg)]">✓ {batch.sent}</span>
            <span className="text-[var(--status-absent-fg)]">✕ {batch.failed}</span>
            <span className="text-muted-foreground">⏳ {Math.max(0, batch.total - batch.sent - batch.failed)}</span>
          </div>
          <Button size="icon" variant="ghost" className="size-7" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Items list */}
      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin mx-auto mb-2" />
          Loading dispatch detail…
        </div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted-foreground italic">
          No individual records found for this batch.
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <tr>
                <th className="py-2.5 px-5 text-left">Faculty</th>
                <th className="py-2.5 px-3 text-left">Email</th>
                <th className="py-2.5 px-3 text-center">Attempts</th>
                <th className="py-2.5 px-3 text-center">Provider</th>
                <th className="py-2.5 px-3 text-center">Sent At</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-5">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={item.status} />
                      <span className="font-medium text-foreground">
                        {item.employee_name || "—"}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground pl-5">
                      {item.employee_id || item.faculty_id}
                    </div>
                    {item.status === "failed" && item.error_message && (
                      <div className="pl-5 mt-0.5 text-[10px] text-[var(--status-absent-fg)] max-w-xs truncate" title={item.error_message}>
                        {item.error_message}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-muted-foreground max-w-[180px] truncate">
                    {item.email || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">
                    {item.attempts}/{3}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-muted-foreground uppercase text-[10px]">
                    {item.provider || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center text-muted-foreground">
                    {item.sent_at
                      ? new Date(item.sent_at).toLocaleString("en-IN", { timeStyle: "short", dateStyle: "short" })
                      : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <StatusLabel status={item.status} />
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {item.status === "failed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={retryingId === item.id}
                        onClick={() => handleRetry(item)}
                        className="h-6 text-[10px] py-1 px-2 border-rose-500/30 hover:bg-rose-500/10 text-rose-500 hover:text-rose-600"
                      >
                        {retryingId === item.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="size-3 mr-1" /> Retry
                          </>
                        )}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
