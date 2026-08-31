import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InchargeAssignment } from "@/lib/apfrs-data";

interface InchargeHistoryTableProps {
  history: InchargeAssignment[];
  isLoading: boolean;
  onEnd: (assignment: InchargeAssignment) => void;
  onDelete: (assignmentId: string) => void;
}

export function InchargeHistoryTable({
  history,
  isLoading,
  onEnd,
  onDelete,
}: InchargeHistoryTableProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  if (isLoading) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin text-primary" /> Loading assignment history…
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-3 italic">
        No incharge history found for this faculty member.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
          <tr>
            <th className="py-2.5 px-3">Role</th>
            <th className="py-2.5 px-3">Start Date</th>
            <th className="py-2.5 px-3">End Date</th>
            <th className="py-2.5 px-3">Status</th>
            <th className="py-2.5 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {history.map((item) => {
            const start = item.startDate || item.start_date || "";
            const end = item.endDate || item.end_date;
            const isCurrent = start <= todayStr && (!end || end >= todayStr);

            return (
              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-foreground">
                  {item.role}
                </td>
                <td className="py-2.5 px-3 font-mono text-muted-foreground">
                  {start}
                </td>
                <td className="py-2.5 px-3 font-mono text-muted-foreground">
                  {end || "— Present"}
                </td>
                <td className="py-2.5 px-3">
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Current
                    </span>
                  ) : (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Completed
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-amber-600 hover:text-amber-700 px-2"
                        onClick={() => onEnd(item)}
                      >
                        End
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(item.id)}
                      title="Delete record"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
