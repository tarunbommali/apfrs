import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface YearSelectorProps {
  year: number;
  onYearChange: (year: number) => void;
  totalHolidays: number;
  totalWorkingDays: number;
  yearOptions: number[];
  yearHolidaysCount: Map<number, number>;
  onAddHoliday: () => void;
}

export function YearSelector({
  year,
  onYearChange,
  totalHolidays,
  totalWorkingDays,
  yearOptions,
  yearHolidaysCount,
  onAddHoliday,
}: YearSelectorProps) {
  return (
    <div className="surface-panel mb-6 flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onYearChange(year - 1)}
          aria-label="Previous year"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <Select value={String(year)} onValueChange={(v) => onYearChange(parseInt(v, 10))}>
          <SelectTrigger className="h-9 w-32 font-mono text-base font-bold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => {
              const count = yearHolidaysCount.get(y) ?? 0;
              const isVerified = count >= 6;
              return (
                <SelectItem key={y} value={String(y)}>
                  <div className="flex items-center justify-between gap-2.5 w-full">
                    <span>{y}</span>
                    {isVerified ? (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Verified
                      </span>
                    ) : null}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onYearChange(year + 1)}
          aria-label="Next year"
        >
          <ChevronRight className="size-4" />
        </Button>

        <span className="ml-2 font-mono text-xs font-semibold text-muted-foreground">
          {totalHolidays} holidays · {totalWorkingDays} annual working days
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onAddHoliday}
        >
          <Plus className="size-4 mr-1.5" /> Add holiday
        </Button>
      </div>
    </div>
  );
}
