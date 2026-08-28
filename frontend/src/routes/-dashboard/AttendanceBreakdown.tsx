import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttendanceBreakdownProps {
  totalPresent: number;
  totalAbsent: number;
  totalLeave: number;
  avgAttendance: number;
  workingDays: number;
  monthName: string;
  year: number;
}

export function AttendanceBreakdown({
  totalPresent,
  totalAbsent,
  totalLeave,
  avgAttendance,
  workingDays,
  monthName,
  year,
}: AttendanceBreakdownProps) {
  return (
    <section className="surface-panel p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Attendance Breakdown</h2>
          <p className="text-xs text-muted-foreground">Cumulative biometric totals for {monthName} {year}</p>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-xs gap-1 text-primary">
          <Link to="/detailed">
            View detailed matrix <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 pt-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Present Days</span>
          <p className="mt-2 font-mono text-2xl font-bold text-[var(--status-present-fg)]">
            {totalPresent}
          </p>
          <p className="text-[11px] text-muted-foreground">Logged biometric punches</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Absent Days</span>
          <p className="mt-2 font-mono text-2xl font-bold text-[var(--status-absent-fg)]">
            {totalAbsent}
          </p>
          <p className="text-[11px] text-muted-foreground">Unexcused absences</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Sanctioned Leaves</span>
          <p className="mt-2 font-mono text-2xl font-bold text-[var(--status-leave-fg)]">
            {totalLeave}
          </p>
          <p className="text-[11px] text-muted-foreground">Casual / academic / OD</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Compliance Rate</span>
          <p className="mt-2 font-mono text-2xl font-bold text-[var(--primary)]">
            {avgAttendance}%
          </p>
          <p className="text-[11px] text-muted-foreground">Against {workingDays} working days</p>
        </div>
      </div>
    </section>
  );
}
