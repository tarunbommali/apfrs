import { Building2 } from "lucide-react";

interface DepartmentCardsProps {
  departments: {
    department: string;
    total: number;
    avgPct: number;
    regularCount: number;
    contractCount: number;
  }[];
  workingDays: number;
  onViewFaculty: (department: string) => void;
}

export function DepartmentCards({
  departments,
  workingDays,
  onViewFaculty,
}: DepartmentCardsProps) {
  if (departments.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No departments found.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {departments.map((d) => (
        <div key={d.department} className="surface-panel p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-accent" />
                <h3 className="font-semibold text-foreground">{d.department}</h3>
              </div>
              <span className="font-mono text-sm font-bold text-foreground">{d.avgPct}%</span>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              {d.total} Faculty ({d.regularCount} Regular · {d.contractCount} Contract)
            </p>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, d.avgPct))}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
            <span>Working Days: {workingDays}</span>
            <button
              onClick={() => onViewFaculty(d.department)}
              className="font-semibold text-primary hover:underline"
            >
              View Faculty ({d.total}) →
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
