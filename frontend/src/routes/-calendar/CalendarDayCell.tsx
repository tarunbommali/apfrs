import type { CalendarHoliday } from "@/lib/queries";

interface CalendarDayCellProps {
  dayNum: number;
  dateStr: string;
  isSunday: boolean;
  isSaturday: boolean;
  holiday: CalendarHoliday | undefined;
  isAdmin: boolean;
  onCellClick: (dayNum: number, holiday: CalendarHoliday | undefined) => void;
}

export function CalendarDayCell({
  dayNum,
  isSunday,
  isSaturday,
  holiday,
  isAdmin,
  onCellClick,
}: CalendarDayCellProps) {
  const hasHoliday = !!holiday;

  return (
    <div
      onClick={() => onCellClick(dayNum, holiday)}
      className={`group relative flex flex-col justify-between rounded-lg border p-2 h-20 text-xs transition-all ${
        hasHoliday
          ? `border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold ${
              isAdmin ? "cursor-pointer hover:border-rose-500" : ""
            }`
          : isSunday
          ? "border-border/60 bg-muted/40 text-muted-foreground/70"
          : isSaturday
          ? `border-border bg-card/60 ${isAdmin ? "hover:border-primary/40 cursor-pointer" : ""}`
          : `border-border bg-card ${isAdmin ? "hover:border-primary/55 cursor-pointer" : ""}`
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`font-mono text-xs ${
            hasHoliday
              ? "font-bold text-rose-600 dark:text-rose-400"
              : isSunday
              ? "text-muted-foreground"
              : "font-medium text-foreground"
          }`}
        >
          {dayNum}
        </span>

        {isSunday && (
          <span className="text-[9px] font-mono text-muted-foreground/60">Sun</span>
        )}

        {isAdmin && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary">
            {hasHoliday ? "Edit" : "+"}
          </span>
        )}
      </div>

      {hasHoliday && (
        <div className="mt-1 truncate rounded bg-rose-500/20 px-1 py-0.5 text-[10px] font-semibold leading-tight text-rose-700 dark:text-rose-300">
          {holiday.name || holiday.label}
        </div>
      )}
    </div>
  );
}
