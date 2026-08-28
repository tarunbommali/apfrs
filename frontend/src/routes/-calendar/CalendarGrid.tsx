import { CalendarDayCell } from "./CalendarDayCell";
import type { CalendarHoliday } from "@/lib/queries";

interface CalendarGridProps {
  year: number;
  month: number;
  cells: (number | null)[];
  holidayByDate: Map<string, CalendarHoliday>;
  isAdmin: boolean;
  onDayClick: (dayNum: number, holiday: CalendarHoliday | undefined) => void;
}

export function CalendarGrid({
  year,
  month,
  cells,
  holidayByDate,
  isAdmin,
  onDayClick,
}: CalendarGridProps) {
  const mPad = String(month).padStart(2, "0");

  return (
    <div className="mt-4">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-2">
        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d, i) => (
          <div
            key={d}
            className={`py-1.5 ${i === 6 ? "text-rose-500/80 font-bold" : ""}`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((dayNum, idx) => {
          if (dayNum === null) {
            return (
              <div
                key={`empty-${idx}`}
                className="h-20 rounded-lg border border-transparent bg-muted/10 opacity-40"
              />
            );
          }

          const dayPad = String(dayNum).padStart(2, "0");
          const dateStr = `${year}-${mPad}-${dayPad}`;

          const dayOfWeek = idx % 7;
          const isSunday = dayOfWeek === 6;
          const isSaturday = dayOfWeek === 5;
          const holiday = holidayByDate.get(dateStr);

          return (
            <CalendarDayCell
              key={dateStr}
              dayNum={dayNum}
              dateStr={dateStr}
              isSunday={isSunday}
              isSaturday={isSaturday}
              holiday={holiday}
              isAdmin={isAdmin}
              onCellClick={onDayClick}
            />
          );
        })}
      </div>
    </div>
  );
}
