import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTH_NAMES } from "@/lib/constants";
import { getYearRange } from "@/hooks/useMonthYearSelector";

interface CalendarNavigationProps {
  selectedMonth: number;
  selectedYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  holidayCount: number;
}

export function CalendarNavigation({
  selectedMonth,
  selectedYear,
  onPrevMonth,
  onNextMonth,
  onMonthChange,
  onYearChange,
  holidayCount,
}: CalendarNavigationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={onPrevMonth}
          title="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <Select
          value={String(selectedMonth)}
          onValueChange={(val) => onMonthChange(Number(val))}
        >
          <SelectTrigger className="h-8 w-36 font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((m, idx) => (
              <SelectItem key={m} value={String(idx + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(selectedYear)}
          onValueChange={(val) => onYearChange(Number(val))}
        >
          <SelectTrigger className="h-8 w-24 font-mono font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getYearRange(5, 2).map((y) => (
              <SelectItem key={String(y)} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={onNextMonth}
          title="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Sync / Verification Status Badge */}
      {holidayCount > 0 ? (
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          <span>Verified ({holidayCount} {holidayCount === 1 ? "holiday" : "holidays"}) ✓</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          <AlertCircle className="size-3.5" />
          <span>No holidays mapped</span>
        </div>
      )}
    </div>
  );
}
