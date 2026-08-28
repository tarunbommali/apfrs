import { Info } from "lucide-react";
import type { EmailConfigLog } from "@/lib/queries";

interface ConfigHistoryProps {
  logs: EmailConfigLog[];
}

export function ConfigHistory({ logs }: ConfigHistoryProps) {
  if (logs.length === 0) {
    return (
      <section className="surface-panel p-6 space-y-4">
        <div className="border-b border-border pb-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Info className="size-4 text-primary" /> Configuration History
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Audit trail of email delivery configuration updates.
          </p>
        </div>
        <p className="text-xs text-muted-foreground py-2 italic">
          No configuration changes recorded yet.
        </p>
      </section>
    );
  }

  return (
    <section className="surface-panel p-6 space-y-4">
      <div className="border-b border-border pb-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Info className="size-4 text-primary" /> Configuration History
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Audit trail of email delivery configuration updates.
        </p>
      </div>

      <div className="divide-y divide-border">
        {logs.map((log) => (
          <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{log.updated_by}</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-mono text-muted-foreground">
                  {new Date(log.created_at).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="mt-0.5 text-muted-foreground font-medium">
                {log.summary}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
