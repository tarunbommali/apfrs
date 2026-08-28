import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HOLIDAY_TYPES } from "../edit.calendar";
import type { Holiday, HolidayType } from "../edit.calendar";

interface HolidayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: Holiday | null;
  isNew: boolean;
  onSave: () => void;
  onRemove: (date: string) => void;
  onDraftChange: (draft: Holiday) => void;
}

export function HolidayFormDialog({
  open,
  onOpenChange,
  draft,
  isNew,
  onSave,
  onRemove,
  onDraftChange,
}: HolidayFormDialogProps) {
  if (!draft) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onOpenChange(false))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? "Map a holiday or academic event" : "Edit holiday"}</DialogTitle>
          <DialogDescription>
            Mapped holidays immediately synchronize with monthly attendance calculations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="holiday-date">Date</Label>
            <Input
              id="holiday-date"
              type="date"
              value={draft.date}
              onChange={(e) => onDraftChange({ ...draft, date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holiday-label">Occasion / Event Title</Label>
            <Input
              id="holiday-label"
              value={draft.label}
              placeholder="e.g. Independence Day / Semester Exam Begins"
              onChange={(e) => onDraftChange({ ...draft, label: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={draft.type}
              onValueChange={(v) => onDraftChange({ ...draft, type: v as HolidayType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOLIDAY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {!isNew ? (
            <Button variant="ghost" onClick={() => onRemove(draft.date)}>
              <Trash2 className="size-4 text-destructive" /> Remove
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={draft.label.trim() === ""}>
              Save holiday
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
