import { Briefcase, Calendar } from "lucide-react";

interface MetricsCardsProps {
  workingDays: number;
  totalDays: number;
  monthName: string;
  year: number;
}

export function MetricsCards({ workingDays, totalDays, monthName, year }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="surface-panel p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">Working Days</span>
          <Briefcase className="size-4 text-amber-500" />
        </div>
        <div className="mt-3">
          <span className="text-3xl font-bold font-mono text-foreground">{workingDays}</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">Active attendance days</p>
        </div>
      </div>

      <div className="surface-panel p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Days</span>
          <Calendar className="size-4 text-primary" />
        </div>
        <div className="mt-3">
          <span className="text-3xl font-bold font-mono text-foreground">{totalDays}</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">{monthName} {year}</p>
        </div>
      </div>
    </div>
  );
}
