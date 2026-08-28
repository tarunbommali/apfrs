import { tierTextClassFromPct } from "@/lib/attendance-utils";

interface MetricsCardsProps {
  presentDays: number;
  workingDays: number;
  absentDays: number;
  leaveDays: number;
  attendancePct: number;
}

export function MetricsCards({
  presentDays,
  workingDays,
  absentDays,
  leaveDays,
  attendancePct,
}: MetricsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <div className="surface-panel p-4 flex flex-col justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Present Days</span>
        <strong className="text-2xl font-mono text-[var(--status-present-fg)] mt-2">
          {presentDays} <span className="text-xs font-sans text-muted-foreground">/ {workingDays}</span>
        </strong>
      </div>

      <div className="surface-panel p-4 flex flex-col justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Absent Days</span>
        <strong className="text-2xl font-mono text-[var(--status-absent-fg)] mt-2">
          {absentDays}
        </strong>
      </div>

      <div className="surface-panel p-4 flex flex-col justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Leave Days</span>
        <strong className="text-2xl font-mono text-[var(--status-leave-fg)] mt-2">
          {leaveDays}
        </strong>
      </div>

      <div className="surface-panel p-4 flex flex-col justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Attendance Rate</span>
        <strong className={`text-2xl font-mono mt-2 ${tierTextClassFromPct(attendancePct)}`}>
          {attendancePct}%
        </strong>
      </div>
    </div>
  );
}
