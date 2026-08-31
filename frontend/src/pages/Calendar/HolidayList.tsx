import { CalendarDays, Loader2, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalendarHoliday } from "@/lib/queries";

interface HolidayListProps {
  holidays: CalendarHoliday[];
  isLoading: boolean;
  monthName: string;
  year: number;
  isAdmin: boolean;
  onEdit: (holiday: CalendarHoliday) => void;
  onDelete: (holiday: CalendarHoliday) => void;
  onAdd: () => void;
}

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const typeBadgeStyles: Record<string, string> = {
  "Public holiday": "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20",
  Institutional: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  Academic: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
  Vacation: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
};

export function HolidayList({
  holidays,
  isLoading,
  monthName,
  year,
  isAdmin,
  onEdit,
  onDelete,
  onAdd,
}: HolidayListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
        <Loader2 className="size-4 animate-spin text-primary" /> Loading holidays…
      </div>
    );
  }

  if (holidays.length === 0) {
    return (
      <div className="py-8 text-center space-y-2">
        <CalendarDays className="mx-auto size-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">No holidays scheduled for {monthName} {year}.</p>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAdd}
            className="mt-2 text-xs"
          >
            <Plus className="mr-1 size-3" /> Add a holiday
          </Button>
        )}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {holidays.map((h) => {
        const parts = h.date.split("-");
        const day = parts[2] ? parseInt(parts[2], 10) : "";
        const mIdx = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
        const dateFormatted = `${day} ${MONTH_SHORT[mIdx] || ""} ${parts[0] || ""}`;

        return (
          <li key={h.id || h.date} className="py-3 flex items-center justify-between gap-3 group">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-foreground">
                  {dateFormatted}
                </span>
                <span
                  className={`rounded px-1.5 py-0.2 text-[10px] font-medium ${
                    typeBadgeStyles[h.type || "Public holiday"] || "bg-muted text-muted-foreground"
                  }`}
                >
                  {h.type || "Public holiday"}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground truncate">
                {h.name || h.label}
              </p>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit(h)}
                  title="Edit holiday"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(h)}
                  title="Delete holiday"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
