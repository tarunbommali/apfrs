import { Users, History } from "lucide-react";

type ViewTab = "recipients" | "history";

interface TabSwitcherProps {
  viewTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  recordsCount: number;
  batchesCount: number;
  selectedCount: number;
  filteredCount: number;
  totals: { sent: number; failed: number; pending: number };
}

export function TabSwitcher({
  viewTab,
  onTabChange,
  recordsCount,
  batchesCount,
  selectedCount,
  filteredCount,
  totals,
}: TabSwitcherProps) {
  return (
    <div className="surface-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => onTabChange("recipients")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            viewTab === "recipients"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="size-3.5" /> Recipients ({recordsCount})
        </button>
        <button
          type="button"
          onClick={() => onTabChange("history")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            viewTab === "history"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="size-3.5" /> Delivery History ({batchesCount} batches)
        </button>
      </div>

      {viewTab === "recipients" ? (
        <div className="text-xs text-muted-foreground font-mono">
          <span className="font-bold text-foreground">{selectedCount}</span> selected of {filteredCount} filtered
        </div>
      ) : (
        <div className="text-xs text-muted-foreground flex items-center gap-3">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
            ● {totals.sent} Delivered
          </span>
          <span className="text-rose-600 dark:text-rose-400 font-semibold font-mono">
            ● {totals.failed} Failed
          </span>
          <span className="text-amber-600 dark:text-amber-400 font-semibold font-mono">
            ● {totals.pending} Pending
          </span>
        </div>
      )}
    </div>
  );
}
