import { CalendarDays } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTH_NAMES } from "@/lib/constants";
import { getYearRange } from "@/hooks/useMonthYearSelector";

interface PeriodSelectorProps {
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  selectedYear: string;
  onYearChange: (value: string) => void;
  holidayCount: number;
  holidayNames: string[];
}

export function PeriodSelector({
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
  holidayCount,
  holidayNames,
}: PeriodSelectorProps) {
  const selectedMonthNum = parseInt(selectedMonth, 10);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Reporting Month</Label>
          <Select value={selectedMonth} onValueChange={onMonthChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Reporting Year</Label>
          <Select value={selectedYear} onValueChange={onYearChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getYearRange(10, 5).map((y) => (
                <SelectItem key={String(y)} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Academic Calendar Auto-Sync Notice */}
      <div className="mt-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-primary shrink-0" />
          <div>
            <span className="font-semibold text-foreground">Academic Calendar Auto-Sync: </span>
            <span className="text-muted-foreground">
              {MONTH_NAMES[selectedMonthNum - 1]} {selectedYear} has{" "}
              <strong className="text-foreground">{holidayCount}</strong> official calendar holidays.
            </span>
          </div>
        </div>
        {holidayCount > 0 && (
          <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary font-semibold">
            {holidayNames.join(", ")}
          </span>
        )}
      </div>
    </>
  );
}
