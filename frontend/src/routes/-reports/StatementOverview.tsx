import { Calendar, Users, CheckCircle2, Building2 } from "lucide-react";
import { MONTH_NAMES } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AvailableMonth {
  month: number;
  year: number;
  recordCount?: number;
  workingDays?: number;
}

interface StatementOverviewProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number, year: number) => void;
  availableMonths: AvailableMonth[];
  records: any[];
  workingDays: number;
  departmentStats: { name: string; count: number; avgAttendance: number }[];
  activeMonthName: string;
}

export function StatementOverview({
  selectedMonth,
  selectedYear,
  onMonthChange,
  availableMonths,
  records,
  workingDays,
  departmentStats,
  activeMonthName,
}: StatementOverviewProps) {
  return (
    <section className="surface-panel p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Monthly Statement Overview</h2>
          <p className="text-xs text-muted-foreground">Select an attendance cycle to generate reports</p>
        </div>

        <Select
          value={`${selectedMonth}-${selectedYear}`}
          onValueChange={(val) => {
            const [m, y] = val.split("-").map(Number);
            onMonthChange(m, y);
          }}
        >
          <SelectTrigger className="h-9 w-48 font-semibold text-xs">
            <Calendar className="mr-1.5 size-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map((am) => (
              <SelectItem key={`${am.month}-${am.year}`} value={`${am.month}-${am.year}`}>
                {MONTH_NAMES[am.month - 1]} {am.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Banner */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Enrolled Faculty</span>
            <Users className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">{records.length}</p>
          <p className="text-[11px] text-muted-foreground">{activeMonthName} {selectedYear}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Working Days</span>
            <Calendar className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">{workingDays}</p>
          <p className="text-[11px] text-muted-foreground">Synchronized with calendar</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Status</span>
            <CheckCircle2 className="size-4 text-[var(--status-present-fg)]" />
          </div>
          <p className="mt-2 text-sm font-semibold text-[var(--status-present-fg)]">Statement Generated</p>
          <p className="text-[11px] text-muted-foreground">Ready for export and dispatch</p>
        </div>
      </div>

      {/* Department Breakdown */}
      {records.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Department Attendance Breakdown
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {departmentStats.map((dept) => (
              <div key={dept.name} className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" />
                  <div>
                    <span className="font-semibold text-foreground">{dept.name}</span>
                    <span className="text-[10px] text-muted-foreground block">
                      {dept.count} {dept.count === 1 ? "Faculty" : "Faculty"}
                    </span>
                  </div>
                </div>
                <span className={`font-mono font-bold ${
                  dept.avgAttendance >= 90
                    ? "text-[var(--status-present-fg)]"
                    : dept.avgAttendance < 75
                    ? "text-[var(--status-absent-fg)]"
                    : "text-foreground"
                }`}>
                  {dept.avgAttendance}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
