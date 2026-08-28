import { Plus, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrentAssignment } from "./CurrentAssignment";
import { InchargeHistoryTable } from "./InchargeHistoryTable";
import type { InchargeAssignment } from "@/lib/apfrs-data";

interface InchargeManagementSectionProps {
  facultyName: string;
  currentAssignment: InchargeAssignment | null;
  history: InchargeAssignment[];
  isHistoryLoading: boolean;
  onAssign: () => void;
  onEnd: (assignment: InchargeAssignment) => void;
  onDelete: (assignmentId: string) => void;
}

export function InchargeManagementSection({
  facultyName,
  currentAssignment,
  history,
  isHistoryLoading,
  onAssign,
  onEnd,
  onDelete,
}: InchargeManagementSectionProps) {
  return (
    <section className="surface-panel p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="size-5 text-amber-500" />
            <h2 className="text-base font-semibold">Incharge Assignment</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Official leadership appointment (e.g. HOD, Principal) with designated appointment terms.
          </p>
        </div>

        <Button size="sm" onClick={onAssign} className="gap-1.5 shrink-0">
          <Plus className="size-4" /> Assign New Role
        </Button>
      </div>

      {/* Current Assignment */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Current Active Assignment
        </div>
        <CurrentAssignment assignment={currentAssignment} onEnd={onEnd} />
      </div>

      {/* History */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Incharge Appointment History</h3>
          <span className="text-xs text-muted-foreground">
            {history.length} {history.length === 1 ? "record" : "records"}
          </span>
        </div>

        <InchargeHistoryTable
          history={history}
          isLoading={isHistoryLoading}
          onEnd={onEnd}
          onDelete={onDelete}
        />
      </div>
    </section>
  );
}
