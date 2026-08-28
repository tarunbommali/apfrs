import { ListFilter, Table2, BarChart2 } from "lucide-react";

type ViewMode = "summary" | "daily" | "department";

interface ViewModeTabsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  filteredCount: number;
  totalCount: number;
  totalDays: number;
}

export function ViewModeTabs({
  viewMode,
  onViewModeChange,
  filteredCount,
  totalCount,
  totalDays,
}: ViewModeTabsProps) {
  const tabCls = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
      active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
      <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
        <button type="button" onClick={() => onViewModeChange("summary")} className={tabCls(viewMode === "summary")}>
          <ListFilter className="size-3.5" /> Summary View
        </button>
        <button type="button" onClick={() => onViewModeChange("daily")} className={tabCls(viewMode === "daily")}>
          <Table2 className="size-3.5" /> Daily View (Day 1..{totalDays})
        </button>
        <button type="button" onClick={() => onViewModeChange("department")} className={tabCls(viewMode === "department")}>
          <BarChart2 className="size-3.5" /> Department View
        </button>
      </div>

      {viewMode !== "department" && (
        <div className="text-xs text-muted-foreground font-mono">
          Showing <span className="font-bold text-foreground">{filteredCount}</span> of {totalCount} records
        </div>
      )}
    </div>
  );
}
