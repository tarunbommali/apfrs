import { Users, Building2, Calendar, TrendingUp } from "lucide-react";

interface KPIMetricsProps {
  facultyCount: number;
  departmentCount: number;
  workingDays: number;
  avgAttendance: number;
  monthName: string;
}

export function KPIMetrics({
  facultyCount,
  departmentCount,
  workingDays,
  avgAttendance,
  monthName,
}: KPIMetricsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="surface-panel p-5 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Faculty Members</span>
          <p className="mt-1 font-mono text-3xl font-bold text-foreground">{facultyCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Enrolled in {monthName}</p>
        </div>
        <div className="rounded-full bg-[var(--badge-accent-bg)] p-3 text-[var(--badge-accent-fg)]">
          <Users className="size-5" />
        </div>
      </div>

      <div className="surface-panel p-5 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Departments</span>
          <p className="mt-1 font-mono text-3xl font-bold text-foreground">{departmentCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Reporting branches</p>
        </div>
        <div className="rounded-full bg-[var(--badge-accent-bg)] p-3 text-[var(--badge-accent-fg)]">
          <Building2 className="size-5" />
        </div>
      </div>

      <div className="surface-panel p-5 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Working Days</span>
          <p className="mt-1 font-mono text-3xl font-bold text-foreground">{workingDays}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Academic calendar</p>
        </div>
        <div className="rounded-full bg-[var(--status-leave-bg)] p-3 text-[var(--status-leave-fg)]">
          <Calendar className="size-5" />
        </div>
      </div>

      <div className="surface-panel p-5 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Average Attendance</span>
          <p className="mt-1 font-mono text-3xl font-bold text-foreground">{avgAttendance}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">College-wide rate</p>
        </div>
        <div className="rounded-full bg-[var(--status-present-bg)] p-3 text-[var(--status-present-fg)]">
          <TrendingUp className="size-5" />
        </div>
      </div>
    </div>
  );
}
