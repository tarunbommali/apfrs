import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Holiday, HolidayType } from "../edit.calendar";

interface HolidayCardProps {
  holiday: Holiday;
  onEdit: (holiday: Holiday) => void;
  onRemove: (date: string) => void;
}

const typeStyles: Record<HolidayType, string> = {
  "Public holiday": "border-destructive/40 bg-destructive/10 text-destructive",
  Institutional: "border-accent/50 bg-accent/15 text-accent-foreground",
  Academic: "border-primary/40 bg-primary/10 text-primary",
  Vacation: "border-border bg-muted text-muted-foreground",
};

const formatDayLabel = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d!);
  return dt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

export function HolidayCard({ holiday, onEdit, onRemove }: HolidayCardProps) {
  return (
    <li className="group flex items-start justify-between gap-2 rounded-md border border-border/60 bg-card p-3 transition-colors hover:bg-muted/40">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-foreground">
            {formatDayLabel(holiday.date)}
          </span>
          <span
            className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold ${
              typeStyles[holiday.type]
            }`}
          >
            {holiday.type}
          </span>
        </div>
        <p className="mt-1 truncate text-xs font-medium text-foreground">{holiday.label}</p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-80 group-hover:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => onEdit(holiday)}
          aria-label={`Edit ${holiday.label}`}
        >
          <Pencil className="size-3.5 text-muted-foreground" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => onRemove(holiday.date)}
          aria-label={`Remove ${holiday.label}`}
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>
    </li>
  );
}
