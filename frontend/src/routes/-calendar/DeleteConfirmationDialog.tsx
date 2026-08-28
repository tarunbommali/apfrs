import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CalendarHoliday } from "@/lib/queries";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holiday: CalendarHoliday | null;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  holiday,
  onConfirm,
  isPending,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-5" /> Delete Holiday
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove{" "}
            <strong className="text-foreground">
              "{holiday?.name || holiday?.label}"
            </strong>{" "}
            ({holiday?.date}) from the academic calendar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" /> Deleting…
              </>
            ) : (
              "Delete Holiday"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
