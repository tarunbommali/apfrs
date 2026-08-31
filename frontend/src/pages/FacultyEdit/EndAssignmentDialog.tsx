import { Loader2, AlertCircle } from "lucide-react";
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
import type { InchargeAssignment } from "@/lib/apfrs-data";

interface EndAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: InchargeAssignment | null;
  facultyName: string;
  endDate: string;
  onEndDateChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function EndAssignmentDialog({
  open,
  onOpenChange,
  assignment,
  facultyName,
  endDate,
  onEndDateChange,
  onSubmit,
  isPending,
}: EndAssignmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" /> End Incharge Assignment
            </DialogTitle>
            <DialogDescription>
              End the <strong>{assignment?.role}</strong> role for {facultyName}. This preserves appointment history in the database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="end-effective-date">Effective End Date</Label>
              <Input
                id="end-effective-date"
                type="date"
                required
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" /> Ending…
                </>
              ) : (
                "Confirm End Role"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
