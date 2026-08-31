import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import type { CalendarHoliday } from "@/lib/queries";

interface HolidayFormData {
  date: string;
  name: string;
  type: string;
}

interface HolidayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingHoliday: CalendarHoliday | null;
  formData: HolidayFormData;
  onFormChange: (data: Partial<HolidayFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

const HOLIDAY_TYPES = [
  "Public holiday",
  "Institutional",
  "Academic",
  "Vacation",
] as const;

export function HolidayFormDialog({
  open,
  onOpenChange,
  editingHoliday,
  formData,
  onFormChange,
  onSubmit,
  isPending,
}: HolidayFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? "Edit Holiday" : "Add Holiday"}
            </DialogTitle>
            <DialogDescription>
              Configure official academic calendar holidays for attendance calculations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="holiday-date">Holiday Date</Label>
              <Input
                id="holiday-date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => onFormChange({ date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="holiday-name">Holiday Name / Description</Label>
              <Input
                id="holiday-name"
                type="text"
                placeholder="e.g. Independence Day, Pongal, Mid-term exam"
                required
                value={formData.name}
                onChange={(e) => onFormChange({ name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="holiday-type">Holiday Type</Label>
              <Select value={formData.type} onValueChange={(v) => onFormChange({ type: v })}>
                <SelectTrigger id="holiday-type">
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" /> Saving…
                </>
              ) : editingHoliday ? (
                "Update Holiday"
              ) : (
                "Add Holiday"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
