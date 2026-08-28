import { Link } from "@tanstack/react-router";
import { Download, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES } from "@/lib/constants";

interface AvailableMonth {
  month: number;
  year: number;
  recordCount?: number;
  workingDays?: number;
}

interface StatementListProps {
  availableMonths: AvailableMonth[];
  selectedMonth: number;
  selectedYear: number;
  onSelect: (month: number, year: number) => void;
  onExport: (month: number, year: number) => void;
  isLoading: boolean;
}

export function StatementList({
  availableMonths,
  selectedMonth,
  selectedYear,
  onSelect,
  onExport,
  isLoading,
}: StatementListProps) {
  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">Loading report archive…</div>
    );
  }

  if (availableMonths.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground font-semibold">
        <p>No monthly statements imported yet.</p>
        <Button asChild size="sm" className="mt-3">
          <Link to="/import">Import First Attendance Sheet</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {availableMonths.map((m) => {
        const isSelected = m.month === selectedMonth && m.year === selectedYear;
        const mName = MONTH_NAMES[m.month - 1] || "Monthly";

        return (
          <div
            key={`${m.month}-${m.year}`}
            className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
              isSelected ? "bg-muted/20 -mx-6 px-6" : ""
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">
                  {mName} {m.year}
                </span>
                {isSelected && (
                  <span className="rounded bg-[var(--badge-accent-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--badge-accent-fg)] border border-[rgba(94,106,210,0.2)]">
                    Selected
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {m.recordCount || 71} Faculty enrolled · {m.workingDays || 27} Working Days
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSelect(m.month, m.year)}
                className="gap-1 text-xs"
              >
                Select
              </Button>

              <Button
                size="sm"
                variant="outline"
                asChild
                className="gap-1 text-xs"
              >
                <Link to="/detailed">
                  <Table2 className="size-3.5" /> View Attendance
                </Link>
              </Button>

              <Button
                size="sm"
                onClick={() => onExport(m.month, m.year)}
                className="gap-1 text-xs"
              >
                <Download className="size-3.5" /> Export Excel
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
