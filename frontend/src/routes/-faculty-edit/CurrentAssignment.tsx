import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InchargeAssignment } from "@/lib/apfrs-data";

interface CurrentAssignmentProps {
  assignment: InchargeAssignment | null;
  onEnd: (assignment: InchargeAssignment) => void;
}

export function CurrentAssignment({ assignment, onEnd }: CurrentAssignmentProps) {
  if (!assignment) {
    return (
      <div className="text-xs text-muted-foreground py-2 flex items-center gap-2">
        <Clock className="size-4 text-muted-foreground/60" />
        <span>No active incharge appointment for this faculty member.</span>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const start = assignment.startDate || assignment.start_date || "";
  const end = assignment.endDate || assignment.end_date;
  const isCurrent = start <= todayStr && (!end || end >= todayStr);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
          {assignment.role.slice(0, 3)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">
              {assignment.role}
            </span>
            {isCurrent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3" /> Active
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {start} → {end || "Present (Open-ended)"}
          </p>
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="text-xs text-destructive hover:bg-destructive/10"
        onClick={() => onEnd(assignment)}
      >
        <XCircle className="mr-1.5 size-3.5" /> End Assignment
      </Button>
    </div>
  );
}
