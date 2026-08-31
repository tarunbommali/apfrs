import { Briefcase, Loader2 } from "lucide-react";
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
import { inchargeRoles } from "@/lib/apfrs-data";

interface InchargeFormData {
  role: string;
  startDate: string;
  endDate: string | null;
}

interface AssignInchargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facultyName: string;
  formData: InchargeFormData;
  onFormChange: (data: Partial<InchargeFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function AssignInchargeDialog({
  open,
  onOpenChange,
  facultyName,
  formData,
  onFormChange,
  onSubmit,
  isPending,
}: AssignInchargeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="size-5 text-amber-500" /> Assign Incharge Role
            </DialogTitle>
            <DialogDescription>
              Assign an official leadership role to {facultyName}. Overlapping terms will be prevented.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-select">Incharge Role</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => onFormChange({ role: v })}
              >
                <SelectTrigger id="role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {inchargeRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Appointment Start Date (required)</Label>
              <Input
                id="start-date"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => onFormChange({ startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Appointment End Date (optional)</Label>
              <Input
                id="end-date"
                type="date"
                value={formData.endDate || ""}
                onChange={(e) => onFormChange({ endDate: e.target.value || null })}
                placeholder="Leave empty for open-ended"
              />
              <p className="text-[11px] text-muted-foreground">
                Leave empty if appointment is open-ended until relieved.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" /> Assigning…
                </>
              ) : (
                "Save Assignment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
