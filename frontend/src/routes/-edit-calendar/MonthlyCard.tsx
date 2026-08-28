import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HolidayCard } from "./HolidayCard";
import type { Holiday } from "../edit.calendar";

interface MonthlyCardProps {
  monthIndex: number;
  monthName: string;
  year: number;
  holidays: Holiday[];
  workingDays: number;
  totalDays: number;
  sundaysCount: number;
  onAddHoliday: (monthIndex: number) => void;
  onEditHoliday: (holiday: Holiday) => void;
  onRemoveHoliday: (date: string) => void;
}

export function MonthlyCard({
  monthIndex,
  monthName,
  year,
  holidays,
  workingDays,
  totalDays,
  sundaysCount,
  onAddHoliday,
  onEditHoliday,
  onRemoveHoliday,
}: MonthlyCardProps) {
  const hasHolidays = holidays.length > 0;

  return (
    <div className="surface-panel flex flex-col justify-between overflow-hidden border border-border/80 transition-all hover:border-border">
      <div>
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3.5">
          <h3 className="font-semibold text-foreground">
            {monthName} <span className="font-mono text-xs font-normal text-muted-foreground">{year}</span>
          </h3>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="rounded bg-accent/15 px-2 py-0.5 font-semibold text-accent-foreground">
              {workingDays} w-days
            </span>
            {hasHolidays ? (
              <span className="rounded bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                {holidays.length} hols
              </span>
            ) : null}
          </div>
        </div>

        <div className="p-4">
          {hasHolidays ? (
            <ul className="space-y-2.5">
              {holidays.map((h) => (
                <HolidayCard
                  key={h.date}
                  holiday={h}
                  onEdit={onEditHoliday}
                  onRemove={onRemoveHoliday}
                />
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground">
              <CalendarIcon className="mb-1.5 size-5 opacity-40" />
              <p>No holidays mapped</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/80">
                {totalDays} total days · {sundaysCount} Sundays
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border/60 bg-muted/20 px-4 py-2 text-right">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onAddHoliday(monthIndex)}
        >
          <Plus className="mr-1 size-3" /> Add to {monthName}
        </Button>
      </div>
    </div>
  );
}
