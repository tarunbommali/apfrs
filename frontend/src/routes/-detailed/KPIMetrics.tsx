import { Users, Calendar, CheckCircle2, Building2 } from "lucide-react";

interface KPIMetricsProps {
  totalFaculty: number;
  workingDays: number;
  avgAttendance: number;
  departmentsCount: number;
  monthName: string;
  year: number;
}

export function KPIMetrics({
  totalFaculty,
  workingDays,
  avgAttendance,
  departmentsCount,
  monthName,
  year,
}: KPIMetricsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="surface-panel p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Total Faculty</span>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">{totalFaculty}</p>
          <p className="text-[11px] text-muted-foreground">{monthName} {year}</p>
        </div>
        <Users className="size-6 text-primary/80" />
      </div>

      <div className="surface-panel p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Working Days</span>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">{workingDays}</p>
          <p className="text-[11px] text-muted-foreground">Synchronized with calendar</p>
        </div>
        <Calendar className="size-6 text-amber-500/80" />
      </div>

      <div className="surface-panel p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Average Attendance</span>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">{avgAttendance}%</p>
          <p className="text-[11px] text-muted-foreground">College-wide rate</p>
        </div>
        <CheckCircle2 className="size-6 text-emerald-500/80" />
      </div>

      <div className="surface-panel p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Departments</span>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">{departmentsCount}</p>
          <p className="text-[11px] text-muted-foreground">Active in reporting</p>
        </div>
        <Building2 className="size-6 text-indigo-500/80" />
      </div>
    </div>
  );
}
