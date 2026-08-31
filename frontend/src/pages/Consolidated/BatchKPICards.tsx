import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface BatchKPICardsProps {
  totals: { sent: number; failed: number; pending: number };
}

export function BatchKPICards({ totals }: BatchKPICardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="surface-panel p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Total Delivered</span>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {totals.sent}
          </p>
          <p className="text-[11px] text-muted-foreground">Successful deliveries</p>
        </div>
        <CheckCircle2 className="size-6 text-emerald-500/80" />
      </div>

      <div className="surface-panel p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Failed / Bounced</span>
          <p className="mt-1 font-mono text-2xl font-bold text-rose-600 dark:text-rose-400">
            {totals.failed}
          </p>
          <p className="text-[11px] text-muted-foreground">Requires attention</p>
        </div>
        <XCircle className="size-6 text-rose-500/80" />
      </div>

      <div className="surface-panel p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Pending in Queue</span>
          <p className="mt-1 font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
            {totals.pending}
          </p>
          <p className="text-[11px] text-muted-foreground">Processing in background</p>
        </div>
        <Clock className="size-6 text-amber-500/80" />
      </div>
    </div>
  );
}
