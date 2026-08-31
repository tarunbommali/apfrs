import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { StatCard } from "@/components/stat-card";

interface DeliveryMetricsProps {
  totals: {
    sent: number;
    failed: number;
    pending: number;
  };
}

export function DeliveryMetrics({ totals }: DeliveryMetricsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Delivered"
        value={totals.sent}
        hint="SMTP accepted"
        icon={CheckCircle2}
      />
      <StatCard
        label="Failed"
        value={totals.failed}
        hint="Across all batches"
        icon={XCircle}
      />
      <StatCard
        label="Pending"
        value={totals.pending}
        hint="Queued for send"
        icon={Clock}
      />
    </div>
  );
}
